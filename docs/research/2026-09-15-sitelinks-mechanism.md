# How Google generates sitelinks, and what could ever produce them for an eight-page site

Date: 2026-09-15 · Map: [#2398](https://github.com/Selftend/selftend/issues/2398) · Ticket:
[#2400](https://github.com/Selftend/selftend/issues/2400) · Branch: `research/sitelinks-mechanism`
(never merged; the branch name is the citation)

**Source policy for this file.** Every claim is either (a) quoted from a Google-owned surface —
Google Search Central documentation, the Google Search Central Blog, `developers.google.com/search/updates`
— with its URL and Google's own date, or (b) a live observation I made myself in a browser on
2026-09-15, marked **observed**, or (c) explicitly labelled **asserted by third parties, not
documented by Google**. Nothing from an SEO blog is used as evidence. Where Google says nothing,
this file says Google says nothing rather than substituting an estimate.

---

## 0. Headline

1. **Sitelinks are entirely automated and there is no control surface left.** Google's current
   documentation says "sitelinks are automated" and offers site owners exactly one lever: delete the
   page or `noindex` it. Every tool that ever existed to shape them — the 2007 block tool, the 2011
   demotion tool — has been removed.
2. **Google names four signals and only four**, in a "best practices" list, not a mechanism: page
   titles and headings, a logical and internally-linked site structure, concise internal anchor
   text, and no repetition. `BreadcrumbList` and `SiteNavigationElement` are **not** among them.
   `SiteNavigationElement` is not supported by Google Search at all.
3. **Google documents no threshold** — no page count, no site age, no query volume, no link metric.
   The nearest Google gets is three qualitative statements, all quoted in §4, the sharpest being
   "since our algorithms consider several factors to generate sitelinks, **not all websites have
   them**" (2007-10-18).
4. **The sitelinks search box is gone.** Announced 2024-10-21, removed from Search results starting
   **2024-11-21**, documentation removed **2024-11-29**. `docs/indexability.md` § 5 records
   2024-11-29 as the removal date; that is the _documentation_ removal date, not the feature's.
   Correction in §7 — the decision it supports ([#2291](https://github.com/Selftend/selftend/issues/2291):
   no `SearchAction`) is unaffected and stays right.
5. **The right-hand card on the `selftend` SERP is not a knowledge panel and not a sitelinks block.**
   It is the **links card inside the AI Overview** — DOM-verified as a descendant of the AI Overview
   container, carrying `aria-label="Related links"` and a "Show all" control. What feeds it is
   ordinary indexed pages; Google documents no markup, no schema and no opt-in for it.
6. **The honest bottom line.** Nothing in Google's documentation makes a sitelinks block impossible
   for an eight-page site, and nothing in it makes one reachable either. Google's stated condition
   is usefulness — "shortcuts that will save users time" — and seven of Selftend's eight routes are
   policy, FAQ or crisis pages, which are not what a person searching "selftend" is trying to jump
   to. The documented gap is not size; it is that the site has **no navigable sections a user would
   want a shortcut to**. Full reasoning in §6.

---

## 1. What sitelinks are, and which variants are current

### 1.1 Google's definition

> "Sitelinks are links from the same domain that are clustered together under a text result. Our
> systems analyze the link structure of your site to find shortcuts that will save users time and
> allow them to quickly find the information they're looking for."

— [Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks), Google Search Central
documentation, last updated **2025-12-10**.

The [Visual Elements Gallery](https://developers.google.com/search/docs/appearance/visual-elements-gallery)
(last updated **2026-02-04**) gives the two formal names Google uses when it names parts of a result:

- **Sitelink** — "A single link within a sitelinks group."
- **Sitelinks group** — "Two or more links from the same domain … that are clustered together under
  a text result."

That is the whole of Google's current vocabulary. The gallery defines no other sitelinks-adjacent
element.

### 1.2 The four variants the ticket asks about

| Variant                                                             | Status                                                                                                                                                                                                                                                                                                                           | Primary source                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Large block under a brand result** (title + snippet per link)     | **Current.** This is the "sitelinks group" of the gallery and the subject of the Sitelinks doc.                                                                                                                                                                                                                                  | [Sitelinks doc](https://developers.google.com/search/docs/appearance/sitelinks), 2025-12-10; [Visual Elements Gallery](https://developers.google.com/search/docs/appearance/visual-elements-gallery), 2026-02-04                                       |
| **One-line sitelinks** (a row of links, on results that are not #1) | **Current in practice; Google has not documented it separately since 2011.** Launched 2009-04-16; the 2011 post confirms it was untouched by that redesign. Today it is covered only by the gallery's generic "sitelinks group".                                                                                                 | [One-line sitelinks](https://developers.google.com/search/blog/2009/04/one-line-sitelinks), 2009-04-16; [Introducing new and improved sitelinks](https://developers.google.com/search/blog/2011/08/introducing-new-and-improved-sitelinks), 2011-08-16 |
| **"More results from example.com »"**                               | **Observed live 2026-09-15** under the `calm.com` sitelinks block. **Google documents no name for it** — it is absent from the Visual Elements Gallery and from the Sitelinks doc. The closest Google comes is the 2011 statement that when sitelinks appear for the top result, the results below them come from other domains. | Observed; [2011 post](https://developers.google.com/search/blog/2011/08/introducing-new-and-improved-sitelinks) for the adjacent behaviour                                                                                                             |
| **Sitelinks search box**                                            | **Retired.** Removed from Search starting 2024-11-21.                                                                                                                                                                                                                                                                            | [Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box), 2024-10-21                                                                                                                                   |

### 1.3 The sitelinks search box retirement, dated

Google Search Central Blog, **Monday, October 21, 2024**, posted by John Mueller, Search Advocate,
Google Switzerland — [Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box):

> "It's been over ten years since we initially announced the sitelinks search box in Google Search,
> and over time, we've noticed that usage has dropped. With that, and to help simplify the search
> results, we'll be removing this visual element **starting on November 21, 2024**."
>
> "This change will apply globally across all search results, in all languages and countries. This
> doesn't affect rankings or the other sitelinks visual element, and won't be listed in the Search
> status dashboard. Once we stop showing sitelinks search box elements in Search, we'll remove the
> Search Console rich results report for it and stop highlighting the markup in the Rich Results
> Test."
>
> "While you can remove sitelinks search box structured data from your site, there's no need to do
> so. Unsupported structured data like this won't cause issues in Search, and won't trigger errors
> in Search Console reports. If you decide to remove sitelinks search box structured data, note that
> **site names also uses a variation of `WebSite` structured data, which continues to be
> supported**."

Then, [Latest Google Search Documentation Updates](https://developers.google.com/search/updates),
entry dated **November 29, 2024**:

> "**Removing sitelinks search box documentation.** What: Removed the sitelinks search box
> documentation and archived the `nositelinkssearchbox` rule. Why: The sitelinks search box feature
> is no longer available in Google Search results."

**Verified 2026-09-15:** `https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox`
no longer exists — it 301s to the documentation changelog.

---

## 2. Are sitelinks requestable or suppressible? No, and here is the paper trail

### 2.1 What Google says today

From the [Sitelinks doc](https://developers.google.com/search/docs/appearance/sitelinks) (2025-12-10):

> "**At the moment, sitelinks are automated.** We're always working to improve our sitelinks
> algorithms, and we may incorporate site owner input in the future."

> "If you need to remove a sitelink, consider **removing the page from your site or using
> `noindex`**."

That is the entire control surface in 2026: delete or `noindex`. There is no request path, no
demotion, no ordering hint, no Search Console report.

### 2.2 The controls that used to exist, and when they died

**2007-10-18 — the block tool shipped.**
[Webmasters can now provide feedback on Sitelinks](https://developers.google.com/search/blog/2007/10/webmasters-can-now-provide-feedback-on):

> "Now, Webmaster Tools lets you view potential sitelinks for your site and block the ones you don't
> want to appear in Google search results. … Once you block a page, it won't appear as a sitelink for
> 90 days unless you choose to unblock it sooner."

**2011-08-16 — the block tool became the demotion tool.**
[Introducing new and improved sitelinks](https://developers.google.com/search/blog/2011/08/introducing-new-and-improved-sitelinks):

> "You can now suggest a demotion to a sitelink if it's inappropriate or incorrect, and the
> algorithms will take these demotions into account when showing and ranking the links (although
> removal is not guaranteed). … Up to 100 demotions will be allowed per site. Finally, all current
> sitelink blocks in Webmaster Tools will automatically be converted to the demotions system."

**Removal — announced by Google, but Google publishes no date for it.** Both the 2007 and the 2011
posts now carry an editorial note Google added later:

> "Note: The **'demote sitelinks' feature has been removed and is no longer available**. Please see
> our Google+ post on this change and our help center article on sitelinks."

The note is undated, and the Google+ post it points to is unreachable (Google+ was shut down).
The help-centre article it points at — `support.google.com/webmasters/answer/47334`, the old
Search Console sitelinks article that documented the demotion UI — **301-redirects to the Search
Central sitelinks doc** as of 2026-09-15; the demotion documentation is gone, not archived.
`developers.google.com/search/updates` contains **no** entry about the demotion tool: the only
changelog entry containing the string "sitelink" is the 2024-11-29 search-box entry quoted above.

> **Honest statement of the gap:** Google confirms the demotion tool was removed but **publishes no
> date for it**, and the announcement it cites no longer exists. A date circulating in SEO writing
> is _asserted by third parties, not documented by Google_, and this file does not repeat one.

**Nothing replaced it.** There is no sitelinks report, tool, or setting in Search Console today, and
the Sitelinks doc's "we may incorporate site owner input in the future" is unchanged from the same
sentence Google wrote in 2006 ("Over time, we may look for ways to incorporate input from webmasters
too." — [Information about Sitelinks](https://developers.google.com/search/blog/2006/09/information-about-sitelinks),
2006-09-07). Twenty years, same sentence, no tool.

---

## 3. What signals Google actually names

### 3.1 Named by Google

From the [Sitelinks doc](https://developers.google.com/search/docs/appearance/sitelinks) (2025-12-10),
verbatim and complete — this four-item list is the _entire_ documented signal set:

> - "Make sure that the text you use as your **page titles** and in your **headings** is informative,
>   relevant, and compact."
> - "Create a **logical site structure** that is easy for users to navigate, and make sure you **link
>   to your important pages from other relevant pages**."
> - "Ensure that your **internal links' anchor text** is concise and relevant to the page they're
>   pointing to."
> - "**Avoid repetitions** in your content."

Plus, in the definition itself: "Our systems analyze **the link structure of your site**."

And from the 2011 post, the only statement Google has made about where sitelinks sit in the ranking
stack:

> "The core improvement is that we've combined the signals we use for sitelinks generation and
> ranking — like the link structure of your site — with our more traditional ranking system, creating
> a better, unified algorithm. **From a ranking perspective, there's really no separation between
> 'regular' results and sitelinks anymore.**"

And from 2007, on selection:

> "Our algorithms **parse the structure and content of websites** and identify pages that provide
> fast navigation and relevant information for the user's query."

### 3.2 Named by Google as _not_ required

| Candidate                                         | Status                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`BreadcrumbList`**                              | Supported by Google — but for the **breadcrumb trail in the visible URL**, nothing else. Its documentation ([Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), last updated **2026-09-08**) does not mention sitelinks in its body, and the Sitelinks doc does not mention breadcrumbs. **Any claim that breadcrumbs feed sitelinks is asserted by third parties, not documented by Google.** |
| **`SiteNavigationElement`**                       | **Not supported by Google Search at all.** It does not appear in the [structured data search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) (last updated **2026-06-15**), which enumerates the 30 types Google supports. It has no Google documentation page. **Any claim that it produces sitelinks is asserted by third parties, not documented by Google.**                            |
| **The XML sitemap**                               | Google's sitemap documentation is about **discovery and crawling**. Neither the sitemap docs nor the Sitelinks doc connect a sitemap to sitelinks. **Any claim that sitemap order or `<priority>` shapes sitelinks is asserted by third parties, not documented by Google.**                                                                                                                                                              |
| **`WebSite` structured data**                     | Feeds the **site name** shown as attribution ([Site names](https://developers.google.com/search/docs/appearance/site-names), last updated **2025-12-10**) — domain/subdomain level only, must be on the home page. Nothing in that doc connects it to sitelinks. Its `SearchAction` half is dead (§1.3).                                                                                                                                  |
| **Page titles / headings / internal anchor text** | **Named by Google**, as quoted in §3.1. These are the only on-page things Google itself connects to sitelinks.                                                                                                                                                                                                                                                                                                                            |

> The clean split for the map: **titles, headings, internal linking and anchor text are documented.
> Structured data of every kind is not.** Nothing Selftend could add to the JSON-LD block in
> `docs/indexability.md` § 5 is documented to affect sitelinks in any way.

---

## 4. Is there a documented threshold? No.

**Google documents no threshold.** Not a page count, not a site age, not a brand-query impression
volume, not a link or authority metric, not a crawl-depth minimum. There is no such number anywhere
in Google Search Central documentation, the Search Central blog, or the documentation changelog.

What Google states instead is a usefulness condition, three times across twenty years:

| Date       | Google's words                                                                                                                                                                                                                                                                     | Source                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2006-09-07 | "Our process for generating Sitelinks is completely automated. **We show them when we think they'll be most useful to searchers**, saving them time from hunting through web pages to find the information they are looking for."                                                  | [Information about Sitelinks](https://developers.google.com/search/blog/2006/09/information-about-sitelinks)                                 |
| 2007-10-18 | "Since our algorithms consider several factors to generate sitelinks, **not all websites have them**."                                                                                                                                                                             | [Webmasters can now provide feedback on Sitelinks](https://developers.google.com/search/blog/2007/10/webmasters-can-now-provide-feedback-on) |
| 2025-12-10 | "**We only show sitelinks for results when we think they'll be useful to the user.** If the structure of your site doesn't allow our algorithms to find good sitelinks, or we don't think that the sitelinks for your site are relevant for the user's query, we won't show them." | [Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)                                                                  |

Two further Google statements bear on size, and neither is a threshold:

- 2009-04-16: "Sitelinks enable users to jump directly to important parts of a site, which is **often
  useful for large, complex websites**." ([One-line sitelinks](https://developers.google.com/search/blog/2009/04/one-line-sitelinks))
  — a statement about where they are _often_ useful, not a rule about where they are possible.
- 2011-08-16: "the **maximum number of sitelinks** that can appear for a site has been **raised from
  eight to 12**, and the number shown also varies by query."
  ([Introducing new and improved sitelinks](https://developers.google.com/search/blog/2011/08/introducing-new-and-improved-sitelinks))
  — a ceiling, not a floor, and fifteen years old. Google does not state a current ceiling.

> Anything numeric beyond this — "you need N pages", "sitelinks appear after M months", "you need
> DR X" — is **asserted by third parties and not documented by Google**. This file quotes none of it.

---

## 5. The right-hand card on the `selftend` SERP: it is the AI Overview's links card

**Observed 2026-09-15**, signed-in Chrome, desktop, `https://www.google.com/search?q=selftend`:

The `selftend` result page opens with a block labelled **"AI Overview"**. Inside that block, on the
right, sits a card stacking two source entries — on this run **`selftend.org` above `Google Play`**
— each with favicon, site name, result title and a snippet, with a **"Show all"** control beneath.

**It is not a knowledge panel.** Google's [Visual Elements Gallery](https://developers.google.com/search/docs/appearance/visual-elements-gallery)
(2026-02-04) does not define a knowledge panel at all, and no knowledge-panel container is present in
the DOM. **It is not a sitelinks group** either: a sitelinks group is "two or more links from the
**same domain**" (gallery, 2026-02-04), and this card mixes `selftend.org` with `play.google.com`.

**DOM verification (2026-09-15).** The card carries `aria-label="Related links"`. Walking up from the
`aria-label="Show more AI Overview"` control, the AI Overview container is reached in 3 hops and
`container.contains(relatedLinksCard)` is `true`. The card is a **descendant of the AI Overview
block**, not a sibling module and not a right rail — the page has no `#rhs` element at all.

**What feeds it: ordinary indexed pages, and nothing you can mark up.** From
[AI features and your website](https://developers.google.com/search/docs/appearance/ai-features),
Google Search Central, last updated **2025-12-10**:

> "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special
> optimizations necessary."
>
> "You don't need to create new machine readable files, AI text files, or markup to appear in these
> features. **There's also no special schema.org structured data that you need to add.**"
>
> AI Overviews and AI Mode "may use a 'query fan-out' technique — issuing multiple related searches
> across subtopics and data sources", which lets Google "display a wider and more diverse set of
> helpful links".

**Two corrections this observation forces on the map's Notes:**

1. The map records the AI Overview as "sourced from **Google Play**, not from the site". On
   2026-09-15 the overview's own attribution line reads **`selftend.org` +1**, and `selftend.org` is
   the **first** card. The ticket describes the opposite stacking order. Both are true of different
   runs — **the order varies**, and the site is now among the cited sources, which it apparently was
   not at charting. This is the one measurable thing that changed after v0.19.0 made the site
   readable.
2. The AI Overview rendered in **Bulgarian** for this signed-in session, from English source pages.
   Any read of this surface has to record the session locale or it is not reproducible.

---

## 6. The honest bottom line

**Are sitelinks reachable for selftend.org as it stands? On the documentation, no — and the reason
is not the page count.**

Every sentence Google writes about sitelinks is about _shortcuts_: "shortcuts that will save users
time", "jump directly to important parts of a site", "pages that provide fast navigation and relevant
information for the user's query". The condition Google states is that the algorithms can find good
shortcuts and that those shortcuts are relevant to the query.

Apply that to the eight routes on the index list (`docs/indexability.md` § 3):

| Route                                         | Is it a shortcut a person searching "selftend" wants?                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                                           | It **is** the result. A sitelink to it is not a shortcut.                                           |
| `/faq`                                        | Plausibly — it is the one route that answers a question a searcher might have.                      |
| `/crisis`                                     | A safety surface pointing outward, deliberately separate from the self-help features (`AGENTS.md`). |
| `/privacy`, `/terms`, `/cookies`, `/security` | Policy pages. Nobody searching the brand is trying to jump to the cookie policy.                    |
| `/account-deletion`                           | A genuine destination for one narrow intent, and a strange thing to promote under a brand result.   |

That is the documented gap. Seven of eight routes are the pages a site is _obliged_ to have, not the
sections a site _is_. Compare the observed `calm.com` block (2026-09-15): its five sitelinks are
_the app and meditations_, _subscription plans_, _support_, _sleep_, _log into your account_ —
five distinct things a person could be there to do. Selftend's site has **one** thing a person can
be there to do, and it is the main result.

**What the documentation supports saying, precisely:**

- Google states no size floor, so an eight-page site is **not documented as ineligible**. "Too small
  for sitelinks" is an SEO folk claim, not a Google claim.
- Google states the condition as usefulness and query relevance, so what would have to be true first
  is that **the site contains more than one thing a person searching the brand could be trying to
  reach, each with its own page, linked from the others with clear anchor text and a title that says
  what it is.** That is a restatement of Google's own four best practices (§3.1) and nothing more.
- The four documented levers are all _structural and descriptive_ — titles, headings, internal links,
  anchor text. Three of the four are already governed by decided sections of `docs/indexability.md`
  (§ 4 per-route head, § 7 title = H1). The fourth, **internal linking between the eight routes**, is
  the one documented lever the spec has not yet ruled on — and the map already has it open under
  _"What the existing eight routes owe each other"_.
- Even with all of that true, **sitelinks remain a Google decision with no request path, no
  guarantee and no instrument**: Search Console has no sitelinks report, and the only observation
  available is looking at the SERP.
- **Nothing about DR 0, site age, or the brand query's impression volume appears in any Google
  statement about sitelinks.** Third-party writing treats these as prerequisites; Google does not
  document them. The honest position is that they are unmeasured, not that they are barriers.

**What this file does not recommend.** This is a mechanism finding, not a tactic. It does not
recommend adding pages in order to obtain sitelinks; whether Selftend should have more public pages
is a product question the map answers against `docs/marketing-plan.md` § 4 square 3 and the brand-query
carve-out, and "a page written to rank" is refused there. If public pages are added, they are added
because the product has something to say that people arrive looking for — sitelinks would be a
side effect Google may or may not grant, never the reason.

---

## 7. Corrections to records this map depends on

1. **`docs/indexability.md` § 5 and [#2291](https://github.com/Selftend/selftend/issues/2291):**
   "the sitelinks search box was removed 2024-11-29". Precisely: **removed from Search starting
   2024-11-21** (announced 2024-10-21); **2024-11-29** is the date Google removed the _documentation_
   and archived the `nositelinkssearchbox` rule. The decision that rests on it — no `SearchAction` in
   the `WebSite` node — is correct and unaffected. Note also, from the same announcement: the rest of
   `WebSite` "continues to be supported" for site names, which is exactly how § 5 uses it.
2. **Map [#2398](https://github.com/Selftend/selftend/issues/2398) Notes:** "the AI Overview … is
   sourced from **Google Play**, not from the site." As of 2026-09-15 `selftend.org` is the overview's
   primary attribution and the first source card. See §5.
3. **Map Notes:** "Google removed the ability to request or demote them." Correct on substance.
   Sharper: **the request ability never existed** — the only controls Google ever shipped were
   _block_ (2007) and then _demote_ (2011), both negative, both since removed on a date Google does
   not publish. Google has said "we may incorporate site owner input
   in the future" continuously since 2006-09-07 and has never shipped it.

---

## 8. Sources

All fetched or observed 2026-09-15. Google's own "last updated" dates are given where the page
carries one.

**Google Search Central documentation**

- [Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks) — last updated 2025-12-10
- [Visual Elements Gallery](https://developers.google.com/search/docs/appearance/visual-elements-gallery) — last updated 2026-02-04
- [Site names in Google Search](https://developers.google.com/search/docs/appearance/site-names) — last updated 2025-12-10
- [Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) — last updated 2026-09-08
- [Structured data markup that Google Search supports](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) — last updated 2026-06-15
- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) — last updated 2025-12-10
- [Latest Google Search Documentation Updates](https://developers.google.com/search/updates) — changelog; entry of 2024-11-29 quoted
- `https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox` — **gone**, 301 to the changelog
- `https://support.google.com/webmasters/answer/47334` (old Search Console sitelinks help) — **gone**, 301 to the Sitelinks doc

**Google Search Central Blog**

- [Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box) — 2024-10-21, John Mueller
- [Introducing new and improved sitelinks](https://developers.google.com/search/blog/2011/08/introducing-new-and-improved-sitelinks) — 2011-08-16, Harvey Jones and Raj Krishnan
- [One-line sitelinks](https://developers.google.com/search/blog/2009/04/one-line-sitelinks) — 2009-04-16, Doantam Phan and Raj Krishnan
- [Webmasters can now provide feedback on Sitelinks](https://developers.google.com/search/blog/2007/10/webmasters-can-now-provide-feedback-on) — 2007-10-18, Stacey Kuznetsov
- [Information about Sitelinks](https://developers.google.com/search/blog/2006/09/information-about-sitelinks) — 2006-09-07

**Live observation (Chrome, desktop, signed in, 2026-09-15)**

- `https://www.google.com/search?q=selftend` — AI Overview in Bulgarian; `aria-label="Related links"`
  card inside the AI Overview container; sources `selftend.org` then `Google Play`; no `#rhs`; no
  sitelinks group under the `selftend.org` result.
- `https://www.google.com/search?q=calm.com` — sitelinks group of five (the app and meditations,
  subscription plans, support, sleep, log into your account), each with snippet, followed by "More
  results from calm.com »".

**Not used as evidence:** no SEO publication, no third-party blog, no forum thread. Where this file
says something is "asserted by third parties", it is flagging a claim that circulates without a
Google source — it is not citing one.
