const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// getSentryExpoConfig extends expo/metro-config's getDefaultConfig with
// source-map output Sentry can symbolicate.
const config = getSentryExpoConfig(__dirname);

// Agent worktrees live under .claude/worktrees, each a full checkout with its
// own node_modules. Metro's file map must never crawl or watch them: nothing in
// the main bundle resolves there, and with a few dozen checkouts the watcher's
// startup walk times out outright ("Failed to start watch mode").
config.resolver.blockList = [
  /[/\\]\.claude[/\\]/,
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
];

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
