// node probe.js <baseUrl> <path...>
// For each path: what a no-JS fetch returns (status, <html lang>, <title>, description,
// body text length) and what a browser DOM settles on after JS (title, description, lang).
// Run from the worktree so `playwright` resolves.
const { chromium } = require("playwright");

const [base, ...paths] = process.argv.slice(2);

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function bodyText(html) {
  const body = pick(html, /<body[^>]*>([\s\S]*)<\/body>/) ?? "";
  return body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  const browser = await chromium.launch();
  for (const p of paths) {
    const url = base + p;
    const res = await fetch(url);
    const html = await res.text();
    const text = bodyText(html);
    console.log(`\n=== ${p} ===`);
    console.log(`no-JS: status=${res.status} lang=${pick(html, /<html[^>]*lang="([^"]*)"/)}`);
    console.log(`no-JS: title=${JSON.stringify(pick(html, /<title[^>]*>([^<]*)<\/title>/))}`);
    console.log(
      `no-JS: description=${JSON.stringify((html.match(/<meta\s+name="description"\s+content="([^"]*)"/g) || []).map((m) => m.slice(0, 70)))}`,
    );
    console.log(
      `no-JS: robots=${JSON.stringify(pick(html, /<meta name="robots" content="([^"]*)"/))}`,
    );
    console.log(
      `no-JS: og:title=${JSON.stringify(html.match(/property="og:title"\s+content="([^"]*)"/g) || [])}`,
    );
    console.log(
      `no-JS: canonical=${JSON.stringify(pick(html, /rel="canonical"\s+href="([^"]*)"/))}`,
    );
    console.log(
      `no-JS: bodyTextChars=${text.length} bodyText=${JSON.stringify(text.slice(0, 160))}`,
    );
    for (const lang of ["en", "bg"]) {
      const ctx = await browser.newContext({ locale: lang === "bg" ? "bg-BG" : "en-GB" });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const dom = await page.evaluate(() => ({
        title: document.title,
        descriptions: [...document.querySelectorAll('meta[name="description"]')].map((m) =>
          m.getAttribute("content").slice(0, 40),
        ),
        ogTitles: [...document.querySelectorAll('meta[property="og:title"]')].map((m) =>
          m.getAttribute("content"),
        ),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        lang: document.documentElement.lang,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
        h1:
          document
            .querySelector('[role="heading"][aria-level="1"], h1')
            ?.textContent?.slice(0, 80) ?? null,
        textChars: document.body.innerText.length,
      }));
      console.log(`DOM(${lang}): ${JSON.stringify(dom)} errors=${JSON.stringify(errors)}`);
      await ctx.close();
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
