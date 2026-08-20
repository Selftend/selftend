// THROWAWAY — verifies the ONE thing the #1149 capture must not get wrong:
// whether NativeWind's `dark:` variant is actually active on the probe page.
//
// tailwind.config.js sets darkMode: "class", so `dark:shadow-none` compiles to a
// descendant selector under `.dark`. If that class never lands, the dark column
// renders the LIGHT shadow — which is precisely how #1145 overstated the edge of
// the variant it chose. Reading `boxShadow` and believing it is not enough; the
// selector has to be proven to exist and to match.
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "8349";
const URL = `http://localhost:${PORT}/proto-1149-accent`;

for (const scheme of ["light", "dark"]) {
  const browser = await chromium.launch();
  // Drive the app's OWN colour-scheme mechanism (prefers-color-scheme ->
  // useColorSchemeDriver -> NativeWind) rather than hand-writing the class.
  // Hand-writing it does not survive: NativeWind owns documentElement.classList
  // and strips anything its own state does not agree with, which is why the
  // first attempt measured a light shadow in the dark column.
  const page = await browser.newPage({
    viewport: { width: 900, height: 1400 },
    colorScheme: scheme,
  });
  await page.addInitScript((s) => {
    globalThis.__PROTO_SCHEME__ = s;
  }, scheme);

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector('[data-testid="proto-1149"]', { timeout: 240000 });
  await page.waitForTimeout(1500);

  const report = await page.evaluate(() => {
    const html = document.documentElement;
    const card = document.querySelector('[data-testid="quiet-lilac-onbg-success-card"]');

    // Does any stylesheet rule actually mention a .dark-scoped shadow-none?
    let darkShadowRules = 0;
    let sampleRule = null;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin
      }
      for (const rule of Array.from(rules ?? [])) {
        const text = rule.cssText ?? "";
        if (text.includes(".dark") && /box-shadow/i.test(text)) {
          darkShadowRules += 1;
          if (!sampleRule) sampleRule = text.slice(0, 300);
        }
      }
    }

    // The decisive test: does the card element MATCH a `.dark ...` selector at
    // all? `matches` answers for the live cascade, not for the class string.
    const classList = card ? Array.from(card.classList) : [];
    return {
      htmlClasses: Array.from(html.classList),
      bodyClasses: Array.from(document.body.classList),
      cardFound: Boolean(card),
      cardClasses: classList,
      cardShadow: card ? getComputedStyle(card).boxShadow : null,
      cardInsideDark: card ? Boolean(card.closest(".dark")) : null,
      darkShadowRules,
      sampleRule,
      // Any element anywhere carrying the dark class.
      anyDarkEl: document.querySelectorAll(".dark").length,
    };
  });

  console.log(`\n===== ${scheme} =====`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
