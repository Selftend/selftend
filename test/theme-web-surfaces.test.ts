import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Root from "@/app/+html";
import { THEME_HEXES } from "@/lib/theme";
import { COLOR_SCHEMES } from "@/src/lib/theme/contract";
import { DEFAULT_STYLE, STYLE_NAMES } from "@/src/lib/theme/styles";

// Which surfaces follow the selected palette, and which are pinned (#584).
//
//   FOLLOWS   the web first paint and the HTML shell's theme-color
//   PINNED    the native splash, the PWA manifest icons, the widget
//   OUT OF    email templates (no palette can reach them)
//   REACH
//
// The pinned ones are not "not done yet" — each is pinned for a reason, and the
// second half of this suite is what stops a future change quietly wiring one to
// the style axis. A user on a non-default palette therefore always sees a
// quiet-lilac splash; that is accepted, and the splash is kept minimal and brief
// so the mismatch reads as a background colour rather than a broken frame.

const ROOT = join(__dirname, "..");
// The web document as the static export writes it (#2293): `app/+html.tsx`
// rendered in Node, exactly as `expo export` renders it around every route.
// Rendered rather than read as source so the assertions below - and above all
// the CSP hash - are over the bytes a browser receives, not over a template
// literal whose escaping the test would otherwise have to undo.
const indexHtml = renderToStaticMarkup(
  createElement(Root, null, createElement("div", { id: "root" })),
);
const appConfig = readFileSync(join(ROOT, "app.config.ts"), "utf8");
const manifest = readFileSync(join(ROOT, "public", "manifest.webmanifest"), "utf8");

/**
 * The one-line hydration flag the static export writes into every page. Its
 * text is expo-router's, not ours, so it is pinned here as the literal the
 * exporter emits (#2293).
 */
const HYDRATE_FLAG = "globalThis.__EXPO_ROUTER_HYDRATE__=true;";

/**
 * The `script-src` directive as `public/_headers` actually ships it, split into
 * its tokens.
 *
 * ☠️ Parsed, rather than substring-matched, because a substring match cannot
 * see what has been ADDED. Cloudflare Web Analytics sat configured on the
 * selftend.org zone for eight weeks (2026-07-18 → 2026-09-10), set to
 * auto-inject a beacon into every page, while the shipped privacy promise said
 * Selftend uses no analytics tracking services — so that promise was literally
 * false for the period, broken by a vendor dashboard setting nobody in this
 * repository ever touched (#2316, ADR-0007).
 *
 * This policy is the guard that would have made such an injection inert
 * whatever the dashboard said: it is in the repo, deterministic in CI, and
 * effective independently of the vendor. ⚠️ And it has to stay that way —
 * Cloudflare re-enabled Web Analytics by default for free domains once already
 * (2025-10-15), so "we turned it off" is not a durable state.
 *
 * ☠️ The assertions here used to be a denylist — `toContain(hash)` twice plus a
 * single `not.toContain("script-src 'self' 'unsafe-inline'")` — and
 * `script-src 'self' https://static.cloudflareinsights.com 'sha256-…' 'sha256-…'`
 * passed all three. So the token set is compared EXACTLY below: a host, a
 * scheme source (`https:`, `data:`) or any `'unsafe-*'` fails, whatever it is
 * and however it is spelled.
 *
 * It throws rather than returning `[]`: if the file is reorganised past this
 * parse, every assertion built on it would otherwise go vacuously green while
 * still looking covered.
 */
function scriptSrcTokens(): string[] {
  const headers = readFileSync(join(ROOT, "public", "_headers"), "utf8");
  const policies = [...headers.matchAll(/^\s*Content-Security-Policy:[ \t]*(.+)$/gm)].map(
    (match) => match[1],
  );
  if (policies.length !== 1) {
    throw new Error(
      `Expected exactly one Content-Security-Policy line in public/_headers, found ${policies.length}`,
    );
  }

  const scriptSrc = policies[0]
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => /^script-src(\s|$)/.test(directive));
  if (scriptSrc.length !== 1) {
    throw new Error(
      `Expected exactly one script-src directive in the CSP, found ${scriptSrc.length}`,
    );
  }

  return scriptSrc[0].split(/\s+/).slice(1);
}

/**
 * The page-background map inlined in the first-paint script. It has to be
 * literals — the script runs before any module and nothing can inject a value
 * into it — so this parses the copy back out and pins it to the palettes.
 */
