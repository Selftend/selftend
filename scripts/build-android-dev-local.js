const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "local-builds", "android");
fs.mkdirSync(outputDir, { recursive: true });

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace(/Z$/, "");
const apkName = `selftend-dev-${timestamp}.apk`;
const apkPath = path.join(outputDir, apkName);

console.log(`Building development APK to ${path.relative(projectRoot, apkPath)}\n`);

const buildResult = spawnSync(
  "npm",
  [
    "exec",
    "--yes",
    "eas-cli",
    "--",
    "build",
    "--platform",
    "android",
    "--profile",
    "development",
    "--local",
    "--output",
    apkPath,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

if (!fs.existsSync(apkPath)) {
  console.error(`\nExpected APK at ${apkPath} but it was not created.`);
  process.exit(1);
}

if (process.env.CI === "true" || process.argv.includes("--no-serve")) {
  console.log(`\nAPK ready at ${apkPath}`);
  process.exit(0);
}

function detectLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        candidates.push({ name, address: iface.address });
      }
    }
  }
  const preferred = candidates.find((c) => /^(wl|wlan|en|wi-fi)/i.test(c.name));
  return (preferred ?? candidates[0])?.address ?? null;
}

const ip = detectLanIp();
if (!ip) {
  console.error("\nBuild succeeded but no LAN IPv4 address was detected.");
  console.error(`APK: ${apkPath}`);
  process.exit(1);
}

const port = Number(process.env.SELFTEND_APK_SERVE_PORT) || 8787;
const urlPath = `/${encodeURIComponent(apkName)}`;
const downloadUrl = `http://${ip}:${port}${urlPath}`;

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end();
    return;
  }
  if (req.url !== urlPath) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  const stat = fs.statSync(apkPath);
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Content-Disposition", `attachment; filename="${apkName}"`);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  console.log(`-> download started from ${req.socket.remoteAddress}`);
  res.on("close", () => {
    console.log(res.writableFinished ? "-> download finished" : "-> download interrupted");
  });
  fs.createReadStream(apkPath).pipe(res);
});

server.on("error", (err) => {
  console.error(`\nServer error: ${err.message}`);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is in use. Set SELFTEND_APK_SERVE_PORT to a free port and retry.`);
  }
  process.exit(1);
});

server.listen(port, () => {
  let qrcode = null;
  try {
    qrcode = require("qrcode-terminal");
  } catch {
    console.warn("\nqrcode-terminal not installed; run `npm install` to render the QR inline.");
  }
  console.log("\n----------------------------------------------------");
  console.log(`APK:  ${apkPath}`);
  console.log(`URL:  ${downloadUrl}`);
  console.log("----------------------------------------------------");
  if (qrcode) {
    qrcode.generate(downloadUrl, { small: true });
  }
  console.log("Scan from your phone on the same Wi-Fi to download.");
  console.log("In the browser/Files app, allow installs from unknown sources when prompted.");
  console.log("Press Ctrl+C when finished.\n");
});

process.on("SIGINT", () => {
  console.log("\nStopping server.");
  server.close(() => process.exit(0));
});
