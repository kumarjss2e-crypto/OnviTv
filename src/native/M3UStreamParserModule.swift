import ExpoModulesCore

public class M3UStreamParserModule: Module {
  public func definition() -> ModuleDefinition {
    Name("M3UStreamParser")
    
    // Main async function: parseM3U
    // Called from JavaScript: M3UStreamParserModule.parseM3U(url, null)
    // Returns: Promise<{success: boolean, stats: {total, channels, movies, series, errors, durationMs}}>
    AsyncFunction("parseM3U") { (url: String, promise: Promise) in
      Task {
        do {
          if let urlObj = URL(string: url) {
            let parser = M3UStreamParser()
            
            // Parse the M3U stream
            // Callbacks are not used here - stats are returned in the promise
            let result = try await parser.parseURL(
              urlObj,
              onChannel: { channel in
                // Could emit events here if needed
              },
              onProgress: { current, total in
                // Could emit progress events here if needed
              }
            )
            
            promise.resolve(result)
          } else {
            promise.reject(Exception(name: "InvalidURL", description: "Invalid M3U URL"))
          }
        } catch {
          promise.reject(error)
        }
      }
    }
    
    // Event emitters for UI updates (optional, not currently used)
    Events("onChannelFound", "onProgress", "onError", "onComplete")
  }
}

