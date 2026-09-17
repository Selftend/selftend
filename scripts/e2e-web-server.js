// Static web server for the Playwright e2e suite.
//
// Replaces the Metro dev server (`expo start --web`) with a one-time static export
// (`expo export`) served by a tiny built-in static file server (with SPA fallback).
// Metro re-bundles on every navigation and serializes requests across parallel
// workers, which both slowed the suite and introduced recompile-timing races;
// serving a pre-built bundle removes both.
//
// Used as the Playwright `webServer.command`. By default it builds a fresh export
// each run (deterministic; the path CI takes). For fast local iteration against an
// already-built export, set E2E_SKIP_BUILD=1 to skip the build and just serve.
//
// The build inlines the EXPO_PUBLIC_* values below into the bundle (Expo reads them
// at build time). EXPO_PUBLIC_PUBLIC_APP_URL is pinned to the serve port so the app
// and its server agree. test/e2e/fixtures.ts is robust to whichever Supabase host
// ends up inlined, so this stays correct on dev machines and in CI.
//
// The export directory is PORT-SCOPED: the default port (8099) keeps the plain
// `dist-e2e/` name (CI and existing E2E_SKIP_BUILD workflows unchanged); any
// other port builds and serves `dist-e2e-<port>/`. Because the bundle bakes
// EXPO_PUBLIC_PUBLIC_APP_URL at build time, two servers on different ports
// sharing one directory would silently serve whichever build ran last - with
// its email redirects pointing at the WRONG origin.

const { spawnSync } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_PORT = "8099";
const PORT = process.argv[2] ?? process.env.E2E_PORT ?? DEFAULT_PORT;
const OUTPUT_DIR = PORT === DEFAULT_PORT ? "dist-e2e" : `dist-e2e-${PORT}`;

// Deterministic local Supabase anon key (same value as playwright.config.ts /
// test/integration/helpers.ts). Used only as a fallback when the parent env (the
// Playwright webServer.env) does not already provide it.
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// On Windows the .bin entry is a .cmd shim, and Node >= 20.12 refuses to spawn
// .cmd files without a shell (EINVAL / exit null).
const isWindows = process.platform === "win32";
const expoBin = path.join(process.cwd(), "node_modules", ".bin", isWindows ? "expo.cmd" : "expo");

const buildEnv = {
  ...process.env,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? LOCAL_ANON_KEY,
  // Pin the app's public URL to the port we serve on so password-reset redirects
  // and any absolute-URL building target the server under test.
  EXPO_PUBLIC_PUBLIC_APP_URL: `http://localhost:${PORT}`,
};

const distIndex = path.join(process.cwd(), OUTPUT_DIR, "index.html");

// The EXPO_PUBLIC_* values are baked into the bundle at build time, so a served
// export can silently disagree with the current env (the E2E_SKIP_BUILD stale-bundle
// trap). Each build records what it baked into a manifest inside the export dir;
// E2E_SKIP_BUILD is honored only when the recorded env carries the web-push VAPID
// key the reminder re-arm suite depends on - otherwise the suite would run at
// channel status "unsupported" and silently test nothing (#966). The manifest is
// also served statically, so the suite's canary test can assert the bundle under
// test was baked with the expected key.
const BAKED_ENV_MANIFEST = "e2e-baked-env.json";
const manifestPath = path.join(process.cwd(), OUTPUT_DIR, BAKED_ENV_MANIFEST);
// The manifest records every baked EXPO_PUBLIC_* for debuggability. Two of
// them also gate E2E_SKIP_BUILD: the VAPID key, whose absence makes the
// reminder re-arm suite silently test nothing, and the support address, whose
// absence removes the support page's form (#1728) - an export from before
// either was pinned is rebuilt rather than served. Only the VAPID key is
// verified inside the bundle itself.
const BAKED_ENV_KEYS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_PUBLIC_APP_URL",
  "EXPO_PUBLIC_PLAY_STORE_URL",
  "EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
];
const SKIP_BUILD_REQUIRED_KEYS = [
  "EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
];

function readBakedEnvManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