function inlinedPages(): Record<string, [string, string]> {
  const block = indexHtml.match(/var PAGE = \{([\s\S]*?)\};/)?.[1];
  if (!block) throw new Error("Could not find the PAGE map in the rendered app/+html.tsx");
  const pages: Record<string, [string, string]> = {};
  for (const [, quoted, bare, light, dark] of block.matchAll(
    /(?:"([a-z-]+)"|([a-z-]+))\s*:\s*\["(#[0-9a-f]{6})",\s*"(#[0-9a-f]{6})"\]/g,
  )) {
    pages[quoted ?? bare] = [light, dark];
  }
  return pages;
}

describe("the web first paint follows the selected palette", () => {
  const pages = inlinedPages();

  it("inlines a page colour for every palette, and no stragglers", () => {
    expect(Object.keys(pages).sort()).toEqual([...STYLE_NAMES].sort());
  });

  it.each(STYLE_NAMES)("%s's inlined page matches its resolved --background", (style) => {
    expect(pages[style]).toEqual([
      THEME_HEXES[style].light["--background"],
      THEME_HEXES[style].dark["--background"],
    ]);
  });

  // The static value a first-ever visitor sees, before the script has anything
  // stored to read. It was a stray sage green (#5b6b52) belonging to no palette.
  it("the static theme-color is the default palette's light page", () => {
    const content = indexHtml.match(/<meta name="theme-color" content="(#[0-9a-f]{6})"/)?.[1];

    expect(content).toBe(THEME_HEXES[DEFAULT_STYLE].light["--background"]);
  });

  // Inline and synchronous or it is pointless: the browser paints this document
  // before any module runs, so a deferred or external script would land after
  // the flash it exists to prevent.
  it("the first-paint script is inline and blocking", () => {
    const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

    expect(script).toContain("selftend:style");
    expect(script).toContain("selftend:theme");
    expect(indexHtml).not.toMatch(/<script[^>]+\b(defer|async)\b/);
    expect(indexHtml).not.toMatch(/<script[^>]+src=/);
  });

  // It reads the same two unprefixed keys AsyncStorage writes on web. A rename
  // on either side would silently reinstate the flash, which nothing else
  // notices because the app still resolves the right palette a tick later.
  it("reads the keys the stores actually write", () => {
    const themeStore = readFileSync(join(ROOT, "src", "stores", "theme-store.ts"), "utf8");
    const styleStore = readFileSync(join(ROOT, "src", "stores", "style-store.ts"), "utf8");

    expect(themeStore).toContain('"selftend:theme"');
    expect(styleStore).toContain('"selftend:style"');
  });

  // The trap this nearly shipped into. The production CSP is `script-src
  // 'self'`, which blocks inline scripts outright — the first-paint fix would
  // have been silently dropped in production while passing every local check,
  // because a blocked script leaves no trace in the DOM and the app still
  // resolves the right palette a tick later. Weakening the policy with
  // 'unsafe-inline' would trade a flash for an XSS surface, so the script is
  // allowed by HASH instead.
  //
  // The hash is recomputed from the file here rather than trusted: editing the
  // script without updating _headers must fail CI, not disable the fix on
  // deploy.
  it("is allowed by the production CSP, by a hash that matches the script", () => {
    const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
    const digest = createHash("sha256").update(script, "utf8").digest("base64");

    expect(script.length).toBeGreaterThan(0);
    expect(scriptSrcTokens()).toContain(`'sha256-${digest}'`);
  });

  // The static export writes a second inline script into every page - the
  // one-line hydration flag - and the same CSP has to allow it, or production
  // refuses it and the app mounts with createRoot instead of hydrateRoot:
  // every prerendered page thrown away and rendered again from scratch, with
  // no error anywhere (measured on #2293). Its text is expo-router's, not
  // ours, so a different literal after an expo-router upgrade fails this test
  // rather than hydration.
  it("also allows the static export's hydration flag, by hash", () => {
    const digest = createHash("sha256").update(HYDRATE_FLAG, "utf8").digest("base64");

    expect(scriptSrcTokens()).toContain(`'sha256-${digest}'`);
  });

  // ☠️ The two tests above are presence checks, and presence is the half that
  // cannot catch a beacon. They are kept because each names a distinct cause of
  // drift - edit the palette script, or upgrade expo-router - and a precise
  // failure message is worth having. This one is the guard that stops the
  // policy being WIDENED: see scriptSrcTokens() for why, and for the eight
  // weeks a vendor dashboard spent contradicting the privacy promise.
  //
  // Set equality strictly subsumes the `not.toContain("script-src 'self'
  // 'unsafe-inline'")` line this replaced: a set that is exactly {'self', two
  // hashes} cannot contain 'unsafe-inline' under any spelling, including the
  // ones that old substring missed ('unsafe-eval', or 'unsafe-inline' written
  // after a hash rather than immediately after 'self').
  it("allows exactly 'self' and those two hashes - nothing else", () => {
    const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script.length).toBeGreaterThan(0);

    const paletteHash = createHash("sha256").update(script, "utf8").digest("base64");
    const hydrateHash = createHash("sha256").update(HYDRATE_FLAG, "utf8").digest("base64");

    expect([...scriptSrcTokens()].sort()).toEqual(
      [`'self'`, `'sha256-${paletteHash}'`, `'sha256-${hydrateHash}'`].sort(),
    );
  });

  // "system" is the default preference, so the overwhelmingly common path is
  // the one with nothing stored on either key.
  it("falls back to the default palette and the device scheme", () => {
    const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

    expect(script).toContain('PAGE["quiet-lilac"]');
    expect(script).toContain("prefers-color-scheme: dark");
  });
});

