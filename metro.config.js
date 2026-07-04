const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// getSentryExpoConfig extends expo/metro-config's getDefaultConfig with
// source-map output Sentry can symbolicate.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
