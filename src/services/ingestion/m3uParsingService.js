/**
 * M3U Parsing Service
 * Parses M3U playlists line-by-line with EXTINF metadata extraction
 * Pure JavaScript - works on web, iOS, Android
 */

import * as itemStorageService from '../itemStorageService';
import ProgressTracker from './progressTracker';

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 30000;

/**
 * Simple hash function for generating unique IDs
 * Works cross-platform without external dependencies
 */
const generateSimpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Generate unique content ID from playlist ID and stream URL
 */
const generateContentId = (playlistId, streamUrl) => {
  const combined = `${playlistId}:${streamUrl}`;
  return generateSimpleHash(combined);
};

/**
 * Fetch M3U file with retry logic
 */
const fetchM3UWithRetry = async (url, retries = MAX_RETRIES) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[PARSING_M3U] Fetching M3U (attempt ${attempt + 1}/${retries}): ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      console.log(`[PARSING_M3U] ✓ Fetched ${content.length} bytes`);

      return content;
    } catch (error) {
      lastError = error;
      const backoffMs = Math.pow(2, attempt) * RETRY_DELAY_MS;

      console.warn(
        `[PARSING_M3U] ✗ Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${backoffMs}ms...`
      );

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(`Failed to fetch M3U after ${retries} attempts: ${lastError.message}`);
};

/**
 * Parse EXTINF line to extract metadata
 * Format: #EXTINF:-1 tvg-id="id" tvg-name="name" tvg-logo="logo" group-title="group",Display Name
 */
const parseExtinfLine = (line) => {
  const metadata = {
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle: null,
    displayName: null,
  };

  // Extract display name (after the last comma)
  const lastCommaIndex = line.lastIndexOf(',');
  if (lastCommaIndex >= 0) {
    metadata.displayName = line.substring(lastCommaIndex + 1).trim();
  }

  // Extract metadata attributes using regex
  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
  if (tvgIdMatch) metadata.tvgId = tvgIdMatch[1];

  const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
  if (tvgNameMatch) metadata.tvgName = tvgNameMatch[1];

  const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
  if (tvgLogoMatch) metadata.tvgLogo = tvgLogoMatch[1];

  const groupTitleMatch = line.match(/group-title="([^"]*)"/);
  if (groupTitleMatch) metadata.groupTitle = groupTitleMatch[1];

  return metadata;
};

/**
 * Detect content type from group-title
 */
const detectContentType = (groupTitle) => {
  if (!groupTitle) return 'channel';

  const lower = groupTitle.toLowerCase();

  if (lower.includes('movie') || lower.includes('film')) {
    return 'movie';
  }

  if (lower.includes('series') || lower.includes('show') || lower.includes('tv')) {
    return 'series';
  }

  return 'channel';
};

/**
 * Parse M3U content
 */
const parseM3UContent = (content, playlistId, playlistName) => {
  const lines = content.split('\n').map((line) => line.trim()).filter((line) => line);

  const items = [];
  const warnings = [];
  const errors = [];

  let i = 0;

  // Skip M3U header (#EXTM3U) if present
  if (lines[0] && lines[0].startsWith('#EXTM3U')) {
    i = 1;
  }

  while (i < lines.length) {
    try {
      // Look for EXTINF line
      if (lines[i].startsWith('#EXTINF:')) {
        const extinfLine = lines[i];
        const metadata = parseExtinfLine(extinfLine);

        i++;

        // Next non-comment line should be the stream URL
        while (i < lines.length && lines[i].startsWith('#')) {
          i++;
        }

        if (i < lines.length) {
          const streamUrl = lines[i].trim();

          // Validate URL
          if (!streamUrl || streamUrl.length === 0) {
            warnings.push(`Empty stream URL after EXTINF at line ${i}`);
            i++;
            continue;
          }

          // Use tvgName as fallback for displayName
          const displayName = metadata.displayName || metadata.tvgName || `Stream ${items.length + 1}`;

          const contentType = detectContentType(metadata.groupTitle);
          const contentId = generateContentId(playlistId, streamUrl);

          items.push({
            id: contentId,
            playlistId,
            name: displayName,
            url: streamUrl,
            type: contentType,
            tvgId: metadata.tvgId,
            tvgName: metadata.tvgName,
            logo: metadata.tvgLogo,
            groupTitle: metadata.groupTitle || 'Ungrouped',
            addedAt: Date.now(),
          });

          i++;
        } else {
          warnings.push(`EXTINF without stream URL at end of file`);
          break;
        }
      } else {
        i++;
      }
    } catch (error) {
      errors.push(`Parse error at line ${i}: ${error.message}`);
      i++;
    }
  }

  return { items, warnings, errors };
};

