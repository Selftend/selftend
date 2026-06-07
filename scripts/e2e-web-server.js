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

const { spawnSync } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const PORT = process.argv[2] ?? process.env.E2E_PORT ?? "8099";
const OUTPUT_DIR = "dist-e2e";

// Deterministic local Supabase anon key (same value as playwright.config.ts /
// test/integration/helpers.ts). Used only as a fallback when the parent env (the
// Playwright webServer.env) does not already provide it.
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const expoBin = path.join(process.cwd(), "node_modules", ".bin", "expo");

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
const skipBuild = process.env.E2E_SKIP_BUILD === "1" && fs.existsSync(distIndex);

if (skipBuild) {
  console.log(`[e2e-web] E2E_SKIP_BUILD=1 — serving existing ${OUTPUT_DIR}/`);
} else {
  console.log(`[e2e-web] building static web export → ${OUTPUT_DIR}/ (port ${PORT})…`);
  const build = spawnSync(expoBin, ["export", "--platform", "web", "--output-dir", OUTPUT_DIR], {
    stdio: "inherit",
    env: buildEnv,
  });
  if (build.status !== 0) {
    console.error(`[e2e-web] export failed (exit ${build.status})`);
    process.exit(build.status ?? 1);
  }
}

// Static file server with SPA fallback. `expo serve` does NOT fall back to
// index.html for client-side routes (it 404s on deep links like
// /tools/mood-tracker/new), and the app uses Expo Router's "single" (SPA) web
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
