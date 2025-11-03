module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Removed reanimated plugin - app uses React Native Animated, not reanimated
    plugins: [],
  };
};
