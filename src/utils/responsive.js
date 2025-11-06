import { Dimensions, PixelRatio } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference - iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive width based on screen width
 * @param {number} size - Size in pixels from design
 * @returns {number} - Scaled size for current device
 */
export const wp = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Responsive height based on screen height
 * @param {number} size - Size in pixels from design
 * @returns {number} - Scaled size for current device
 */
export const hp = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Responsive font size
 * @param {number} size - Font size from design
 * @returns {number} - Scaled font size
 */
export const fp = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get responsive spacing
 * @param {number} size - Spacing size
 * @returns {number} - Scaled spacing
 */
export const sp = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Check if device is small (width < 360)
 * @returns {boolean}
 */
export const isSmallDevice = () => {
  return SCREEN_WIDTH < 360;
};

/**
 * Check if device is medium (360 <= width < 400)
 * @returns {boolean}
 */
export const isMediumDevice = () => {
  return SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 400;
};

/**
 * Check if device is large (width >= 400)
 * @returns {boolean}
 */
export const isLargeDevice = () => {
  return SCREEN_WIDTH >= 400;
};

/**
 * Check if device has short screen (height < 700)
 * @returns {boolean}
 */
export const isShortScreen = () => {
  return SCREEN_HEIGHT < 700;
};

/**
 * Check if device has tall screen (height >= 800)
 * @returns {boolean}
 */
export const isTallScreen = () => {
  return SCREEN_HEIGHT >= 800;
};

/**
 * Get number of columns for grid based on screen width
 * @param {number} minColumnWidth - Minimum width for each column
 * @param {number} padding - Total horizontal padding
 * @param {number} gap - Gap between columns
 * @returns {number} - Number of columns
 */
export const getGridColumns = (minColumnWidth = 150, padding = 32, gap = 12) => {
  const availableWidth = SCREEN_WIDTH - padding;
  const columns = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
  return Math.max(2, columns); // Minimum 2 columns
};

/**
 * Get card dimensions for grid
 * @param {number} columns - Number of columns
 * @param {number} padding - Total horizontal padding
 * @param {number} gap - Gap between columns
 * @param {number} aspectRatio - Height/Width ratio (default: 1.5 for poster)
 * @returns {Object} - { width, height }
 */
export const getCardDimensions = (columns, padding = 32, gap = 12, aspectRatio = 1.5) => {
  const totalGap = gap * (columns - 1);
  const availableWidth = SCREEN_WIDTH - padding - totalGap;
  const width = availableWidth / columns;
  const height = width * aspectRatio;
  return { width, height };
};

/**
 * Get responsive value based on screen size
 * @param {Object} sizes - { small, medium, large }
 * @returns {any} - Value for current screen size
 */
export const getResponsiveValue = (sizes) => {
  if (isSmallDevice()) {
    return sizes.small || sizes.medium || sizes.large;
  } else if (isMediumDevice()) {
    return sizes.medium || sizes.large || sizes.small;
  } else {
    return sizes.large || sizes.medium || sizes.small;
  }
};

/**
 * Get responsive font sizes for different text types
 */
export const fontSizes = {
  xs: getResponsiveValue({ small: 10, medium: 11, large: 12 }),
  sm: getResponsiveValue({ small: 12, medium: 13, large: 14 }),
  base: getResponsiveValue({ small: 14, medium: 15, large: 16 }),
  lg: getResponsiveValue({ small: 16, medium: 17, large: 18 }),
  xl: getResponsiveValue({ small: 18, medium: 20, large: 22 }),
  '2xl': getResponsiveValue({ small: 22, medium: 24, large: 26 }),
  '3xl': getResponsiveValue({ small: 26, medium: 28, large: 30 }),
  '4xl': getResponsiveValue({ small: 30, medium: 34, large: 38 }),
};

/**
 * Get responsive spacing values
 */
export const spacing = {
  xs: getResponsiveValue({ small: 4, medium: 4, large: 6 }),
  sm: getResponsiveValue({ small: 8, medium: 8, large: 10 }),
  md: getResponsiveValue({ small: 12, medium: 14, large: 16 }),
  lg: getResponsiveValue({ small: 16, medium: 18, large: 20 }),
  xl: getResponsiveValue({ small: 20, medium: 24, large: 28 }),
  '2xl': getResponsiveValue({ small: 24, medium: 28, large: 32 }),
  '3xl': getResponsiveValue({ small: 32, medium: 36, large: 40 }),
};

export default {
  wp,
  hp,
  fp,
  sp,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isShortScreen,
  isTallScreen,
  getGridColumns,
  getCardDimensions,
  getResponsiveValue,
  fontSizes,
  spacing,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