let skipBuild = process.env.E2E_SKIP_BUILD === "1" && fs.existsSync(distIndex);
if (skipBuild) {
  const recorded = readBakedEnvManifest();
  const missingKey = SKIP_BUILD_REQUIRED_KEYS.find((key) => !recorded?.[key]);
  if (missingKey) {
    console.log(
      `[e2e-web] refusing E2E_SKIP_BUILD=1: ${OUTPUT_DIR}/${BAKED_ENV_MANIFEST} ` +
        `${recorded ? `records no ${missingKey}` : "is missing"} ` +
        `- the existing export predates that value being pinned. Rebuilding.`,
    );
    skipBuild = false;
  }
}

function runExport(clearCache) {
  const args = ["export", "--platform", "web", "--output-dir", OUTPUT_DIR];
  if (clearCache) args.push("--clear");
  const build = spawnSync(expoBin, args, {
    stdio: "inherit",
    env: buildEnv,
    shell: isWindows,
  });
  if (build.status !== 0) {
    console.error(`[e2e-web] export failed (exit ${build.status})`);
    process.exit(build.status ?? 1);
  }
}

// Passing the key in the build env is not enough: babel inlines EXPO_PUBLIC_*
// values during transform, and Metro's transformer cache can serve a transform
// cached under a DIFFERENT env - the export then silently bakes the old value
// while every process-level check says the key was set. Only the exported JS
// itself is the truth, so search it for the literal value.
function bundleHasBakedVapidKey() {
  const key = buildEnv.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!key) return false;
  const jsDir = path.join(process.cwd(), OUTPUT_DIR, "_expo", "static", "js", "web");
  let files;
  try {
    files = fs.readdirSync(jsDir).filter((file) => file.endsWith(".js"));
  } catch {
    return false;
  }
  return files.some((file) => fs.readFileSync(path.join(jsDir, file), "utf8").includes(key));
}

if (skipBuild) {
  console.log(`[e2e-web] E2E_SKIP_BUILD=1 - serving existing ${OUTPUT_DIR}/`);
} else {
  if (!buildEnv.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY) {
    console.error(
      "[e2e-web] EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY is not set. Run through Playwright " +
        "(its webServer.env pins the e2e key) or set the variable - without it the reminder " +
        "channel bakes as 'unsupported' and the re-arm suite tests nothing.",
    );
    process.exit(1);
  }
  console.log(`[e2e-web] building static web export → ${OUTPUT_DIR}/ (port ${PORT})...`);
  runExport(false);
  if (!bundleHasBakedVapidKey()) {
    console.log(
      "[e2e-web] the exported bundle does not contain the baked VAPID key - Metro's " +
        "transformer cache served a stale env transform. Rebuilding with --clear...",
    );
    runExport(true);
    if (!bundleHasBakedVapidKey()) {
      console.error(
        "[e2e-web] the export still lacks the baked VAPID key after a cache-cleared rebuild.",
      );
      process.exit(1);
    }
  }
  // Written only after the bundle check above, so the manifest (and the canary
  // test that reads it over HTTP) describes what the bundle actually holds.
  const baked = Object.fromEntries(BAKED_ENV_KEYS.map((key) => [key, buildEnv[key] ?? ""]));
  fs.writeFileSync(manifestPath, `${JSON.stringify(baked, null, 2)}\n`);
}

// Static file server with SPA fallback. `expo serve` does NOT fall back to
// index.html for client-side routes (it 404s on deep links like
// /tools/check-in/new), and the app uses Expo Router's "single" (SPA) web
// output, so we serve it ourselves: real files are served as-is; an extensionless
// path that has no file falls back to index.html for the router to handle.
const ROOT = path.join(process.cwd(), OUTPUT_DIR);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let stat = await fsp.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stat = await fsp.stat(filePath).catch(() => null);
    }
    if (!stat) {
      // A missing asset (has an extension) is a real 404; a missing route falls
      // back to index.html so the SPA router can render it.
      if (path.extname(urlPath)) {
        res.writeHead(404).end("Not found");
        return;
      }
      filePath = path.join(ROOT, "index.html");
    }
    const body = await fsp.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(Number(PORT), () => {
  console.log(`[e2e-web] serving ${OUTPUT_DIR}/ (SPA fallback) on http://localhost:${PORT}`);
});

// Stop cleanly when Playwright tears the server down between runs.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
