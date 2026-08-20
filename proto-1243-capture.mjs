// PROTOTYPE — throwaway, never merged to main. Drives app/proto-1243-border.tsx
// for #1243: captures the three-variant comparison and prints the RENDERED
// boundary table.
//
// Usage: start the web dev server on a port NOTHING ELSE is using
//   npx expo start --web --port 8343
// then
//   node proto-1243-capture.mjs <out-dir> <port>
//
// ☠️ Parallel agent sessions run their own Metro on 8081 and upwards. A capture
// pointed at a port you did not start renders SOMEONE ELSE'S worktree — check
// the port is free first rather than trusting a 200.
//
// What this measures that #1238's arithmetic could not:
//
//   1. That `border-border` actually ARRIVES on the card once `border-0` is
//      removed — i.e. that `cn`/tailwind-merge lets Card's default border
//      through rather than the toast's other classes eating it. Arithmetic over
//      THEME_TOKENS assumes the class lands; only a render proves it.
//   2. The rendered border-vs-card and border-vs-under ratios, to cross-check
//      #1238's token arithmetic (border over card: 1.26-2.01 dark). #1149's
//      whole lesson was that the two methods must be made to agree.
//   3. That variant A in dark really has NO edge — read off `boxShadow` and
//      `borderTopWidth`, not assumed from the class string.
//
// ☠️ `boxShadow` is NEVER the literal string "none" once Tailwind's shadow vars
// are in play — `dark:shadow-none` sets a fully TRANSPARENT shadow instead, so a
// `!== "none"` test reports every dark card as having an edge it does not have.
// Detect a shadow by non-zero alpha AND non-zero geometry. (#1149.)

import { chromium } from "playwright";

const OUT = process.argv[2] ?? ".";
const PORT = process.argv[3] ?? "8343";
const URL = `http://localhost:${PORT}/proto-1243-border`;

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

const VARIANTS = [
  { key: "A", bar: true, border: false },
  { key: "B", bar: true, border: true },
  { key: "C", bar: false, border: true },
];

function parseRgb(value) {
  const nums = value?.match(/[\d.]+/g);
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

function paintsShadow(boxShadow) {
  const layers = (boxShadow ?? "").match(/rgba?\([^)]*\)[^,]*/g) ?? [];
  return layers.some((layer) => {
    const alpha = layer.match(/rgba\([^)]*,\s*([\d.]+)\s*\)/)?.[1];
    const opaque = alpha === undefined ? Boolean(parseRgb(layer)) : Number(alpha) > 0;
    const geometry = (layer.replace(/rgba?\([^)]*\)/, "").match(/[\d.]+px/g) ?? []).map(parseFloat);
    return opaque && geometry.some((v) => v > 0);
  });
}

async function measure(scheme) {
  const browser = await chromium.launch();
  // ☠️ RN-web renders ScrollView as a fixed-height scrollable div, so `fullPage`
  // captures only the viewport slice. The viewport has to hold everything.
  const page = await browser.newPage({
    viewport: { width: 1200, height: 4800 },
    deviceScaleFactor: 1,
    // ☠️ Both halves of the scheme move together and only ONE is ours to set.
    // See the route's header — driving prefers-color-scheme runs the app's real
    // useColorSchemeDriver, which sets the `dark` class itself.
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

  await page.waitForSelector('[data-testid="proto-1243"]', { timeout: 240000 });

  // The precondition, asserted rather than assumed. A dark run whose `dark`
  // class never landed silently measures the LIGHT shadow and reports an edge
  // the app does not paint — the failure this probe exists to avoid.
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

  const readings = await page.evaluate(
    ({ styles, variants }) => {
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
          for (const v of variants) {
            const under = get(`${style}-${surface}-${v.key}-under`);
            for (const tone of ["success", "error"]) {
              const p = `${style}-${surface}-${v.key}-${tone}`;
              const card = get(`${p}-card`);
              const bar = get(`${p}-bar`);
              const icon = get(`${p}-icon`);
              if (!card || !under || !icon) {
                out.push({ style, surface, variant: v.key, tone, missing: true });
                continue;
              }
              const cs = getComputedStyle(card);
              out.push({
                style,
                surface,
                variant: v.key,
                tone,
                barExpected: v.bar,
                borderExpected: v.border,
                barPresent: Boolean(bar),
                under: getComputedStyle(under).backgroundColor,
                card: cs.backgroundColor,
                cardShadow: cs.boxShadow,
                borderWidth: cs.borderTopWidth,
                borderColor: cs.borderTopColor,
                bar: bar ? getComputedStyle(bar).backgroundColor : null,
                icon: getComputedStyle(icon).color,
                tokBorder: resolveToken(card, "--border"),
                tokCard: resolveToken(card, "--card"),
                tokBackground: resolveToken(card, "--background"),
              });
            }
          }
        }
      }
      return out;
    },
    { styles: STYLES, variants: VARIANTS },
  );

  await page.screenshot({ path: `${OUT}/proto-1243-${scheme}.png`, fullPage: true });
  await browser.close();
  return readings;
}

