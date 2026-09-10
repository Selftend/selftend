import type { PropsWithChildren } from "react";

/**
 * The web document, rendered in Node once per route at `expo export`
 * (`web.output = "static"`, #2293). This replaced `public/index.html`, which
 * Expo copied verbatim under the `single` output; everything that file carried
 * is here, and the exported `dist/*.html` files are this document around each
 * route's server-rendered body.
 *
 * What is NOT here, deliberately:
 *
 * - No `lang` on `<html>`. The root layout's `<Head>` is the sole owner
 *   (`docs/indexability.md` § 4.4): Helmet writes `lang` into the exported file
 *   and swaps it to the visitor's language after hydration. Setting it here as
 *   well yields a duplicate attribute.
 * - No title, description or `og:*` tags. Helmet APPENDS to this document
 *   rather than replacing its tags, so any copy here would sit beside the
 *   route's own. The site constants live in the root layout's `<Head>`; the
 *   per-route tags in each screen's.
 * - No `<noscript>` notice. The body is now the rendered page, so a visitor
 *   without JavaScript reads the page instead of an apology.
 */

/**
 * ☠️ FROZEN TEXT. The production CSP (`public/_headers`) allows this inline
 * script by its SHA-256 hash, and `test/theme-web-surfaces.test.ts` recomputes
 * that hash from the rendered shell. A single changed byte - including the
 * comment inside it, which still describes the old `single` output - blocks the
 * script in production while every local check passes. Change the script and
 * the `_headers` hash together, or not at all.
 *
 * The backticks in the comment are escaped for the template literal; the test
 * hashes the rendered output, where they are plain backticks again.
 */
const FIRST_PAINT_SCRIPT = `
      /*
       * First paint follows the stored palette (#584).
       *
       * The bundle cannot do this: the browser paints this document before any
       * JS module runs, so a returning user on \`deep-field\` would see a flash of
       * quiet-lilac's lilac page before the app root applied its tokens. Inline
       * and synchronous is the whole point - a deferred or external script is
       * already too late.
       *
       * The page backgrounds are duplicated here as literals because this file
       * has no build step that could inject them (\`web.output = "single"\`, and
       * public/ is copied verbatim). test/theme-web-surfaces.test.ts pins every
       * value to THEME_HEXES, so the copy cannot drift from the palettes.
       *
       * Reads the same two unprefixed localStorage keys AsyncStorage writes on
       * web - see src/stores/style-store.ts.
       */
      (function () {
        var PAGE = {
          "quiet-lilac": ["#f4f2f8", "#15121c"],
          "ink-ivory": ["#fafafa", "#121316"],
          atlas: ["#f7f4ee", "#1f1b14"],
          "deep-field": ["#eef1f6", "#0d1221"],
          "sage-garden": ["#f2f5f0", "#202720"],
          "plum-manuscript": ["#f7f5fa", "#221a2e"],
          "amber-noir": ["#f7f5ed", "#131211"],
          glacier: ["#f1f5f9", "#101a23"],
        };
        try {
          var stored = window.localStorage.getItem("selftend:style");
          var appearance = window.localStorage.getItem("selftend:theme");
          var prefersDark =
            window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
          // "system" and anything unrecognised follow the device, matching the
          // theme store's own resolution rule.
          var dark = appearance === "dark" || (appearance !== "light" && prefersDark);
          var page = (PAGE[stored] || PAGE["quiet-lilac"])[dark ? 1 : 0];
          document.documentElement.style.backgroundColor = page;
          var meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute("content", page);
        } catch (error) {
          /* Storage can throw outright (private mode, blocked cookies). The
             static values above are already a correct default, so there is
             nothing to recover - never let a palette stop the app booting. */
        }
      })();
    `;

/**
 * The `react-native-web` recommended root reset
 * (https://necolas.github.io/react-native-web/docs/setup/#root-element),
 * carried over from the old shell. `expo-router/html` ships a
 * `ScrollViewStyleReset` with the same id, but its rules drop `flex: 1` on
 * `#root`; this is the block the app has always laid out against.
 */
const ROOT_RESET_STYLE = `
      /* These styles make the body full-height */
      html,
      body {
        height: 100%;
      }
      /* These styles disable body scrolling if you are using <ScrollView> */
      body {
        overflow: hidden;
      }
      /* These styles make the root element full-height */
      #root {
        display: flex;
        height: 100%;
        flex: 1;
      }
    `;

export default function Root({ children }: PropsWithChildren) {
  return (
    // `prefix` declares the Open Graph RDFa vocabulary every exported page's
    // `og:*` tags use (https://ogp.me/ - "og: https://ogp.me/ns#"). It is also
    // load-bearing for `lang`: the exporter splices Helmet's `<html>` attributes
    // in by string, matching the literal `<html ` WITH its trailing space, so an
    // `<html>` with no attribute of its own never receives them and the root
    // layout's `<html lang>` would silently never reach the file. (Expo's
    // default document gets the space from a hardcoded `lang="en"` - and a
    // duplicate `lang` attribute with it.)
    // eslint-disable-next-line react/no-unknown-property -- RDFa's `prefix` is a real HTML attribute the rule's list lacks; React passes it through
    <html prefix="og: https://ogp.me/ns#">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* quiet-lilac's light page. Overwritten by the first-paint script
            when a palette or a dark preference is stored; this static value is
            what a first-ever visitor sees. Pinned to THEME_HEXES by
            test/theme-web-surfaces.test.ts. */}
        <meta name="theme-color" content="#f4f2f8" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/favicon-512.png" />
        <script dangerouslySetInnerHTML={{ __html: FIRST_PAINT_SCRIPT }} />
        <style id="expo-reset" dangerouslySetInnerHTML={{ __html: ROOT_RESET_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
