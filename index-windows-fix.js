#!/usr/bin/env node

// Windows fix for Expo 50 node:sea directory issue
// This patches the fs module before Expo CLI runs

const fs = require('fs');
const path = require('path');

// Only apply on Windows
if (process.platform !== 'win32') {
  require('./App');
  return;
}

// Save original mkdir
const originalMkdir = fs.promises.mkdir;

// Override mkdir to handle the invalid node:sea path
fs.promises.mkdir = async function(dirPath, options) {
  // Skip the problematic node:sea directory on Windows
  if (typeof dirPath === 'string' && dirPath.includes('node:sea')) {
    return;
  }
  return originalMkdir.call(fs.promises, dirPath, options);
};

// Load the actual app
require('./App');