const lines = [];
const problems = [];
const summary = { light: {}, dark: {} };

for (const scheme of ["light", "dark"]) {
  console.log(`measuring ${scheme}…`);
  const readings = await measure(scheme);
  lines.push(`\n########## ${scheme.toUpperCase()} ##########`);

  for (const r of readings) {
    if (r.missing) {
      problems.push(`${scheme} ${r.style} ${r.surface} ${r.variant} ${r.tone}: NODES MISSING`);
      continue;
    }

    const under = parseRgb(r.under);
    const card = parseRgb(r.card);
    const border = parseRgb(r.borderColor);
    const hasBorder = parseFloat(r.borderWidth ?? "0") > 0;
    const hasShadow = paintsShadow(r.cardShadow);

    const edge = contrast(card, under);
    const borderVsCard = hasBorder && border ? contrast(border, card) : null;
    const borderVsUnder = hasBorder && border ? contrast(border, under) : null;

    lines.push(
      `\n${r.style} / ${scheme} / ${r.surface} / ${r.variant} / ${r.tone}`,
      `    card ${r.card} over ${r.under}  surface-only edge ${edge.toFixed(2)}`,
      `    border width=${r.borderWidth} colour=${r.borderColor} (token ${r.tokBorder}) ` +
        `vs card ${borderVsCard ? borderVsCard.toFixed(2) : "n/a"}  vs under ${borderVsUnder ? borderVsUnder.toFixed(2) : "n/a"}`,
      `    shadow paints=${hasShadow}  raw=${r.cardShadow}`,
      `    bar present=${r.barPresent} (expected ${r.barExpected}) colour=${r.bar}`,
    );

    // The axes are the experiment: if a variant does not actually differ in the
    // way it claims, every judgement made by looking at it is void.
    if (r.barPresent !== r.barExpected) {
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.variant} ${r.tone}: bar present=${r.barPresent}, expected ${r.barExpected}`,
      );
    }
    if (hasBorder !== r.borderExpected) {
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.variant} ${r.tone}: border width ${r.borderWidth} — expected border=${r.borderExpected}. ` +
          `If B/C have no border, Card's default was eaten by tailwind-merge and the #1238 ruling does not express as a deletion.`,
      );
    }
    if (r.borderExpected && border && r.borderColor !== r.tokBorder) {
      problems.push(
        `${scheme} ${r.style} ${r.surface} ${r.variant} ${r.tone}: border is ${r.borderColor}, --border token says ${r.tokBorder}`,
      );
    }
    // Variant A in dark is the #1149 finding, re-proved here as the control.
    if (r.variant === "A" && scheme === "dark" && (hasBorder || hasShadow)) {
      problems.push(
        `${scheme} ${r.style} ${r.surface} A ${r.tone}: control variant HAS an edge (border=${hasBorder} shadow=${hasShadow}) — it should have none`,
      );
    }

    if (borderVsCard !== null) {
      const bucket = (summary[scheme][`${r.variant}-borderVsCard`] ??= []);
      bucket.push(borderVsCard);
      const bucket2 = (summary[scheme][`${r.variant}-borderVsUnder`] ??= []);
      bucket2.push(borderVsUnder);
    }
    const eb = (summary[scheme][`${r.variant}-${r.surface}-surfaceEdge`] ??= []);
    eb.push(edge);
  }
}

lines.push(`\n########## RANGES ##########`);
for (const scheme of ["light", "dark"]) {
  for (const [key, values] of Object.entries(summary[scheme])) {
    const lo = Math.min(...values).toFixed(2);
    const hi = Math.max(...values).toFixed(2);
    lines.push(`${scheme.padEnd(6)} ${key.padEnd(28)} ${lo} – ${hi}   (n=${values.length})`);
  }
}

lines.push(`\n########## PROBLEMS ##########`);
lines.push(problems.length ? problems.join("\n") : "none");
console.log(lines.join("\n"));

const { writeFileSync } = await import("node:fs");
writeFileSync(`${OUT}/proto-1243-readings.txt`, lines.join("\n"));
console.log(`\nwrote ${OUT}/proto-1243-readings.txt, proto-1243-light.png, proto-1243-dark.png`);
