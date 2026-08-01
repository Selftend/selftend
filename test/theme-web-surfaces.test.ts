import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
const indexHtml = readFileSync(join(ROOT, "public", "index.html"), "utf8");
const appConfig = readFileSync(join(ROOT, "app.config.ts"), "utf8");
const manifest = readFileSync(join(ROOT, "public", "manifest.webmanifest"), "utf8");

/**
 * The page-background map inlined in the first-paint script. It has to be
 * literals — public/index.html is copied verbatim, with no build step that could
 * inject them — so this parses the copy back out and pins it to the palettes.
 */
function inlinedPages(): Record<string, [string, string]> {
  const block = indexHtml.match(/var PAGE = \{([\s\S]*?)\};/)?.[1];
  if (!block) throw new Error("Could not find the PAGE map in public/index.html");
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
    const headers = readFileSync(join(ROOT, "public", "_headers"), "utf8");

    expect(script.length).toBeGreaterThan(0);
    expect(headers).toContain(`'sha256-${digest}'`);
    // The weaker fix that must not creep back in.
    expect(headers).not.toContain("script-src 'self' 'unsafe-inline'");
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
