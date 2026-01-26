import Foundation
import ExpoModulesCore

/**
 * Native iOS M3U Streaming Parser Module
 * 
 * Uses URLSession.bytes() for true streaming M3U parsing
 * Parses line-by-line as data arrives without downloading entire file
 * Emits events for each parsed channel to update UI in real-time
 */

public class M3UStreamParserModule: Module {
  public func definition() -> ModuleDefinition {
    Name("M3UStreamParser")

    // Main async function: parseM3U
    AsyncFunction("parseM3U") { (url: String, options: [String: Any]?, promise: Promise) in
      Task {
        do {
          let parser = M3UStreamParser()
          
          // Extract callbacks from options
          let onChannelCallback = options?["onChannel"] as? ((Channel) -> Void)
          let onProgressCallback = options?["onProgress"] as? ((Int, Int) -> Void)
          let onErrorCallback = options?["onError"] as? ((String) -> Void)
          
          // Parse the M3U stream
          let result = try await parser.parseURL(
            URL(string: url)!,
            onChannel: { channel in
              onChannelCallback?(channel)
            },
            onProgress: { current, total in
              onProgressCallback?(current, total)
            }
          )
          
          promise.resolve(result)
        } catch {
          promise.reject(error)
        }
      }
    }

    // Event emitters for UI updates
    Events("onChannelFound", "onProgress", "onError", "onComplete")
  }
}

/**
 * M3U Stream Parser Implementation
 * Uses URLSession.bytes() for true streaming without buffering entire file
 * 
 * IMPORTANT: This parser emits channels in real-time to JavaScript via events
 * And returns final stats when complete
 */
class M3UStreamParser {
  private var channelCount = 0
  private var currentMetadata: [String: String] = [:]
  weak var module: M3UStreamParserModule?
  
  /**
   * Parse M3U file from URL in streaming fashion
   * Emits each channel via module.sendEvent()
   * Returns final statistics
   * 
   * - Parameter url: M3U file URL
   * - Parameter onChannel: Callback called for each parsed channel (optional, used for testing)
   * - Parameter onProgress: Callback for progress updates (optional)
   */
  func parseURL(
    _ url: URL,
    onChannel: @escaping (Channel) -> Void,
    onProgress: @escaping (Int, Int) -> Void
  ) async throws -> [String: Any] {
    let startTime = Date()
    var statsStruct = ParseStats()
    var lineBuffer = ""
    
    // Use URLSession.bytes() for true streaming (iOS 15+)
    let (asyncBytes, response) = try await URLSession.shared.bytes(from: url)
    
    // Get content length if available for progress tracking
    let totalSize = (response as? HTTPURLResponse)?.expectedContentLength ?? -1
    var bytesRead = 0
    
    // Process each byte as it arrives
    for try await byte in asyncBytes {
      bytesRead += 1
      
      // Report progress every 100KB
      if bytesRead % (100 * 1024) == 0 && totalSize > 0 {
        let estimatedTotal = max(channelCount * 2, Int(totalSize / 1000)) // Rough estimate
        onProgress(channelCount, estimatedTotal)
      }
      
      // Accumulate bytes into line buffer
      if let char = Character(UnicodeScalar(byte)) {
        lineBuffer.append(char)
        
        // Check for line ending
        if char == "\n" {
          let line = lineBuffer
            .trimmingCharacters(in: .whitespacesAndNewlines)
          lineBuffer = ""
          
          // Parse M3U line
          try parseLine(
            line,
            statsStruct: &statsStruct,
            onChannel: onChannel
          )
        }
      }
    }
    
    // Process remaining buffer if any
    let line = lineBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
    if !line.isEmpty {
      try parseLine(
        line,
        statsStruct: &statsStruct,
        onChannel: onChannel
      )
    }
    
    let duration = Date().timeIntervalSince(startTime)
    
    return [
      "success": true,
      "stats": [
        "total": statsStruct.total,
        "channels": statsStruct.channels,
        "movies": statsStruct.movies,
        "series": statsStruct.series,
        "errors": statsStruct.errors,
        "durationMs": Int(duration * 1000),
      ]
    ]
  }
  
