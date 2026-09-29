const path = require("path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// getSentryExpoConfig extends expo/metro-config's getDefaultConfig with
// source-map output Sentry can symbolicate.
const config = getSentryExpoConfig(__dirname);

// Agent worktrees under .claude/worktrees/ appear and vanish while builds run;
// metro-file-map crawling one mid-deletion killed `expo export` with ENOENT
// (#2811). Anchored to this project root's absolute path on purpose: the
// worktrees themselves live under the main checkout's .claude/, so an
// unanchored /\.claude/ (what metro-config's exclusionList produces) would
// match every file of a build run *from* a worktree and block the whole
// project.
const escapeForRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  new RegExp(
    `^${escapeForRegExp(path.join(__dirname, ".claude"))}(?:${escapeForRegExp(path.sep)}.*)?$`,
  ),
];

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
