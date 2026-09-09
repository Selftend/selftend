// Static file server: node serve.js <dir> <port> [mode]
// mode "spa" (default) = unknown extensionless path -> index.html 200 (today's Cloudflare
// `single-page-application`). mode "404" = unknown path -> 404.html with a 404 status if it
// exists, else empty 404 (Cloudflare `404-page`). Also mimics Cloudflare's
// auto-trailing-slash html_handling: /faq -> faq.html.
const http = require("node:http");
const fsp = require("node:fs/promises");
const path = require("node:path");

const [dir, port, mode = "spa"] = process.argv.slice(2);
const ROOT = path.resolve(dir);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".ttf": "font/ttf",
};

async function statOrNull(p) {
  return fsp.stat(p).catch(() => null);
}

http
  .createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let filePath = path.join(ROOT, urlPath);
    let stat = await statOrNull(filePath);
    if (stat?.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stat = await statOrNull(filePath);
    }
    if (!stat && !path.extname(urlPath)) {
      // auto-trailing-slash: /faq -> faq.html
      const asHtml = path.join(ROOT, `${urlPath}.html`);
      if (await statOrNull(asHtml)) {
        filePath = asHtml;
        stat = true;
      }
    }
    if (!stat) {
      if (path.extname(urlPath) || mode === "404") {
        const nf = path.join(ROOT, "404.html");
        const body = (await statOrNull(nf)) ? await fsp.readFile(nf) : "";
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(body);
        return;
      }
      filePath = path.join(ROOT, "index.html");
    }
    const body = await fsp.readFile(filePath);
    res
      .writeHead(200, {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      })
      .end(body);
  })
  .listen(Number(port), () => console.log(`serving ${ROOT} on ${port} (${mode})`));
