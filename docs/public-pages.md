# Public pages spec - what selftend.org publishes, how its pages link, and what its markup may claim

**Status:** **Decided spec, not built.** Assembled 2026-09-15 from wayfinder map [#2398](https://github.com/Selftend/selftend/issues/2398) on its last ticket, [#2406](https://github.com/Selftend/selftend/issues/2406). Every section links the ticket whose resolution comment holds the full reasoning and the owner's ruling. Nine tickets decided it: [#2399](https://github.com/Selftend/selftend/issues/2399) the carve-out, [#2403](https://github.com/Selftend/selftend/issues/2403) the page set, [#2405](https://github.com/Selftend/selftend/issues/2405) structured data, [#2411](https://github.com/Selftend/selftend/issues/2411) internal linking, [#2406](https://github.com/Selftend/selftend/issues/2406) this assembly; two research tickets fed them ([#2400](https://github.com/Selftend/selftend/issues/2400) sitelinks, [#2401](https://github.com/Selftend/selftend/issues/2401) knowledge panels), one task measured the ground ([#2402](https://github.com/Selftend/selftend/issues/2402)) and one prototype proved the mechanism ([#2404](https://github.com/Selftend/selftend/issues/2404)). Their findings live on throwaway `research/*` and `prototype/*` branches that are **never merged**; the branch name is the citation. The marketing-plan amendment this map owes is **applied in the same change as this file** ([marketing-plan.md](marketing-plan.md) § 4, square 3 and § 6, from [#2399](https://github.com/Selftend/selftend/issues/2399)).

**The word:** this spec is bounded by **motive**, not by the artifact. A standing surface is kept **readable**, never **pursued**, and what tells the two apart when the artifact is identical either way is _the reason the artifact exists_ - [marketing-plan.md](marketing-plan.md) § 4, square 3, _The motive test_. Nothing here is chosen for a query.

This file extends [indexability.md](indexability.md); it does not re-open it. That spec's §§ 2-6 are **as built**, released as v0.19.0 on 2026-09-10.

---

## 0. What this spec is, and how to read it

- **A decided spec, not a proposal.** Four owner rulings were taken while charting the map (its body, _Owner rulings at charting_: the brand-query carve-out is the door, on-site only, public pages from content the app already has are on the table, the destination is a spec plus the plan amendment) and the tickets above ruled the rest with the owner.
- **Where this file and a resolution comment disagree, the comment wins and this file has a defect** - with one exception: Appendix A lists the premises this assembly found wrong and the corrections [#2406](https://github.com/Selftend/selftend/issues/2406) ruled, and there the appendix wins.
- **Written against `origin/dev` on 2026-09-15.** Line numbers are not quoted; file paths, i18n keys and the production HTML were verified that day.
- **One rule and one test.** The test is the plan's and is quoted here only by reference; the rule is this spec's own:
  - **The motive test** - remove every search engine from the world; does this page, page set, string or property still exist and still read the same way? If not, the difference is pursuit ([marketing-plan.md](marketing-plan.md) § 4, square 3).
  - **A link to a public page is labelled with that page's H1** - the anchor text is never chosen, only inherited (§ 6).

---

## 1. What a search for Selftend shows today, and what this spec changes

Measured once and dated on [#2402](https://github.com/Selftend/selftend/issues/2402) (2026-09-15; the table is on branch `research/brand-result-baseline`, `docs/research/2026-09-15-brand-result-baseline.md`, never merged and never edited), and the link graph on [#2411](https://github.com/Selftend/selftend/issues/2411) the same day, read from the HTML production serves rather than from the source.

| Surface                          | 2026-09-15                                                                                                                                                                             | After this spec                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Google, public routes indexed    | **1 of 8** - only `/`, crawled 14 Sept. The other seven are "Discovered – currently not indexed", queued via the sitemap and **never crawled**                                         | the same eight plus two, each reachable from every other page; indexing stays Google's to decide                                           |
| Internal links a crawler can see | a **star with no rim**: `/` links five siblings; the other seven carry exactly one anchor each, the header brand mark. `/security` and `/account-deletion` are linked from **nothing** | every public page one click from every other, from one shared footer                                                                       |
| Orphans                          | two, confirmed by Search Console's "Referring page: None detected"                                                                                                                     | none, by construction - the footer's pin is derived from the index list (§ 7)                                                              |
| Anchor text                      | five labels; one disagrees with its destination's H1 ("FAQ" → _Common questions_)                                                                                                      | every label is its destination's H1                                                                                                        |
| Landmarks                        | no `<nav>`, `<footer>`, `<header>` or `<main>` on any page                                                                                                                             | the footer renders as `<footer>` containing a `<nav>`                                                                                      |
| Brand SERP                       | #1 with the v0.19.0 title and a body-text snippet; **no sitelinks**, no knowledge panel, no `#rhs`                                                                                     | **unchanged, and not a target** - sitelinks are not requestable and never were ([#2400](https://github.com/Selftend/selftend/issues/2400)) |
| AI Overview                      | fails to generate signed out; renders **in Bulgarian** signed in, citing Play and `selftend.org` in an order that flips per generation                                                 | unchanged; structured data is documented not to be a lever there (§ 11)                                                                    |
| Bing                             | still the **pre-release** title; a parked `www.selftend.com` sits at #2                                                                                                                | unchanged by this spec; Bing reads the same static export                                                                                  |
| Structured data                  | 1 `WebSite` + 1 `Organization`, 0 errors, Rich Results Test "no items" (expected)                                                                                                      | two truthful properties added, everything else refused with a reason (§ 5)                                                                 |
| Public pages carrying content    | **none** - seven of the eight routes are policy, FAQ or crisis pages                                                                                                                   | two explainer pages; three more deferred behind a product gate (§ 3)                                                                       |

☠️ **"More pages would help" is not an argument this spec may make, and the baseline is why.** Seven of eight routes are already queued and uncrawled. Adding pages does not move that number, and [#2400](https://github.com/Selftend/selftend/issues/2400) found **Google documents no page-count threshold of any kind** for sitelinks. Every page in § 3 stands on what it is _for_.

---

## 2. The carve-out, and the test that polices it

Decided on [#2399](https://github.com/Selftend/selftend/issues/2399) (owner, 2026-09-15). **The carve-out grants nothing.** It is a jurisdiction line, not a permission.

The plan's `readable` was read as forbidding new pages. Its **definition** is one clause - _"the surface tells its crawler truthfully what each page already says"_. The words _"writes no new copy and creates no page"_ sit in a sentence **describing what the shipped indexability spec did**, and were ruled **descriptive, not binding**. A page built from content the app already holds never collided with `readable` in the first place.

**Scoped to motive** - not to the brand query (nobody controls which query surfaces a page) and not to the surface (that would license everything the site does). There is **no third category noun**: `readable` and `pursuit` remain the only two, and the test is named instead, matching the plan's habit (_the admission test_, _the sizing test_).

The full text of _The motive test_, what it permits and what it refuses, is in [marketing-plan.md](marketing-plan.md) § 4, square 3. Two of its clauses do load-bearing work in this file and are repeated here because a reader of this spec needs them:

- **A page set can be pursued by its membership while every page in it passes alone.** If removing the search consideration changes which pages are in the set, the set is written to rank. ⚠️ **This is why § 3's deferral is not a breach**: the three pages leave for a product reason with no search content in it, so removing the search consideration changes nothing about the set.
- **Judging a published page by its search result is refused.** It is an _after_-rule, and the counterfactual structurally cannot catch it: drift leaves no mark on the artifact. § 9 is written to obey it - no per-page reading joins any sitting.

⚠️ **Motive is invisible in the finished artifact, so each page records why it exists** beside it in the index list (§ 3). A **convention, not a merge gate**, said plainly so nobody later mistakes it for enforcement.

---

## 3. The page set

Decided on [#2403](https://github.com/Selftend/selftend/issues/2403) (owner, 2026-09-15), and **cut from five pages to two by [#2406](https://github.com/Selftend/selftend/issues/2406)** (below).

### 3.1 The principle, which outlives the list

> **Content the app already holds may go public when it exists to _explain a concept to someone who does not know it yet_. Content a person _operates_ - a form, a record, a log, a session - stays behind the gate. The test is what the content is for, not which screen it sits on.**

Instruments (thought records, check-ins, journal, habit logs, mood, sleep) fail the motive test: a stranger cannot use one without an account, so a public copy would exist only to be found. Explainers pass directly. The point the owner accepted: **today you must create an account to read what cognitive distortions are.**

**The boundary is content, not route.** ACT has no `learn` screen at all - its principles and pillars are explanations rendered as cards on the module home - and a route-first reading would have silently dropped a whole module.

**Audience is a public good**, anyone who wants to understand the idea; never a conversion page. **Content lives in both places** - the in-app screen is untouched. ⚠️ That is a deliberate **departure** from the carve-out's Appendix A.1 precedent, where _"only their home moves"_; said here rather than implied, because the precedent was not followed.

### 3.2 What ships

Two pages, both built from content that is already fully translated in `en` and `bg`, and both needing **zero new keys**:

| Route         | Title (= H1 = `<title>` = anchor text)                      | Source                                               | Description                       | Why it exists                                                                                                            |
| ------------- | ----------------------------------------------------------- | ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/meditation` | **Meditation** (`meditation.module.home.title`)             | `meditation.module.learn` - three explanatory pieces | `meditation.module.home.subtitle` | someone who has heard of meditation and wants to know what the practice actually involves can read it without an account |
| `/habits`     | **Habit building - core ideas** (`habits.learn.indexTitle`) | `habits.learn.cards` - ten cards                     | `habits.learn.indexSubtitle`      | the ideas behind habit formation are general knowledge, useful whether or not the reader ever installs anything          |

☠️ **Meditation's title is not its learn screen's title**, and this is a ruling, not a slip. `meditation.module.learn.title` is **"Learn the framework"** - an in-app instruction that names no subject once it leaves its module, and as a footer label beside "Habit building - core ideas" it would be the one entry telling a reader nothing. The page takes the module's own name, `meditation.module.home.title`, **an existing app string**, so no new copy is written. [#2399](https://github.com/Selftend/selftend/issues/2399) independently permits _"a title written for legibility rather than lifted from the page's H1, where a constraint makes the H1 unreadable in place"_. ⚠️ This is a **different case** from the retitling [#2403](https://github.com/Selftend/selftend/issues/2403) refused: that one added keyword text to an already-legible title ("Thinking patterns" → "Cognitive distortions: common thinking patterns"); this one replaces an instruction that is unreadable out of context. **The general rule: where a learn screen's title is an instruction rather than a name, the page takes the module's name.**

**Framing is lede only, and neither page needs one.** Titles stay as the app has them. Both pages already carry an existing description string, so the retitling door stays closed and the lede door is never opened.

### 3.3 What is deferred, and the trigger that returns it

☠️☠️ **CBT _Thinking patterns_, DBT _What DBT is_ and ACT are deferred - not cancelled - because all three modules were gated 111 seconds before [#2403](https://github.com/Selftend/selftend/issues/2403) ruled them in.**

[#2446](https://github.com/Selftend/selftend/issues/2446) (closed 16:06:29Z) ruled **CBT, ACT and DBT _gated_**: _"live in the code and **kept off the production surfaces** until it clears a stated bar… **never announced**"_, with module work frozen while gated. [#2403](https://github.com/Selftend/selftend/issues/2403) closed at 16:08:20Z, from a concurrent session that did not have that ruling. **A public page on `selftend.org` is a production surface**, and a footer link on every page plus a landing card pointing at it is an announcement.

**The trigger that reopens each page: its module clears the readiness bar** - one user-test sitting for that module, findings built ([#2446](https://github.com/Selftend/selftend/issues/2446)). Each page returns on its own module's bar; there is no all-three gate. Nothing else about the page changes when it returns - the source content, the title rule and the footer slot are decided here and wait.

⚠️ **Meditation and habits are tools, not modules**, and are outside the gating entirely: [#2446](https://github.com/Selftend/selftend/issues/2446)'s three are CBT, ACT and DBT by name, [#2447](https://github.com/Selftend/selftend/issues/2447) keeps the tools (_"everyday tools for right now"_), and both live under `app/(app)/tools/`, not `app/(app)/modules/`.

⚠️ **Deferred with them:** [#2411](https://github.com/Selftend/selftend/issues/2411) § 9, the landing's CBT and ACT cards linking to their explainers. The targets do not exist while the modules are gated. Whether those cards survive the third reposition at all is [#2445](https://github.com/Selftend/selftend/issues/2445)'s business, not this spec's.

☠️ **The nine-page-per-tool set was refused** at charting and stays refused: nine pages each named for a thing a person could want is the sitelinks shape, which is a page written to rank.

### 3.4 The index list gains a column

Every row of [indexability.md](indexability.md) § 3's table gains **the reason the page exists** - [#2399](https://github.com/Selftend/selftend/issues/2399)'s convention for making motive legible. A convention, not a merge gate.

---

## 4. How a public content page is built

Prototyped and measured on [#2404](https://github.com/Selftend/selftend/issues/2404) (branch `prototype/public-content-page`, `docs/research/2026-09-15-public-content-page-prototype.md`). **The machinery carries it unchanged.**

- **A flat `app/<name>.tsx` through `PolicyPageLayout`**, plus one chrome-free body component shared with the gated screen. The prototype's gated learn-screen test passed untouched - a pure move - and the two-audiences problem needed **no prop at all**.
- ☠️☠️ **A public route must be flat.** `test/index-list.test.ts` asserts `expect(file.split("/")).toHaveLength(2)` - _"a directory route would need a file-name rule the list does not have"_. `app/learn/meditation.tsx` **fails the existing suite**. Hence `/meditation` and `/habits`, not `/learn/meditation`. Neither collides: the gated screens are `/tools/meditation` and `/tools/habits`.
- **The export carries it**: 303 → 304 files for one page, 10 kept; the head is complete from `RouteHead`; hydration is clean.
- ☠️ **One `INDEX_LIST` row drags three test pins, not one**: `test/index-list.test.ts`'s literal, and `scripts/lib/index-list.test.js`'s **fixture _and_ its expected sitemap**. A focused jest run missed the JS file on the prototype; the pre-commit hook caught it with seven red.
- ☠️ **`CrisisSupportBar` is a `Pressable` with no `href`**, so [#2403](https://github.com/Selftend/selftend/issues/2403)'s crisis ruling is **invisible to a crawler** as built. The public footer uses `LinkButton href="/crisis"` (§ 6).
- ☠️ **The heading outline is h1 → h3**, because `CardTitle` defaults to level 3. Pass level 2 and add the page to `policy-heading-outline.test.tsx`.
- The route sits outside `(app)`, so it must render with **no session**.

---

## 5. What the structured data may say

Decided on [#2405](https://github.com/Selftend/selftend/issues/2405) (owner, 2026-09-15). **Two properties in; everything else refused with a reason.**

☠️☠️ **Read this first: [indexability.md](indexability.md) § 5's stated win is inert, on both counts.** That section says _"no rich result is expected; the win is the logo and site-name association"_. [#2401](https://github.com/Selftend/selftend/issues/2401) killed both - the `logo` effect only selects _which_ logo inside a knowledge panel **that cannot be created on-site at all**, and the site name still renders as the bare domain `selftend.org` **while every documented on-site input is already correct**. This is **not** a reason to delete the block: it is truthful, free, parses with 0 errors and Bing reads it. It is the reason **no property may ever be justified by expected effect here. Truth is the only currency.**

**Added to `WebSite`:**

- **`isAccessibleForFree: true`** - the landing visibly renders _"Free · Open source · Private"_ and _"No ads, no subscriptions"_. ⚠️ Honest scope note: on `WebSite` this says _the site's content_ is free, which is narrower than what the landing says about the product. The stronger claim would need `SoftwareApplication`, still refused.
- **`inLanguage`** - ☠️☠️ **derived from `i18n.language`, never hardcoded `"en"`.** [indexability.md](indexability.md) § 4.4 already rules _"English in the file, the visitor's language after hydration"_ for this block, so a hardcoded value is **false in the DOM** for a Bulgarian visitor - on a block whose entire justification is that it cannot disagree with its page. The test wants a case proving it _follows_ the language.

**Refused, each with the reason, so nobody re-derives them:**

| Property                                    | Why refused                                                                                                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `knowsAbout`                                | keyword-chosen copy in structured-data clothing - the clearest motive-test failure on the list                                                                                                                                     |
| `foundingDate`                              | no page displays a date; the only defensible value is the first commit (2026-04-15), a fact about a **repository**, not an organisation - and it would sit three lines from a `nonprofitStatus` refused for having no legal entity |
| `alternateName`                             | [#2401](https://github.com/Selftend/selftend/issues/2401) proved every on-site input is **already correct**, so it would change nothing                                                                                            |
| `slogan`, `publishingPrinciples`, `license` | none is displayed on any page                                                                                                                                                                                                      |
| `BreadcrumbList`                            | refused on **truthfulness**: § 4's flat-route rule leaves no hierarchy beyond "Home > Meditation", and [#2400](https://github.com/Selftend/selftend/issues/2400) found breadcrumbs are **never connected to sitelinks**            |

**The new pages stay bare.** `test/structured-data-surface.test.ts` - a source-grepping gate hardcoding the two files allowed to name the type - is **unedited**.

**Neither effect-based refusal is re-opened.** `FAQPage` and `SoftwareApplication` stay refused, and their **justification is upgraded**: from _"the rich result went away"_ to _"no documented reader acts on them and nothing truthful is gained"_. ⚠️ This matters because the old wording implies the refusal **expires if Google reinstates the feature**. It does not. `SoftwareApplication` also drags in `applicationCategory`, a **category noun**, which [positioning.md](positioning.md) refuses.

**The pinning rule holds and widens to every page carrying a block**: it may only restate strings its own page renders. ⭐ It is what excluded two properties the owner had first selected. _A test can pin a string and cannot pin a judgement._

---

## 6. Internal linking and anchor text

Decided on [#2411](https://github.com/Selftend/selftend/issues/2411) (owner, 2026-09-15). **[#2400](https://github.com/Selftend/selftend/issues/2400) found internal linking is the one documented sitelinks signal this project had never decided** - which is exactly why the framing below is written down before the mechanism.

### 6.1 The framing - navigability for a person

**This section acts under navigability for a person, and says so in those words.** The motive test, applied: remove every search engine - does a person on `/privacy` still want a way to `/security`, and a person landing cold on any policy page still want the rest of the site? Yes, and today six of the seven non-landing pages give that person exactly one way out, the brand mark. Every public page is a page someone reaches **with no session** - from a store listing, a Reddit thread, a shared link; the FAQ's only known referrer is a GitHub issue. The linking is owed to that reader. Search benefit is **noticed, never counted**.

**The refused framing, named so nobody re-derives it:** _link the pages so Google sees a logical structure._ That is structure chosen for the feature and fails the motive test outright.

**The test recorded beside the decision: no link in the set exists that a signed-out reader on that page would not want.**

### 6.2 One shared footer, listing every public page

Every public page carries **the same footer**, and the footer lists **every public page**. Every page is therefore one click from every other and from `/`, by construction.

Refused: _hub only_ (the landing links everything, each page links only home - today's shape with the orphans patched; a cold-landed reader still has to visit the hub) and _hub plus siblings_ (needs a per-page judgement of "family", the same shape [#2403](https://github.com/Selftend/selftend/issues/2403) refused for the crisis footer - the safest-looking page is where it gets dropped).

**One `SiteFooter` component**, rendered by `PolicyPageLayout` for every non-landing public page **and by the landing in place of its current footer**. Two footers is how they drift. It carries, in this order: the safety description, the crisis row, the nav list, the social links (Discord, Reddit, YouTube - the same _where else Selftend lives_ fact on every page, kept everywhere rather than landing-only).

☠️ **This settles [#2404](https://github.com/Selftend/selftend/issues/2404)'s open finding D:** the crisis footer's footprint is **every public page**, because it rides on the one footer.

### 6.3 The anchor-text rule

**A link to a public page is labelled with that page's H1** - the same string its `<title>` and `<h1>` already carry ([indexability.md](indexability.md) § 4's title = H1 invariant). Concise and descriptive fall out of that invariant for free; no new copy is written; a new page arrives with its anchor text already decided and already in both locales. **Consequence: the landing's "FAQ" becomes "Common questions".**

Two things stay outside the rule, on purpose:

- the **brand mark** ("Selftend" → `/`) - the site's name, not a page title;
- the **crisis row** - [#2403](https://github.com/Selftend/selftend/issues/2403) ruling 6's own element, which keeps its imperative "Open crisis guidance" (`common:safety.openCrisis`) because it is an affordance, not a table of contents.

### 6.4 What the footer lists, and what it does not

- **`/crisis` appears once.** The crisis row _is_ the site's link to it; the nav list omits it. The pin asserts the footer as a whole, so the crisis row satisfies it and cannot be dropped without the test going red.
- **`/` is not listed.** The header's brand mark already links it on every page. The explainer pages' quiet route into the app **is** that brand mark: the prototype's borrowed "Open Selftend" string is **dropped**, because a second entry beside the brand mark is a call to action wearing a footer, which [#2403](https://github.com/Selftend/selftend/issues/2403) refused. ☠️ **This settles [#2404](https://github.com/Selftend/selftend/issues/2404)'s open finding F.**
- **Order and grouping: two rows, no headings, index-list order.** Explainers first (what a cold reader came for), policies second (what a site must carry); the order carries the grouping. The only candidate heading strings were written for another surface, and a heading is new copy the list does not need. **The index list is reordered once, when the explainer pages ship**, into the same order, so the sitemap and the footer read the same sequence and the pin compares ordered arrays rather than sets.

### 6.5 A button to a route becomes a link

☠️☠️ **A `Pressable` to a route is not an edge in the link graph, however it behaves for a mouse.** Measured on production: `/privacy` has a button to `/security` and `/security` one back, and **both are invisible to a crawler**, which is why those two pages are orphans. The same is true of the gated Legal screen's five buttons and of `CrisisSupportBar`.

**A button whose target is a route is a link by nature** - middle-click, "copy link", a screen reader and a crawler all agree - so `/privacy` → `/security`, `/security` → `/privacy` and the crisis bar on any public renderer become **real anchors**. This reaches any future button on a public page whose target is a route. The Escape-origin behaviour the two in-body buttons carry today is a **build detail, not a decision**: the build keeps origin recording on the anchor, or documents why it drops it.

⚠️ **Out of scope, and it is a decision rather than an omission**: the **Escape** (`ScreenEscape`) and the **breadcrumb trail** (`ScreenBreadcrumb`) are `Pressable`s calling `router.replace` / `router.push`, and stay that way. They are core chrome for the whole gated app with their own enforcement gate and rulings about determinism; changing them is a large, risky change for a handful of public pages, and the footer gives those pages their links instead. **Recorded here so nobody later reads this spec and assumes the breadcrumb is a crawler-visible link** - the fact has now been rediscovered twice.

### 6.6 Landmarks

**For the footer only:** on web it renders as a `<footer>` containing a `<nav>` for the link list (react-native-web `role`). It is accessibility - a screen-reader user can jump to it - and it is what the element is. **Nothing else on any page changes its element.**

---

## 7. Tests - what pins each piece

| Piece                                | Today                                                                                                   | After the build                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The footer ↔ the index list          | -                                                                                                       | **new**: a render-level test asserting the footer's `href`s equal `INDEX_LIST` minus `/`, **in list order**, importing the list from `scripts/lib/index-list.js`. A route added to the list fails the footer test until the footer knows it, so **a future route cannot land orphaned**. ☠️ A source grep was **refused**: it matches a string, not an edge |
| The route → anchor-key map           | -                                                                                                       | **new**, in the same test: the map's keys equal the index list, so a new route cannot arrive without a label                                                                                                                                                                                                                                                |
| The index list ↔ the route tree      | `test/index-list.test.ts` pins the eight routes as a literal                                            | **two rows added**, and the literal, `scripts/lib/index-list.test.js`'s **fixture** and its **expected sitemap** all change together (§ 4)                                                                                                                                                                                                                  |
| Document title = on-page H1          | `PolicyPageLayout` test                                                                                 | unchanged - the two new pages inherit it, which is what makes the anchor rule free                                                                                                                                                                                                                                                                          |
| The heading outline                  | `policy-heading-outline.test.tsx`                                                                       | the two new pages join it; `CardTitle` gets level 2 (§ 4)                                                                                                                                                                                                                                                                                                   |
| The structured-data block            | pins `Organization.description` = the rendered meta description; the block appears in `index.html` only | **`inLanguage` gains a case proving it follows `i18n.language`** rather than being hardcoded (§ 5)                                                                                                                                                                                                                                                          |
| The one-surface structured-data gate | `test/structured-data-surface.test.ts`                                                                  | **unedited** - the new pages carry no block                                                                                                                                                                                                                                                                                                                 |
| Both locales                         | `test/i18n-key-coverage.test.ts`, `src/i18n/locale-parity.test.ts`                                      | unchanged, and **not exercised**: the build adds **zero new keys**                                                                                                                                                                                                                                                                                          |
| The copy gate                        | `test/positioning-copy.test.ts`                                                                         | unchanged - no new strings reach a declaring surface                                                                                                                                                                                                                                                                                                        |

---

## 8. Documents the build touches

- **This file** - Status flips to as-built, section by section, as the slices land.
- [indexability.md](indexability.md) - § 3's table gains the two routes, the new order and the _why it exists_ column (§ 3.4); § 5 gains the two properties, the restated refusal reasons and the widened pinning sentence; § 7 lists the new pins. **Three corrections land with it**, independent of the build - Appendix A items 4, 5 and 7.
- [marketing-plan.md](marketing-plan.md) - **applied in this change**: _The motive test_ under square 3, the readable/pursuit clause, the § 6 row's reason cell, and the 2026-12-10 sitting's coverage line (§ 9).
- [docs/README.md](README.md) - this file indexed; ☠️ and `indexability.md`'s entry corrected, which still reads _"(decided, not built)"_ although §§ 2-6 shipped in v0.19.0 (Appendix A.6).
- [CONTEXT.md](../CONTEXT.md) § _The public website_ - two terms the map minted: **the motive test** and **explainer page**.
- `README.md` - only if a setup command changes; none is expected.

**No architecture-rule filing is owed.** The two routes are new paths on an existing domain, not a new domain, service, provider or credential; no control-tower issue and no `inventory.md` edit.

---

## 9. Instruments, and what the 2026-12-10 sitting reads

**No new instrument, no second reading duty, and no paid tier.** Google Search Console and the Ahrefs Site Audit already read the site from outside; neither adds a script.

The sitting gains **exactly one coverage line**, and the existing one is corrected:

- **Corrected:** the liveness re-check reads _"does the site still index, **all of the index list**"_ - [#2289](https://github.com/Selftend/selftend/issues/2289) ruling 7 wrote _"eight of eight"_, a count this spec changes. The new wording stays true whatever the list holds.
- **Added:** **_no route on the index list reports "Referring page: None detected"_** in Search Console's URL Inspection - a reading of whether the structure shipped.

☠️ **Neither is a verdict on a page, and that is load-bearing.** [#2399](https://github.com/Selftend/selftend/issues/2399) refuses judging a published page by its search result, so impressions, position, CTR, per-page rows and sitelinks **stay off the sitting**. A page missing is a build defect for a GitHub issue, never a channel question.

⚠️ **A SERP reading is not reproducible unless sign-in state and locale are recorded with it** ([#2400](https://github.com/Selftend/selftend/issues/2400), [#2402](https://github.com/Selftend/selftend/issues/2402)): the AI Overview failed to generate signed out and rendered in Bulgarian signed in.

The standing-surface entry for `selftend.org` in [marketing-plan.md](marketing-plan.md) square 3 is refreshed to the 2026-09-15 reading in this change.

---

## 10. The build, in dependency order

For `/to-tickets`. The order is the dependency order, not a schedule; items with no dependency stated are independent.

1. **`SiteFooter`, and the pin** - the component (safety description, crisis row via `LinkButton href="/crisis"`, the nav list in two rows from a route → i18n-key map, the social links), rendered by `PolicyPageLayout` and by the landing **in place of** `LandingFooter`; `<footer>` + `<nav>` on web; the render-level test asserting `href`s = `INDEX_LIST` minus `/` in order, and the key map's keys = the list. "FAQ" → "Common questions" follows from the rule. **Depends on nothing, and on the existing eight pages it already fixes both orphans** (§ 6.2-6.4, § 6.6, § 7).
2. **The in-body buttons become anchors** - `app/privacy.tsx` → `/security`, `app/security.tsx` → `/privacy`. Origin recording kept, or its drop documented (§ 6.5). Independent of 1.
3. **The two public content pages** - flat `app/meditation.tsx` and `app/habits.tsx` through `PolicyPageLayout`, each with a chrome-free body shared with its gated screen; two `INDEX_LIST` rows **and the three pins that move with them**; `CardTitle` at level 2 and both pages added to `policy-heading-outline.test.tsx`; the index list reordered once into explainers-then-policies. **Zero new i18n keys.** Depends on 1 (the footer must know the routes, and its pin is derived from the list) (§ 3.2, § 4).
4. **The structured-data properties** - `isAccessibleForFree` and `inLanguage` on `WebSite`, `inLanguage` **derived from `i18n.language`**, with the test case proving it follows the language (§ 5). Independent of 1-3.
5. **Docs** - [indexability.md](indexability.md) § 3, § 5, § 7 and its corrections; this file's Status; `docs/README.md`'s two entries; `CONTEXT.md`'s two terms (§ 8). Lands with the release.
6. **The release**, then the sitting's two lines take effect on 2026-12-10 (§ 9). ⚠️ **Timing rule inherited from the plan** ([#2289](https://github.com/Selftend/selftend/issues/2289) ruling 8): a release of this kind lands **outside an open 8-week window**, never inside one.

---

## 11. Not in this spec, and where each thing went

**Deferred, with the trigger that reopens it** - none needs a new map when it fires:

- **The CBT, DBT and ACT explainer pages** - deferred on [#2406](https://github.com/Selftend/selftend/issues/2406) because their modules are gated. **Trigger: the module clears its readiness bar**, one user-test sitting with findings built ([#2446](https://github.com/Selftend/selftend/issues/2446)). Each returns on its own module's bar. Everything else about them is already decided in § 3 and waits (§ 3.3).
- **The landing's module cards linking to their explainers** ([#2411](https://github.com/Selftend/selftend/issues/2411) § 9) - same trigger; the targets do not exist meanwhile (§ 3.3).
- **Bulgarian URLs and `hreflang`** - unchanged from [indexability.md](indexability.md) § 11. English-only indexing is an owner ruling; Bulgarian stays preference-only on the same URLs. **Confirmed rather than assumed on [#2406](https://github.com/Selftend/selftend/issues/2406)**: both new pages' sources are already `en`+`bg`, and the build adds no key, so nothing here changes.
- **A real share image** - stays deferred in [indexability.md](indexability.md) § 11, where it already lives as an owner call on artwork. This spec does not move it.

**Out of scope of the map, recorded on it** - work beyond the destination, returning only as a fresh effort:

- **A knowledge panel.** ☠️ **No on-site-only path exists**, on four independent documented grounds: Google's policy is verbatim _"our current policy doesn't manually create or delete Knowledge Panels"_; "claim this knowledge panel" **only edits one that already exists**; Google Business Profile names our exact category - _"brands, organizations, artists, and other online-only businesses"_ - ineligible; and Selftend has **no registered legal entity at all**, so founders, a CEO and a founding date have no true values regardless of mechanism ([#2401](https://github.com/Selftend/selftend/issues/2401)).
- **Sitelinks as a target.** Not requestable, and never were - every control Google shipped was negative (block 2007 → demote 2011 → both removed) ([#2400](https://github.com/Selftend/selftend/issues/2400)).
- **A Wikidata item, a Wikipedia article, and any new social profile** - owner ruling 2 at charting: on-site only. ⚠️ A new social profile is a **new standing surface**, so [marketing-plan.md](marketing-plan.md)'s admission test governs it, not this spec.
- **How Selftend is described in generative answers** - closed by [#2405](https://github.com/Selftend/selftend/issues/2405): Google documents _"no special schema.org structured data that you need to add"_ for AI Overviews, and this map names no other mechanism. ⚠️ It closes as **structured data is not the lever**, not as _the question is settled_.
- **Link building and outreach**, **keyword-chosen copy**, and **any page written to rank** - [marketing-plan.md](marketing-plan.md) § 6, refused on principle.

---

## Appendix A - premises corrected while assembling

1. ☠️☠️ **"The five explainer pages can all ship."** Three of them draw on modules that [#2446](https://github.com/Selftend/selftend/issues/2446) gated **111 seconds before** [#2403](https://github.com/Selftend/selftend/issues/2403) ruled them in, from a concurrent session that did not have the ruling. A public page is a production surface. **Ruled on [#2406](https://github.com/Selftend/selftend/issues/2406):** two ship, three defer behind the readiness bar (§ 3.3). ⚠️ The map's own Notes predicted exactly this and named the tripwire; it fired.
2. ☠️ **"Titles stay as the app has them"** does not survive contact with the set. `meditation.module.learn.title` is **"Learn the framework"**, which names no subject outside its module and would be the one footer label saying nothing. **Ruled:** the page takes the module's name, an existing app string (§ 3.2).
3. ☠️ **"`habits.learn.title` is the habits page's title."** It **does not exist**. [#2403](https://github.com/Selftend/selftend/issues/2403) recorded the source as `habits.learn.cards`; the title key is **`habits.learn.indexTitle`** = "Habit building - core ideas".
4. ☠️ **"[indexability.md](indexability.md) § 5's win is the logo and site-name association."** Both halves are **inert** - the logo effect only picks which logo inside a panel that cannot be created, and the site name still renders as the bare domain with every on-site input already correct ([#2401](https://github.com/Selftend/selftend/issues/2401)). The block stays; the _justification_ changes to truthfulness alone (§ 5).
5. ☠️ **"The sitelinks search box was removed 2024-11-29."** That is the date Google removed the **documentation**. The **feature** was removed starting **2024-11-21**, announced **2024-10-21**. The `SearchAction` decision resting on it is unaffected ([#2400](https://github.com/Selftend/selftend/issues/2400)).
6. ☠️ **"`indexability.md` is decided, not built."** `docs/README.md` still says so; §§ 2-6 shipped in **v0.19.0 on 2026-09-10**. Corrected in this change.
7. ☠️ **"`readable` forbids new pages."** The words _"writes no new copy and creates no page"_ describe what the shipped spec did; the definition is one clause about telling a crawler the truth. **Descriptive, not binding** ([#2399](https://github.com/Selftend/selftend/issues/2399)) - and the same ambiguity existed in **two** places, the plan and `indexability.md`'s _The word_ line. Both are corrected in this change.
8. ☠️ **"The site needs more pages for sitelinks."** Google documents **no threshold of any kind** - no page count, site age, query volume or link metric. "Too small for sitelinks" is folklore ([#2400](https://github.com/Selftend/selftend/issues/2400)).
9. ☠️ **"The AI Overview is sourced from Google Play, not the site."** False as of 2026-09-15: it cites both, and the order flips per generation. The right-hand card in the original screenshot is the **AI Overview's own links card**, not a knowledge panel - the page has no `#rhs` ([#2400](https://github.com/Selftend/selftend/issues/2400), [#2402](https://github.com/Selftend/selftend/issues/2402)).
10. ☠️ **"A button to a route is a link."** Not to a crawler. `/privacy` and `/security` cross-link with `Pressable`s and are **both orphans** in Search Console ([#2411](https://github.com/Selftend/selftend/issues/2411)).
