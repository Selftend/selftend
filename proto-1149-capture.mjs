// PROTOTYPE — throwaway, never merged to main. Drives app/proto-1149-accent.tsx
// for #1149 and prints the RENDERED contrast table.
//
// Usage: start the web dev server on a port NOTHING ELSE is using
//   npx expo start --web --port 8349
// then
//   node proto-1149-capture.mjs <out-dir> <port>
//
// ☠️ Parallel agent sessions run their own Metro on 8081 and upwards. A capture
// pointed at a port you did not start renders SOMEONE ELSE'S worktree — check
// the port is free first rather than trusting a 200.
//
// What this measures that arithmetic over the token table cannot:
//
//   1. That the class on the glyph actually BECOMES that token's colour. #1144
//      reported a violet-ish error glyph in dark while the bar under the same
//      token rendered red. Arithmetic cannot see a colour that never arrives —
//      the shape of trap 4 in the rendered-probe recipe, where `--primary-ink`
//      did not exist and every black text node classified as `primary-ink`.
//   2. That `dark:shadow-none` really does leave the card with NO edge in dark.
//      This is read off `boxShadow`, not assumed from the class string.
//   3. Icons here are FONT GLYPHS (MaterialIcons), not SVG — the script asserts
//      the font-family so a silent fallback to a text node cannot pass as a
//      measured icon.

import { chromium } from "playwright";

const OUT = process.argv[2] ?? ".";
const PORT = process.argv[3] ?? "8349";
const URL = `http://localhost:${PORT}/proto-1149-accent`;

const STYLES = [
  "quiet-lilac",
  "ink-ivory",
  "atlas",
  "deep-field",
  "sage-garden",
  "plum-manuscript",
  "amber-noir",
  "glacier",
];

const AA_TEXT = 4.5;
const AA_MARK = 3;

function parseRgb(value) {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return null;
  return nums.slice(0, 3).map(Number);
}

function relativeLuminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function measure(scheme) {
  const browser = await chromium.launch();
  // ☠️ RN-web renders ScrollView as a fixed-height scrollable div, so
  // `fullPage` captures only the viewport slice. The viewport has to be tall
  // enough to hold everything instead.
  const page = await browser.newPage({
    viewport: { width: 900, height: 4200 },
    deviceScaleFactor: 1,
    // ☠️ Both halves of the scheme have to move together, and only ONE of them
    // is ours to set. The `vars()` tokens follow __PROTO_SCHEME__, but
    // NativeWind's `dark:` variant follows a `dark` class on documentElement
    // (tailwind.config.js sets darkMode: "class") that NativeWind OWNS —
    // hand-adding it does not survive hydration, it gets stripped to match
    // NativeWind's own state. Measured: htmlClasses stayed [] and the dark
    // column reported the LIGHT shadow, reproducing the exact defect that made
    // #1145's dark column dishonest. Driving prefers-color-scheme instead runs
    // the app's real useColorSchemeDriver, which sets the class itself.
    colorScheme: scheme,
  });

  await page.addInitScript((s) => {
    globalThis.__PROTO_SCHEME__ = s;
  }, scheme);

  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE ERROR:", m.text().slice(0, 200));
  });

  let navigated = false;
  for (let attempt = 1; attempt <= 40 && !navigated; attempt++) {
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 180000 });
      navigated = true;
    } catch (err) {
      console.log(`attempt ${attempt}: ${String(err).split("\n")[0].slice(0, 90)}`);
      await page.waitForTimeout(5000);
    }
  }
  if (!navigated) throw new Error("dev server never accepted a navigation");

  await page.waitForSelector('[data-testid="proto-1149"]', { timeout: 240000 });

  // The precondition, asserted rather than assumed. A dark run whose `dark`
  // class never landed silently measures the LIGHT shadow and reports a card
  // edge the app does not paint — the failure this whole probe exists to avoid.
  const darkActive = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if ((scheme === "dark") !== darkActive) {
    throw new Error(
      `scheme=${scheme} but documentElement.dark=${darkActive} — the dark: variant is not in the state being measured; readings would be dishonest`,
    );
  }
  await page
    .waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  // The cookie strip is `fixed bottom-0` and covers the last block.
  const essentialOnly = page.getByText("Essential only", { exact: true });
  if (await essentialOnly.count()) {
    await essentialOnly.first().click();
    await page.waitForTimeout(600);
  }

  const readings = await page.evaluate((styles) => {
    // Resolve a token to RGB in the browser, so a rendered colour can be
    // classified back to the token that produced it. A token whose custom
    // property does not resolve on the element reads as the inherited/initial
    // colour — keep the raw string so the caller can tell the difference.
    const resolveToken = (el, token) => {
      const probe = document.createElement("span");
      probe.style.color = `hsl(var(${token}))`;
      probe.style.display = "none";
      el.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };

    const get = (id) => document.querySelector(`[data-testid="${id}"]`);
    const out = [];

    for (const style of styles) {
      for (const surface of ["onbg", "oncard"]) {
        const under = get(`${style}-${surface}-under`);
        for (const tone of ["success", "error"]) {
          const p = `${style}-${surface}-${tone}`;
          const card = get(`${p}-card`);
          const bar = get(`${p}-bar`);
          const icon = get(`${p}-icon`);
          const title = get(`${p}-title`);
          const x = get(`${p}-x`);
          if (!card || !bar || !icon || !under) {
            out.push({ style, surface, tone, missing: true });
            continue;
          }
          const cs = getComputedStyle(card);
          const iconCs = getComputedStyle(icon);
          out.push({
            style,
            surface,
            tone,
            under: getComputedStyle(under).backgroundColor,
            card: cs.backgroundColor,
            cardShadow: cs.boxShadow,
            cardBorderWidth: cs.borderTopWidth,
            cardBorderColor: cs.borderTopColor,
            bar: getComputedStyle(bar).backgroundColor,
            icon: iconCs.color,
            iconFont: iconCs.fontFamily,
            iconText: icon.textContent,
            title: title ? getComputedStyle(title).color : null,
            x: x ? getComputedStyle(x).color : null,
            // The tokens the treatment names, resolved on the card itself so
            // the `vars()` cascade is the one the toast actually sees.
            tokPrimary: resolveToken(card, "--primary"),
            tokPrimaryInk: resolveToken(card, "--primary-ink"),
            tokDestructive: resolveToken(card, "--destructive"),
            tokCard: resolveToken(card, "--card"),
            tokBackground: resolveToken(card, "--background"),
            tokMutedForeground: resolveToken(card, "--muted-foreground"),
          });
        }
      }
    }
    return out;
  }, STYLES);

  await page.screenshot({ path: `${OUT}/proto-1149-${scheme}.png`, fullPage: true });
  await browser.close();
  return readings;
}

