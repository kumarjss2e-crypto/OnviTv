// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows workaround: Set environment variable to skip node externals
if (process.platform === 'win32') {
  process.env.EXPO_NO_METRO_NODE_EXTERNALS = '1';
}

// Provide no-op implementations for Node.js modules that iOS/Android don't need
// This prevents "module not found" errors when expo-modules-core tries to load them
config.resolver.extraNodeModules = {
  crypto: path.resolve(__dirname, 'polyfills/noop.js'),
  stream: path.resolve(__dirname, 'polyfills/noop.js'),
  util: path.resolve(__dirname, 'polyfills/noop.js'),
};

module.exports = config;
