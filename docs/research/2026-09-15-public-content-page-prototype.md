# A public content page in the static export - prototype findings

**Ticket:** [#2404](https://github.com/Selftend/selftend/issues/2404), on the map [#2398](https://github.com/Selftend/selftend/issues/2398).
**Branch:** `prototype/public-content-page` (never merged; this file and the two screenshots are the artefact).
**Date:** 2026-09-15. Base: `origin/dev` at `9ca84482`.

The page prototyped is the CBT explainer "Thinking patterns" - the richest of the five [#2403](https://github.com/Selftend/selftend/issues/2403) decided (two framework cards plus seventeen patterns), and the one whose existing subline already reads as a lede.

## What was built

| File                                          | Change                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/cbt/thinking-patterns-body.tsx` | **New.** The one source: the cards the learn screen rendered, moved verbatim, chrome-free (no header, no escape, no scroll view, no head).           |
| `app/(app)/modules/cbt/learn.tsx`             | Keeps its chrome (`ScreenHeader`, subline, scroll view); renders the body.                                                                           |
| `app/cbt.tsx`                                 | **New.** Flat public route. `PolicyPageLayout` (title = `cbt:learn.title`, description and subline = `cbt:learn.description`) → the body → a footer. |
| `scripts/lib/index-list.js`                   | One row: `"/cbt"`.                                                                                                                                   |
| `test/index-list.test.ts`                     | One line: `"/cbt"` in the literal list the "eight routes" assertion holds.                                                                           |
| `scripts/lib/index-list.test.js`              | Two lines: `cbt.html` in the export fixture and `/cbt` in the expected sitemap (found by the pre-commit hook, see § 5).                              |

Nothing else moved. No new i18n key. The footer is `CrisisSupportBar` plus one `LinkButton` to `/` labelled with an existing string (`navigation:home.widgets.launcher.signedOutCta`, "Open Selftend").

## The seven questions

### 1. Where the route lives

`app/cbt.tsx` - a flat file at the top of the tree, outside `(app)`, exactly where the seven policy routes sit. No group exemption, no change to the group structure. `test/index-list.test.ts`'s depth rule (`file.split("/")` has length 2) holds without change, so the flat-route constraint [#2403](https://github.com/Selftend/selftend/issues/2403) raised is a constraint the build simply obeys, not one it has to relax.

⚠️ **The route name is the one string the page carries that is not an app string.** The prototype used `/cbt` because [#2403](https://github.com/Selftend/selftend/issues/2403) named it, but the page is titled "Thinking patterns", not "CBT": a route named for the module carrying one explainer of the module reads oddly the moment a second CBT explainer exists. Assembly picks the naming rule (module or content); the prototype proves nothing about which.

### 2. Reuse the gated screen, or its own component?

**Neither, and both.** The content is one chrome-free body component; the gated route and the public route are two renderers around it. The gated screen is byte-for-byte what it was (its test, `cbt-learn-screen.test.tsx`, passes untouched, so the extraction is a pure move). The public page gets the public chrome for free from `PolicyPageLayout`.

The ticket's warning - one component serving two audiences, the safe shape a required prop, never a default - turned out not to need a prop at all: the audiences differ in chrome, and the body has no chrome. If the two renderers ever need the body itself to differ, the difference is a required prop on the body; the prototype leaves that door closed rather than open-by-default.

### 3. Does it render at export?

**Yes.** `dist/cbt.html` is 50,092 bytes (`faq.html`: 53,884). The file holds the H1, the subline, both framework cards, all seventeen pattern titles with their descriptions and prompts, the crisis bar label and the footer link. Zero occurrences of the loading state.

The `SessionProvider` seed [#2293](https://github.com/Selftend/selftend/issues/2293) worried about is not even in play: the page reads no session, so nothing on it can be a spinner. A public explainer is the easiest case the exporter has.

### 4. Does it hydrate clean?

**Yes, as far as a local production bundle can show.** Served by `expo serve` from the pruned export, loaded in Chromium via Playwright: the console holds exactly three entries, all the `[env]` notices of a build with no local env file (no Supabase URL, no contact addresses, no public app URL). No React hydration error, recoverable or fatal. After hydration: `<html lang="en">`, `globalThis.__EXPO_ROUTER_HYDRATE__ === true`, `theme-color` `#f4f2f8`.

Not measured, reasoned instead:

- **Signed-in visitor.** Could not be exercised locally (no Supabase env, so no session). Structurally: the route is outside `(app)`, and the only route that redirects a signed-in visitor is `app/index.tsx`. `/faq` is the same shape and has served both audiences since v0.19.0.
- **Dark-mode visitor.** The `useIsHydrated` fix from [#2293](https://github.com/Selftend/selftend/issues/2293) is site-wide; nothing on this page reads `matchMedia`, the UA or storage during the hydration render.
- **Production CSP.** The exporter's second inline script (the hydrate flag) is already hashed in `public/_headers` since [#2293](https://github.com/Selftend/selftend/issues/2293); this page carries the same script, byte for byte, as `faq.html`.

### 5. What it costs the export

| Measure                         | Before | With `/cbt`                                                     |
| ------------------------------- | ------ | --------------------------------------------------------------- |
| HTML files `expo export` writes | 303    | **304** (a flat route writes ONE file - no group-stripped twin) |
| Files kept by the prune         | 9      | **10** (nine routes + `404.html`)                               |
| Files deleted                   | 293    | 294                                                             |
| Changes to `applyIndexList`     | -      | **none**                                                        |
| Changes to the sitemap writer   | -      | **none** - `/cbt` is the ninth `<loc>` from the same array      |

One row in `INDEX_LIST` is the whole machinery cost. What the row drags with it, per page:

- `test/index-list.test.ts`: the literal list in "holds the eight routes the spec's § 3 table names" (and that test's title).
- ☠️ `scripts/lib/index-list.test.js`: a SECOND pin the focused run missed and the pre-commit hook caught - its export fixture lists the eight files by name and its sitemap assertion the eight URLs, so a ninth route fails seven of its tests until the fixture and the expected list both gain a row. Three places know the count, not one.
- `docs/indexability.md`: the § 3 membership table and the § 4.1 head table.
- `src/features/policies/policy-heading-outline.test.tsx`: the new page should join it (see finding A below).
- i18n: **zero new keys for this page** - the H1 is `learn.title`, the subline `learn.description`, already `en` + `bg`. A page that needs a lede (ACT) adds two keys.

### 6. What the `<head>` carries

Complete, and identical in shape to `faq.html`, from the two strings plus the path - `RouteHead` inside `PolicyPageLayout` did it, no route code involved:

```html
<title data-rh="true">Thinking patterns - Selftend</title>
<meta
  data-rh="true"
  name="description"
  content="Short explanations of the common thinking patterns to watch for. Sometimes called cognitive distortions. Naming the pattern makes an automatic thought easier to challenge and let go."
/>
<meta data-rh="true" property="og:type" content="website" />
<meta data-rh="true" property="og:site_name" content="Selftend" />
<meta data-rh="true" property="og:title" content="Thinking patterns - Selftend" />
<meta data-rh="true" property="og:description" content="Short explanations of …" />
<meta data-rh="true" property="og:url" content="https://selftend.org/cbt" />
<link data-rh="true" rel="canonical" href="https://selftend.org/cbt" />
```

`og:image`, its dimensions and alt, `og:locale` and `twitter:card` are inherited from `SiteHead` as on every page. **No structured-data block**: the one-surface gate `test/structured-data-surface.test.ts` passed unchanged, which is the proof the page carries none. Whether it should is [#2405](https://github.com/Selftend/selftend/issues/2405)'s question; the gate's allowlist is where that answer lands.

### 7. What it looks like

- Desktop, 1280 px: [`2026-09-15-public-content-page-prototype-desktop.png`](./2026-09-15-public-content-page-prototype-desktop.png)
- Phone, 390 px: [`2026-09-15-public-content-page-prototype-phone.png`](./2026-09-15-public-content-page-prototype-phone.png)

Both are the first viewport a visitor sees: the site header (logo link home, account menu), the Escape arrow, the H1, the subline, "Use gently", "How much, and how", the first patterns - and the cookie banner covering the bottom of the viewport on a first visit, as on every page. ⚠️ Playwright's "full page" capture stops at the viewport because the root reset sets `body { overflow: hidden }` and the `ScrollView` is the scrolling element; a longer capture needs the scroll container screenshotted, not the page.

The page wears exactly the chrome `/faq` wears. Two things about that chrome are worth the owner's eye:

- **The Escape arrow** ("Back to Home") sits above the H1. For a signed-in person it leads Home; for a stranger who arrived from a search result it leads to the landing. Every policy page does the same today, so this is not new - but this is the first page a stranger is _meant_ to arrive at cold.
- **The account menu** in the header offers sign-in to a stranger. Quiet, and already the policy pages' behaviour.

## Findings beyond the questions

**A. ☠️ The outline is h1 → 19 × h3, with no h2.** `CardTitle` defaults to level 3; the learn screen has always rendered h1 → h3 _inside the app_, and moving the cards verbatim moved the outline with them. `PolicySectionCards` passes `aria-level={2}` for exactly this reason, and `/security` shipped h1 → h3 once before ([#2133](https://github.com/Selftend/selftend/issues/2133)). The build passes level 2 on the public page's cards (a `level` on the body, or the public renderer wrapping), and adds the page to `policy-heading-outline.test.tsx` so it cannot drift back.

**B. ☠️ The crisis footer is a button, not a link.** `CrisisSupportBar` is a `Pressable` with `onPress` → `usePushWithOrigin("/crisis")`. The exported HTML holds **no `href="/crisis"`**; the hydrated page's anchors are two links to `/` (the header logo and the footer). So ruling 6 of [#2403](https://github.com/Selftend/selftend/issues/2403) - one route to `/crisis` on every public page - is, as built here, invisible to a crawler, to middle-click and to "copy link". The build uses `LinkButton href="/crisis"` (a real `<a>`, as `LandingFooter` does), not the bar. This also matters to [#2411](https://github.com/Selftend/selftend/issues/2411): a button is not an edge in the link graph.

**C. `/cbt` is an orphan, like `/security`.** Nothing links to it - not the landing, not the FAQ. Discovery today would be the sitemap alone, which is the state the baseline ([#2402](https://github.com/Selftend/selftend/issues/2402)) found seven of eight pages stuck in. [#2411](https://github.com/Selftend/selftend/issues/2411) owns this; the prototype only makes the gap concrete.

**D. Ruling 6 reaches further than the five pages.** "Every public page, in a fixed footer" includes the seven existing routes, none of which carries a crisis footer today (`/faq` has crisis guidance inline; the landing footer has a crisis link). If the ruling means what it says, the footer belongs in `PolicyPageLayout` and lands on all twelve pages at once; if it means the five explainers, it belongs in the public renderer. Assembly ([#2406](https://github.com/Selftend/selftend/issues/2406)) says which.

**E. [#2403](https://github.com/Selftend/selftend/issues/2403)'s table says "12 patterns"; the content has 17.** `cbt:distortions` holds seventeen keys and the page renders all seventeen. Assembly corrects the count.

**F. The footer's app link borrowed a widget string.** "Open Selftend" is `navigation:home.widgets.launcher.signedOutCta`, the home-screen widget launcher's call to action. It is an existing string, so the motive test is satisfied, but it is not obviously the string the footer wants. Assembly picks; the constraint is only that it already exists.

**G. Locale is where the copy lives, not the constants.** `src/constants/distortions.ts` carries US-spelt fallbacks ("Catastrophizing"); the rendered page reads the `en` locale ("Catastrophising"). Nothing to change; noted so nobody "fixes" the constants.

## The shape the build must take

1. **Per page:** one chrome-free body in the module's feature folder, rendered by the existing gated route (chrome untouched) and by a new flat `app/<route>.tsx` through `PolicyPageLayout` with `title` = the app's existing title and `description` = the existing subline or the new lede. Cards at heading level 2.
2. **Once:** a public-page footer that is a real link to `/crisis` plus one quiet link into the app, placed per finding D.
3. **Per page, the machinery:** one `INDEX_LIST` row; one line in the index-list test's literal; two lines in the JS test's fixture and expected list; two rows in `docs/indexability.md` (§ 3, § 4.1); one entry in the outline test. Zero new keys unless the page needs a lede.
4. **Nothing in `applyIndexList`, the sitemap writer, `SiteHead`, `RouteHead` or `+html.tsx` changes.** They were built for exactly this, and the prototype touched none of them.

## Verification record

- Jest, focused: `index-list`, `cbt-learn-screen`, `structured-data-surface`, `positioning-copy`, `i18n-key-coverage`, `locale-parity`, `policy-heading-outline` - 7 suites, 162 tests, all green.
- `tsc --noEmit --pretty false` exit 0; ESLint and Prettier clean on the five changed files.
- `npm run export:web` exit 0: `kept 10 HTML files (…, cbt.html, 404.html), deleted 294, wrote sitemap.xml`.
- Served with `expo serve --port 8097`; `/cbt` → 200, 50,102 bytes.
- Reproduction traps: Playwright's MCP can only write under the worktree (the screenshots therefore live beside this file); the export regenerates `.expo/types`, and the typecheck still passed here.
