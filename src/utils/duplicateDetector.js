/**
 * Duplicate Detector
 * Tracks items already parsed in current playlist to avoid duplicates
 * Resets on each new parse session
 */

class DuplicateDetector {
  constructor() {
    this.seenItems = new Map(); // playlistId → Set of item identifiers
  }

  /**
   * Initialize tracker for a playlist
   * @param {string} playlistId
   */
  initPlaylist(playlistId) {
    if (!this.seenItems.has(playlistId)) {
      this.seenItems.set(playlistId, new Set());
    }
  }

  /**
   * Generate unique identifier for an item
   * Uses combination of name, streamUrl, and type
   * @param {Object} item - Parsed item
   * @returns {string} - Unique identifier
   */
  _generateId(item) {
    const { name, streamUrl, type } = item;
    
    // Normalize the identifier
    const normalizedName = (name || '').toLowerCase().trim();
    const normalizedUrl = (streamUrl || '').toLowerCase().trim();
    
    // Create composite key
    return `${type}|${normalizedName}|${normalizedUrl}`;
  }

  /**
   * Check if item is a duplicate
   * @param {string} playlistId
   * @param {Object} item - Item to check
   * @returns {boolean} - True if duplicate, false if new
   */
  isDuplicate(playlistId, item) {
    this.initPlaylist(playlistId);
    
    const id = this._generateId(item);
    const seen = this.seenItems.get(playlistId);
    
    return seen.has(id);
  }

  /**
   * Mark item as seen
   * @param {string} playlistId
   * @param {Object} item
   * @returns {boolean} - True if was new, false if already existed
   */
  markSeen(playlistId, item) {
    this.initPlaylist(playlistId);
    
    const id = this._generateId(item);
    const seen = this.seenItems.get(playlistId);
    
    if (seen.has(id)) {
      return false; // Already existed
    }
    
    seen.add(id);
    return true; // Was new
  }

  /**
   * Clear playlist tracker (when done parsing)
   * @param {string} playlistId
   */
  clearPlaylist(playlistId) {
    this.seenItems.delete(playlistId);
  }

  /**
   * Clear all playlists
   */
  clearAll() {
    this.seenItems.clear();
  }

  /**
   * Get count of seen items for a playlist
   * @param {string} playlistId
   * @returns {number}
   */
  getCount(playlistId) {
    if (!this.seenItems.has(playlistId)) {
      return 0;
    }
    return this.seenItems.get(playlistId).size;
  }
}

// Singleton instance
export const duplicateDetector = new DuplicateDetector();

export default duplicateDetector;
