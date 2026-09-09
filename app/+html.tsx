import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * PROTOTYPE (#2286, candidate B): the static-export root document, carrying
 * what `public/index.html` carries today. Runs in Node at export, once per
 * route; no DOM here. Per-route tags (title, description, og:*) come from
 * `<Head>` in the screens and are spliced in by the export.
 */

// Verbatim from public/index.html; the CSP hash in public/_headers is over this text.
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

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#f4f2f8" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/favicon-512.png" />
        <script dangerouslySetInnerHTML={{ __html: FIRST_PAINT_SCRIPT }} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{height:100%}body{overflow:hidden}#root{display:flex;height:100%;flex:1}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