describe("the pinned surfaces stay pinned", () => {
  // app.config.ts runs at build time, long before a device has a stored palette,
  // so a splash that followed the style is not merely undesirable - it is
  // unreachable. This asserts nobody tries.
  it("the native splash is literal colour, not a style lookup", () => {
    expect(appConfig).toMatch(/backgroundColor: "#[0-9a-f]{6}"/);
    for (const name of [
      "THEME_HEXES",
      "STYLE_NAMES",
      "THEME_TOKENS",
      "useStyleName",
      "styleName",
    ]) {
      expect(appConfig).not.toContain(name);
    }
  });

  it("the PWA manifest colours are literal, not style-derived", () => {
    const parsed = JSON.parse(manifest) as Record<string, unknown>;

    for (const key of ["background_color", "theme_color"]) {
      if (parsed[key] !== undefined) {
        expect(parsed[key]).toMatch(/^#[0-9a-f]{3,8}$/i);
      }
    }
    expect(manifest).not.toContain("selftend:style");
  });

  // #563: iOS fires an unsuppressable system alert on every icon change, so
  // browsing palettes would mean a modal per tap. Ruled out - and the ruling is
  // enforced here rather than remembered, because the package that would enable
  // it is a single `npm i` away.
  it("no native launcher-icon switching is added", () => {
    const packageJson = readFileSync(join(ROOT, "package.json"), "utf8");

    expect(packageJson).not.toContain("alternate-app-icons");
    expect(appConfig).not.toContain("alternateIcons");
  });

  // The widget renders in the OS's process from a snapshot; it has no access to
  // the app's tokens at all, which is why it carries its own pinned palette.
  it("the widget keeps its own pinned palette", () => {
    const palette = readFileSync(join(ROOT, "src", "features", "widgets", "palette.ts"), "utf8");

    expect(palette).not.toContain("useStyleName");
    expect(palette).not.toContain("THEME_HEXES");
  });
});

describe("the favicon is deliberately pinned", () => {
  // #584 asks the favicon to follow the palette. It does not, and this is a
  // decision rather than an omission: the mark exists only as a full-colour
  // 2048px raster (assets/branding/selftend-icon-source-2048.png). A PNG cannot
  // be re-tinted at runtime, so "follows the style" would mean authoring a
  // monochrome vector silhouette of the mark - new brand artwork, which is an
  // owner call and not a side effect of a theming ticket.
  //
  // Unpinning it later needs exactly one thing: an SVG silhouette. At that point
  // the favicon can be a data-URI tinted with --primary, and this test becomes
  // the place to invert.
  it("still ships the branded raster icons", () => {
    expect(indexHtml).toContain('href="/favicon-512.png"');
  });

  it.each(COLOR_SCHEMES)("is not wired to the %s palette", () => {
    expect(indexHtml).not.toMatch(/rel="icon"[^>]*data:image\/svg/);
  });
});
