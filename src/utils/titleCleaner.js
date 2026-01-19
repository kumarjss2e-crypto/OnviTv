/**
 * Title Cleaning Utilities
 * Cleans M3U/streaming titles to work with TMDB API
 */

/**
 * Clean a streaming title for TMDB API search
 * Removes country codes, quality indicators, season/episode info, etc.
 * @param {string} dirtyTitle - Raw title from M3U/streaming service
 * @returns {string} - Cleaned title suitable for TMDB search
 */
export const cleanTitleForTmdb = (dirtyTitle) => {
  if (!dirtyTitle || typeof dirtyTitle !== 'string') {
    return '';
  }

  let title = dirtyTitle.trim();

  // Remove country codes (DE|, IT|, FR|, ES|, PL|, UK|, etc.)
  title = title.replace(/^[A-Z]{2,3}\s*\|\s*/g, '');

  // Remove quality indicators (4K, UHD, FHD, HD, SD, RAW, ᴿᴬᵂ, etc.)
  title = title.replace(/\s*(4K|UHD|2K|FHD|HD|SD|RAW|ᴿᴬᵂ|@\d+p)\s*$/gi, '');
  title = title.replace(/\s*\(4K\)\s*/gi, '');
  title = title.replace(/\s*\[4K\]\s*/gi, '');

  // Remove season/episode info (S01, E01, S01E01, etc.)
  title = title.replace(/\s*S\d{1,2}(?:E\d{1,2})?\s*$/gi, '');
  title = title.replace(/\s*Season\s+\d+.*$/gi, '');
  title = title.replace(/\s*Episode\s+\d+.*$/gi, '');

  // Remove provider/platform indicators
  title = title.replace(/\s*\[.*?\]\s*/g, '');
  title = title.replace(/\s*\(.*?\)\s*/g, '');

  // Remove common streaming service prefixes
  title = title.replace(/^(NETFLIX|AMAZON|DISNEY|HULU|HBO|APPLE|PARAMOUNT|PRIME|MAX|PEACOCK)\s*[\s\|]*\s*/gi, '');

  // Remove special characters that might interfere with search
  title = title.replace(/[#★·•◆●■□▪▫╬╮╰]/g, '');

  // Remove extra whitespace
  title = title.replace(/\s+/g, ' ').trim();

  return title;
};

/**
 * Clean title for series specifically
 * Removes season info but keeps series name
 * @param {string} dirtyTitle - Raw title from M3U/streaming service
 * @returns {string} - Cleaned series title
 */
export const cleanSeriesTitleForTmdb = (dirtyTitle) => {
  let title = cleanTitleForTmdb(dirtyTitle);
  
  // For series, we want to remove episode numbers but keep context
  title = title.replace(/\s*\d{1,2}\s*$/, ''); // Remove trailing episode number
  
  return title;
};

/**
 * Get the cleanest possible title by extracting core name
 * This is more aggressive and removes most metadata
 * @param {string} dirtyTitle - Raw title
 * @returns {string} - Very clean core title
 */
export const getCoreTitleOnly = (dirtyTitle) => {
  let title = cleanTitleForTmdb(dirtyTitle);
  
  // Split by common separators and take the first meaningful part
  const parts = title.split(/[-–—|\/]+/);
  
  if (parts.length > 0) {
    title = parts[0].trim();
  }
  
  return title;
};

export default {
  cleanTitleForTmdb,
  cleanSeriesTitleForTmdb,
  getCoreTitleOnly,
};