const lines = [];
const problems = [];

for (const scheme of ["light", "dark"]) {
  console.log(`measuring ${scheme}…`);
  const readings = await measure(scheme);
  lines.push(`\n########## ${scheme.toUpperCase()} ##########`);

  for (const r of readings) {
    if (r.missing) {
      problems.push(`${scheme} ${r.style} ${r.surface} ${r.tone}: NODES MISSING`);
      continue;
    }
    const under = parseRgb(r.under);
    const card = parseRgb(r.card);
    const bar = parseRgb(r.bar);
    const icon = parseRgb(r.icon);
    const expectedIcon = r.tone === "success" ? r.tokPrimaryInk : r.tokDestructive;
    const expectedBar = r.tone === "success" ? r.tokPrimary : r.tokDestructive;

    const iconRatio = contrast(icon, card);
    const barRatio = contrast(bar, card);
    const edgeRatio = contrast(card, under);

    const iconMatches = r.icon === expectedIcon;
    const barMatches = r.bar === expectedBar;
    const isGlyph = /material/i.test(r.iconFont ?? "");
    // ☠️ `boxShadow` is NEVER the literal string "none" once Tailwind's shadow
    // vars are in play — `dark:shadow-none` sets them to a fully TRANSPARENT
    // shadow instead, so a `!== "none"` test reports every dark card as having
    // an edge it does not have. Measured: all 32 dark readings are
    // "rgba(0, 0, 0, 0) 0px 0px 0px 0px" x3. Detect a shadow by whether any
    // layer has a non-zero alpha.
    const shadowLayers = (r.cardShadow ?? "").match(/rgba?\([^)]*\)[^,]*/g) ?? [];
    const hasShadow = shadowLayers.some((layer) => {
      const rgba = parseRgb(layer);
      const alpha = layer.match(/rgba\([^)]*,\s*([\d.]+)\s*\)/)?.[1];
      const opaque = alpha === undefined ? Boolean(rgba) : Number(alpha) > 0;
      // A zero-geometry layer paints nothing even at full alpha.
      const geometry = layer.replace(/rgba?\([^)]*\)/, "").match(/[\d.]+px/g) ?? [];
      const paints = geometry.some((v) => parseFloat(v) > 0);
      return opaque && paints;
    });
    const hasBorder = parseFloat(r.cardBorderWidth ?? "0") > 0;

    lines.push(
      `\n${r.style} / ${scheme} / ${r.surface} / ${r.tone}`,
      `    icon  ${r.icon}  ${iconMatches ? "== token" : `!= token (${expectedIcon}) <<< MISMATCH`}  ratio ${iconRatio.toFixed(2)}  glyph=${isGlyph}  font=${r.iconFont}`,
      `    bar   ${r.bar}  ${barMatches ? "== token" : `!= token (${expectedBar}) <<< MISMATCH`}  ratio ${barRatio.toFixed(2)}`,
      `    card  ${r.card}  over ${r.under}  edge ratio ${edgeRatio.toFixed(2)}  shadow=${r.cardShadow}  border=${r.cardBorderWidth}`,
      `    title ${r.title}   x ${r.x}  (muted token ${r.tokMutedForeground})`,
    );

    if (!iconMatches)
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: icon colour is ${r.icon}, token says ${expectedIcon}`,
      );
    if (!barMatches)
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: bar colour is ${r.bar}, token says ${expectedBar}`,
      );
    if (!isGlyph)
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: icon is not a MaterialIcons glyph (font ${r.iconFont})`,
      );
    if (iconRatio < AA_MARK)
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: icon ${iconRatio.toFixed(2)} < ${AA_MARK}`,
      );
    if (barRatio < AA_MARK)
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: bar ${barRatio.toFixed(2)} < ${AA_MARK}`,
      );
    if (!hasShadow && !hasBorder) {
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.tone}: NO EDGE — no border, no shadow; card/under separation is ${edgeRatio.toFixed(2)}`,
      );
    }
  }
}

lines.push(`\n########## PROBLEMS ##########`);
lines.push(problems.length ? problems.join("\n") : "none");
console.log(lines.join("\n"));

const { writeFileSync } = await import("node:fs");
writeFileSync(`${OUT}/proto-1149-readings.txt`, lines.join("\n"));
console.log(`\nwrote ${OUT}/proto-1149-readings.txt, proto-1149-light.png, proto-1149-dark.png`);