/**
 * Main M3U parsing function
 */
export const parseM3U = async (playlistId, playlistName, m3uUrl, options = {}) => {
  const {
    onProgress = null, // Callback for progress updates
    retries = MAX_RETRIES,
    batchSize = BATCH_SIZE,
  } = options;

  console.log(`[PARSING_M3U] Starting parse for playlist: ${playlistName}`);

  // Initialize progress tracker
  const tracker = new ProgressTracker(playlistId, playlistName, 'm3u');

  try {
    // Start tracking
    tracker.start();

    // Fetch M3U content
    let m3uContent;
    try {
      m3uContent = await fetchM3UWithRetry(m3uUrl, retries);
    } catch (error) {
      tracker.error(error.message);
      return {
        success: false,
        error: error.message,
        itemsProcessed: 0,
        itemsSaved: 0,
        itemsFailed: 0,
        duration: Date.now() - tracker.startTime,
      };
    }

    // Parse M3U content
    console.log(`[PARSING_M3U] Parsing ${m3uContent.length} bytes...`);
    const { items, warnings, errors } = parseM3UContent(m3uContent, playlistId, playlistName);

    const totalItems = items.length;
    console.log(`[PARSING_M3U] Parsed ${totalItems} items (${warnings.length} warnings, ${errors.length} errors)`);

    // Log warnings
    if (warnings.length > 0) {
      warnings.forEach((warning) => console.warn(`[PARSING_M3U] ⚠ ${warning}`));
    }

    // Log errors
    if (errors.length > 0) {
      errors.forEach((error) => console.error(`[PARSING_M3U] ✗ ${error}`));
    }

    // Process items in batches
    let itemsSaved = 0;
    const categories = new Set();
    const contentTypeCounts = {
      channel: 0,
      movie: 0,
      series: 0,
    };

    for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, items.length);
      const batch = items.slice(batchStart, batchEnd);

      try {
        // Update category and type counts
        batch.forEach((item) => {
          if (item.groupTitle) categories.add(item.groupTitle);
          contentTypeCounts[item.type]++;
        });

        // Save batch to storage
        await itemStorageService.saveItemsBatch(playlistId, batch);

        itemsSaved = batchEnd;

        // Record batch in progress tracker
        tracker.recordBatchSaved(batch.length, itemsSaved);

        // Call progress callback if provided
        if (onProgress) {
        onProgress({
          phase: 'saving',
          progress: Math.round((itemsSaved / totalItems) * 100),
          percentComplete: Math.round((itemsSaved / totalItems) * 100),
          itemsProcessed: itemsSaved,
          itemsSaved,
          itemsTotal: totalItems,
          totalItems: totalItems,
          batchNumber: Math.ceil(itemsSaved / batchSize),
          totalBatches: Math.ceil(totalItems / batchSize),
        });
      }

        console.log(`[PARSING_M3U] Batch ${Math.ceil(itemsSaved / batchSize)}: Saved ${batch.length} items (${itemsSaved}/${totalItems})`);
      } catch (error) {
        console.error(`[PARSING_M3U] Failed to save batch at index ${batchStart}:`, error);

        // Continue with next batch even if this one fails
        // Update tracker with failures
        batch.forEach(() => {
          tracker.itemsFailed++;
        });
      }
    }

    // Complete parsing
    tracker.complete();

    const duration = Date.now() - tracker.startTime;

    console.log(`[PARSING_M3U] ✓ Parse complete: ${itemsSaved} items saved in ${duration}ms`);

    return {
      success: true,
      itemsProcessed: totalItems,
      itemsSaved,
      itemsFailed: errors.length,
      categories: Array.from(categories),
      contentTypeCounts,
      duration,
      warnings,
      errors,
    };
  } catch (error) {
    tracker.error(error.message);

    console.error(`[PARSING_M3U] ✗ Fatal error during parsing:`, error);

    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      duration: Date.now() - tracker.startTime,
    };
  }
};

/**
 * Parse M3U from URL
 * Simple wrapper for common use case
 */
export const parseM3UFromUrl = async (playlistId, playlistName, m3uUrl) => {
  return parseM3U(playlistId, playlistName, m3uUrl);
};

export default {
  parseM3U,
  parseM3UFromUrl,
};
