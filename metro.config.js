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

// Dev-server SSR (`npm run web`) bundles for a server environment, where
// Expo resolves package exports with the "node" condition. For an `import`
// of tslib that picks `tslib/modules/index.js`, an ESM wrapper that does
// `import tslib from "../tslib.js"` and relies on real Node ESM-CJS interop
// (default = module.exports). Metro's Babel interop instead honours the
// `__esModule` flag tslib.js sets, so the default is undefined and every
// route dies with "Cannot destructure property '__extends' of
// 'tslib.default'" (#2809; upstream expo/expo#38103). Node's own require(esm)
// is not involved: the failing code is Babel-compiled inside the Metro
// bundle, so the Node version should not matter (seen on Node 24). Point server
// bundles at tslib's plain ES module build - the same file the web client
// bundle already resolves - which carries both named and default exports.
const TSLIB_ESM = require.resolve("tslib/tslib.es6.mjs");
const SERVER_ENVIRONMENTS = new Set(["node", "react-server"]);
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if (
    moduleName === "tslib" &&
    SERVER_ENVIRONMENTS.has(context.customResolverOptions?.environment)
  ) {
    return { type: "sourceFile", filePath: TSLIB_ESM };
  }
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