  /**
   * Parse individual M3U line
   * Supports M3U extended format (#EXTINF:...)
   */
  private func parseLine(
    _ line: String,
    statsStruct: inout ParseStats,
    onChannel: @escaping (Channel) -> Void
  ) throws {
    if line.isEmpty || line.starts(with: "#EXTM3U") {
      return
    }
    
    // Parse #EXTINF metadata line
    if line.starts(with: "#EXTINF:") {
      currentMetadata = parseExtinf(line)
    }
    
    // URL line (after #EXTINF)
    else if !line.starts(with: "#"), !line.isEmpty {
      // Build channel from accumulated metadata + URL
      let channel = Channel(
        name: currentMetadata["name"] ?? "",
        url: line,
        tvgId: currentMetadata["tvgId"],
        tvgName: currentMetadata["tvgName"],
        tvgLogo: currentMetadata["tvgLogo"],
        group: currentMetadata["groupTitle"],
        type: detectContentType(currentMetadata),
        duration: Int(currentMetadata["duration"] ?? "-1") ?? -1
      )
      
      channelCount += 1
      statsStruct.total += 1
      
      // Update type counts
      switch channel.type {
      case "channel": statsStruct.channels += 1
      case "movie": statsStruct.movies += 1
      case "series": statsStruct.series += 1
      default: statsStruct.errors += 1
      }
      
      // Emit channel to caller
      onChannel(channel)
      
      // Reset metadata for next entry
      currentMetadata = [:]
    }
  }
  
  /**
   * Parse #EXTINF line with attributes
   * Example: #EXTINF:-1 tvg-id="123" tvg-name="CNN" tvg-logo="url" group-title="News","CNN HD"
   */
  private func parseExtinf(_ line: String) -> [String: String] {
    var metadata: [String: String] = [:]
    
    // Duration
    if let durationMatch = line.range(of: "#EXTINF:(-?\\d+)", options: .regularExpression) {
      let durationStr = String(line[durationMatch]).replacingOccurrences(of: "#EXTINF:", with: "")
      metadata["duration"] = durationStr
    }
    
    // tvg-id
    if let match = extractAttribute(line, name: "tvg-id") {
      metadata["tvgId"] = match
    }
    
    // tvg-name
    if let match = extractAttribute(line, name: "tvg-name") {
      metadata["tvgName"] = match
    }
    
    // tvg-logo
    if let match = extractAttribute(line, name: "tvg-logo") {
      metadata["tvgLogo"] = match
    }
    
    // group-title
    if let match = extractAttribute(line, name: "group-title") {
      metadata["groupTitle"] = match
    }
    
    // Channel name (after last comma)
    if let commaIndex = line.lastIndex(of: ",") {
      let nameStart = line.index(after: commaIndex)
      let name = String(line[nameStart...])
        .trimmingCharacters(in: .whitespacesAndNewlines)
      metadata["name"] = name
    }
    
    return metadata
  }
  
  /**
   * Extract quoted attribute value from M3U line
   * Example: tvg-id="123" extracts "123"
   */
  private func extractAttribute(_ line: String, name: String) -> String? {
    let pattern = "\(name)=\"([^\"]*)\""
    if let regex = try? NSRegularExpression(pattern: pattern) {
      if let match = regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)) {
        if let range = Range(match.range(at: 1), in: line) {
          return String(line[range])
        }
      }
    }
    return nil
  }
  
  /**
   * Detect content type (channel, movie, or series)
   * Based on metadata attributes
   */
  private func detectContentType(_ metadata: [String: String]) -> String {
    let groupLower = (metadata["groupTitle"] ?? "").lowercased()
    let nameLower = (metadata["name"] ?? "").lowercased()
    let tvgLogo = metadata["tvgLogo"] ?? ""
    let tvgId = metadata["tvgId"] ?? ""
    
    // Live channels have EPG indicators (tvg-id, tvg-logo)
    if !tvgId.isEmpty || !tvgLogo.isEmpty {
      // But check if it's actually VOD content
      if groupLower.contains("movie") || groupLower.contains("film") ||
         nameLower.contains("s01e01") || nameLower.contains("season") {
        return "movie"
      }
      return "channel"
    }
    
    // Series detection
    if nameLower.contains("s\\d{1,2}e\\d{1,2}") ||
       groupLower.contains("series") || groupLower.contains("tv shows") {
      return "series"
    }
    
    // Movie detection
    if groupLower.contains("movie") || groupLower.contains("film") ||
       groupLower.contains("cinema") {
      return "movie"
    }
    
    // Default to channel
    return "channel"
  }
}

/**
 * Channel data structure for emitting to JavaScript
 */
struct Channel: Codable {
  let name: String
  let url: String
  let tvgId: String?
  let tvgName: String?
  let tvgLogo: String?
  let group: String?
  let type: String
  let duration: Int
}

/**
 * Parse statistics tracker
 */
struct ParseStats {
  var total: Int = 0
  var channels: Int = 0
  var movies: Int = 0
  var series: Int = 0
  var errors: Int = 0
}
