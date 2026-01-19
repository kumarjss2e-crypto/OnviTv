// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows workaround: Set environment variable to skip node externals
if (process.platform === 'win32') {
  process.env.EXPO_NO_METRO_NODE_EXTERNALS = '1';
}

module.exports = config;
