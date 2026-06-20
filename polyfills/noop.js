/**
 * No-op polyfill for Node.js modules on native platforms
 * 
 * On iOS/Android, these modules are not needed. This file provides
 * empty implementations to satisfy import statements in expo-modules-core
 * and other dependencies that might reference them.
 */

module.exports = {};
