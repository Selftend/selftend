// Candidate C's post-export step: node prune.js <src-dist> <dest-dist>
// Copies the static export, keeps only the public routes' HTML, deletes every
// other .html (gated (app)/…, (auth)/…, their bare copies, _sitemap), and
// copies +not-found.html to 404.html for Cloudflare's `404-page` mode.
const fs = require("node:fs");
const path = require("node:path");

const [src, dest] = process.argv.slice(2);
const PUBLIC = new Set([
  "index.html",
  "faq.html",
  "crisis.html",
  "privacy.html",
  "terms.html",
  "cookies.html",
  "security.html",
  "account-deletion.html",
  "+not-found.html",
]);

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

let kept = 0;
let deleted = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (entry.name.endsWith(".html")) {
      const rel = path.relative(dest, full).replace(/\\/g, "/");
      if (PUBLIC.has(rel)) kept++;
      else {
        fs.unlinkSync(full);
        deleted++;
      }
    }
  }
}
walk(dest);
fs.copyFileSync(path.join(dest, "+not-found.html"), path.join(dest, "404.html"));
console.log(`kept=${kept} deleted=${deleted} (+404.html)`);
