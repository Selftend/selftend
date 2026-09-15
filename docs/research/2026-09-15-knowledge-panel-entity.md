# What produces a Google knowledge panel, and is any of it reachable on-site only?

Date: 2026-09-15 · Map: [#2398](https://github.com/Selftend/selftend/issues/2398) ·
Ticket: [#2401](https://github.com/Selftend/selftend/issues/2401)

Every claim below is sourced to Google or schema.org. Third-party SEO writing was
not used as evidence and is not cited. Where a Google page carries a "Last updated"
stamp it is given; where it does not, the date I read it is given instead. Live
SERP observations were made from a signed-in Chrome on 2026-09-15 and are labelled
as observations, not documentation.

---

## Headline

**There is no on-site-only path to a knowledge panel. Google says so in its own
words, and the sentence to cite is not the one the map assumed.**

> "To maintain the integrity of search results, our current policy doesn't manually
> create or delete Knowledge Panels."
> — [Submit feedback on content about you](https://support.google.com/knowledgepanel/answer/7534842),
> Knowledge Panel Help, read 2026-09-15

Nothing a site emits — `Organization`, `sameAs`, `logo`, anything — is documented by
Google as _creating_ an entity. The strongest verbs Google uses are "help … better
understand", "disambiguate", and "influence **which** logo is shown". Claiming a
panel requires a panel to already exist. Google Business Profile explicitly excludes
Selftend's shape of thing. And the calm.com comparison Selftend is being measured
against renders the words **"Source: Wikipedia"** in the panel itself.

**Two smaller, genuinely on-site-only search-identity features do exist and are
documented — the favicon (already rendering for selftend.org) and the site name
(markup is correct, Google is not yet applying it).** Neither is an entity card.
They are the honest ceiling.

---

## The map's Wikipedia premise: **it broke, but the conclusion survives**

The map asserted at charting that a knowledge panel's text comes from Wikipedia and
is therefore unreachable. Split into its two halves:

**The stated reason is wrong as stated.** Google nowhere documents Wikipedia as a
requirement, and its help pages name _no_ source at all:

- "Knowledge panels are automatically generated, and information that appears in a
  knowledge panel comes from various sources across the web."
  — [About knowledge panels](https://support.google.com/knowledgepanel/answer/9163198),
  read 2026-09-15. The page names **no** specific source — not Wikipedia, not
  Wikidata. It names only categories: data partners with "authoritative data on
  specific topics like movies or music", "other open web sources", and content
  owners who have claimed their panel.
- "Facts in the Knowledge Graph come from a variety of sources that compile factual
  information." — [How Google's Knowledge Graph works](https://support.google.com/knowledgepanel/answer/9787176),
  read 2026-09-15. Again: no source named.
- Google's own blog is the only first-party page that names Wikipedia, and it names
  it to _downgrade_ it: "We draw from hundreds of sources from across the web,
  including licensing data that appears in knowledge panels for music, sports and
  TV", and Wikipedia "is a commonly-cited source, but it's not the only one."
  — [Google's Knowledge Graph and knowledge panels](https://blog.google/products/search/about-knowledge-graph-and-knowledge-panels/),
  published 2020-05-20.

So a spec that says "knowledge panel text comes from Wikipedia" is citing a claim
Google does not make, and Google has published a sentence that contradicts it. **Do
not write that sentence into the spec.**

**The conclusion is nevertheless right, for better reasons.** Three of them:

1. Panels are not requestable from _any_ source. Google's policy sentence above is
   source-agnostic: it does not create panels on request, period. Wikipedia or not
   is beside the point.
2. On the actual comparison target, the description _is_ Wikipedia. Observed
   2026-09-15, searching `calm app company`: the right-hand panel shows the Calm
   logo, the subtitle "Software company", a three-sentence description, the literal
   line **"Source: Wikipedia"** under it, then rows Founders / CEO / Founded. So the
   specific artefact the owner pointed at is, in fact, Wikipedia-fed — the map's
   instinct about _that screenshot_ was sound even though its general rule was not.
3. Every row in that panel is a fact Selftend does not have. **No registered legal
   entity exists** — `docs/costs.md:95` (checked 2026-08-20) and `docs/indexability.md:141`,
   which already refuses `nonprofitStatus` on exactly this ground. No Founders row, no
   CEO row, no Founded date can be truthfully populated regardless of mechanism. The
   refusal does not even need the Google policy; it is also a truthfulness refusal.

**Net effect on the map: the shape holds, the reason must be replaced.** Swap "the
text comes from Wikipedia" for "Google does not create panels on request, and the
claiming flow only edits panels that already exist."

---

## 1. How an organisation enters the Knowledge Graph, and what `Organization` markup does

Google never claims structured data is sufficient. The verbs are all weaker than
"create":

> "Adding organization structured data to your home page can help Google better
> understand your organization's administrative details and disambiguate your
> organization in search results."
> — [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization),
> Last updated **2026-09-08** UTC

> "Some properties are used behind the scenes to disambiguate your organization from
> other organizations (like `iso6523` and `naics`), while others can influence visual
> elements in Search results (such as which `logo` is shown in Search results and
> your knowledge panel)." — _ibid._

Read that parenthesis precisely. It says structured data can influence **which logo
is shown in … your knowledge panel** — it presupposes a panel and governs a choice
_within_ it. It does not say the markup produces one. That is the single most
load-bearing sentence in this whole ticket, and it is the opposite of what an
optimistic reading would take from it.

> "There are no required properties; instead, we recommend adding as many properties
> that are relevant to your organization." — _ibid._

The 2023 announcement that created this page frames it the same way: "Organization
markup helps Google better understand your business or organization"
([Expanding markup support for Organization details](https://developers.google.com/search/blog/2023/11/introducing-organization-markup),
November 2023). That post also records that the standalone **Logo** documentation was
merged into the Organization page and that the Search Console **logo report** was
replaced by Organization validations in the Rich Results Test — so there is no
Search Console surface left that reports on logo eligibility.

And the general policy, which applies to all of it:

> "Using structured data _enables_ a feature to be present, it does not _guarantee_
> that it will be present." … "Google does not guarantee that your structured data
> will show up in search results, even if your page is marked up correctly according
> to the Rich Results Test."
> — [Structured data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
> Last updated **2026-07-10** UTC

[Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
(Last updated 2025-12-10 UTC) makes **no mention of the Knowledge Graph or knowledge
panels at all** — an absence worth recording: Google's own overview of what structured
data is for does not list "get into the Knowledge Graph" among its purposes.

Google's closest thing to a "how do I establish my identity" page,
[Add your business details to Google](https://developers.google.com/search/docs/appearance/establish-business-details)
(Last updated 2025-12-10 UTC), lists four mechanisms: claim a **Business Profile**,
verify in **Search Console**, **update your Google knowledge panel** "to override the
information Google finds automatically", and **add structured data**. Note the verb in
the third: _update_, reached by "clicking the Feedback link at the bottom of the
Google knowledge panel". Presupposes existence again. Of the four, exactly one
(structured data) is available to Selftend, and it is the one documented as advisory.

**Answer to Q1: no. Google never claims `Organization` structured data is sufficient
to create an entity. It claims only that it helps Google understand and disambiguate
one, and that it can influence which logo appears inside a panel that already exists.**

---

## 2. `sameAs` — is it an entity-reconciliation signal?

**schema.org says yes. Google does not say so.** This gap matters and is easy to miss,
because the two definitions do not agree.

schema.org:

> "URL of a reference Web page that unambiguously indicates the item's identity. E.g.
> the URL of the item's Wikipedia page, Wikidata entry, or official website."
> — [schema.org/sameAs](https://schema.org/sameAs), read 2026-09-15

That is a reconciliation definition, and its named exemplars are Wikipedia and
Wikidata — i.e. the vocabulary itself assumes you are pointing at an established
identifier, which is precisely what Selftend does not have.

Google, on the same property in the Organization page:

> "The URL of a page on another website with additional information about your
> organization, if applicable. For example, a URL to your organization's profile page
> on a social media or review site. You can provide multiple `sameAs` URLs."
> — [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization),
> Last updated 2026-09-08 UTC

Google's wording is deliberately weaker: "additional information", not "unambiguously
indicates identity". No documented outcome is attached to `sameAs` — no feature, no
rich result, no panel row. It sits in the "recommended properties" list with
everything else. The former standalone "social profile links" documentation no longer
exists as its own feature page; it was folded into Organization in the same 2023 merge.

**Answer to Q2: `sameAs` is an entity-reconciliation signal in schema.org's
vocabulary, but Google documents no reconciliation outcome for it. Treat it as a
correctness/consistency property, not a lever.**

### Incidental finding — production is emitting a stale `sameAs`

This is a real, fixable on-site defect, found while verifying the live markup.

`src/lib/structured-data.ts` reads `appEnv.githubRepoUrl`, whose source default is
`https://github.com/Selftend/selftend`. **But the deployed page emits
`https://github.com/vasilyoshev/mental-health`** — the repository's old name, which
`curl -I` confirms returns `301 Moved Permanently` to `https://github.com/Selftend/selftend`
(checked 2026-09-15). The value comes from the GitHub Actions repository variable
`EXPO_PUBLIC_GITHUB_REPO_URL` (`.github/workflows/web-deploy.yml:43`), which is set to
the pre-rename URL and overrides the correct source default.

Given the property's whole purpose is to point at a page that unambiguously indicates
identity, pointing it at a 301 is the one thing you would not choose. Fixing it is a
repository-variable edit plus a redeploy; the source needs no change. Worth its own
ticket on the map.

---

## 3. The logo in search results

Current documented requirements (all from
[Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization),
Last updated 2026-09-08 UTC):

| Requirement      | Google's wording                                                                    | Selftend's `favicon-512.png`                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Minimum size     | "The image must be 112x112px, at minimum."                                          | **512×512** — pass (verified from the PNG IHDR)                                                                      |
| Crawlable        | "The image URL must be crawlable and indexable."                                    | `HTTP/1.1 200`, `Content-Type: image/png`; `robots.txt` has `User-agent: * / Disallow:` (nothing blocked) — pass     |
| Format           | "The image file format must be supported by Google Images."                         | PNG, 8-bit RGBA — pass                                                                                               |
| White background | "Make sure the image looks how you intend it to look on a purely white background." | The mark is a filled disc on a transparent field (corner pixel alpha = 0), so it reads on white — pass by inspection |
| Placement        | markup goes on "your home page"                                                     | `/` only — pass                                                                                                      |

Selftend meets every documented requirement. Two caveats for the record:

- **The same asset serves three roles** — `og:image`, `apple-touch-icon` and
  `Organization.logo` all point at `favicon-512.png`. That is legal but not
  necessarily ideal; Google's guidance is about a _logo_, and the app icon is what is
  being supplied.
- **The markup is currently inert, and can only stop being inert if a panel appears.**
  Google's documented effect for `logo` is "which logo is shown in Search results and
  your knowledge panel". There is no panel for selftend.org.

**Is it rendering today?** Observed 2026-09-15, query `selftend`: selftend.org is
indexed and ranks **first**, with an icon beside the result. That icon is the
**favicon** feature, not the Organization logo — it is fed by `<link rel="icon"
href="/favicon.ico">`, a different mechanism documented separately
([Favicon in Search](https://developers.google.com/search/docs/appearance/favicon-in-search),
Last updated **2026-08-28** UTC: minimum 8×8px square, "Googlebot-Image must be able
to crawl the favicon file", "The favicon URL must be stable", and "A favicon isn't
guaranteed to appear in Google Search results, even if all guidelines are met").
**No knowledge panel and no other logo surface appears for selftend.org.** So:
the logo markup is valid and correctly placed, and has no observable effect today.

### Incidental finding — the site name is showing as the bare domain

Also observed 2026-09-15: the selftend.org result's site name renders as
**`selftend.org`**, not "Selftend". For contrast, the calm.com result on the same day
renders **"Calm"**.

Per [Site names in Google Search results](https://developers.google.com/search/docs/appearance/site-names)
(Last updated **2025-12-10** UTC), the feature wants `WebSite` structured data with
`name` and `url` and "The `WebSite` structured data must be on the home page of the
site"; Google additionally "takes into account content from a site's home page and
references to it that appear on the web", plus `og:site_name`, `<title>`, and heading
elements.

Selftend already supplies **all** of these correctly — `WebSite.name` = "Selftend" in
the `@graph` on `/`, `og:site_name` = "Selftend", `<title>` = "Selftend - private
mental health tools". The markup is not the problem. The remaining documented input is
"references to it that appear on the web", which is off-site and outside this map's
ruling. This is the clearest live demonstration available that correct on-site markup
is necessary but not sufficient, on a feature _far_ smaller than an entity card.

---

## 4. Knowledge panel claiming — does it need a panel to exist?

**Yes. Unambiguously, and this is half the ticket's answer.**

[Get verified on Google](https://support.google.com/knowledgepanel/answer/7534902)
(read 2026-09-15) describes the flow as: search for the entity, **find your knowledge
panel**, click **"Claim this knowledge panel"**. Every step operates on an existing
panel. The page also warns that "Not all knowledge panels are claimable as of now" and
directs local businesses to Google Business Profile instead. Permission levels are
described purely in terms of suggestion: Manager/Owner "can suggest changes to the
knowledge panel, and add or remove users"; Contributor "can suggest changes to the
knowledge panel". **The page contains no instructions for creating a panel, because
there is no such thing.**

[Submit feedback on content about you](https://support.google.com/knowledgepanel/answer/7534842)
(read 2026-09-15) closes it: "Anyone can submit feedback on a search feature", but
"To maintain the integrity of search results, our current policy doesn't manually
create or delete Knowledge Panels." (Verified verbatim from the raw page HTML, not
only via summarisation.)

Google's blog agrees: "Many knowledge panels can be 'claimed' by the subject they are
about" and getting verified lets you "provide feedback directly to us about potential
changes or to suggest things like a preferred photo"
([blog.google, 2020-05-20](https://blog.google/products/search/about-knowledge-graph-and-knowledge-panels/)).
Suggest. Not create.

**Answer to Q4: verification is an editing right over an existing panel. It is not a
creation path and cannot be started without a panel. For Selftend there is nothing to
claim.**

---

## 5. Google Business Profile — applicable at all?

**No, and Google names Selftend's category explicitly.**

> "To qualify for a Business Profile, a business must make in-person contact with
> customers during its stated hours."
> — [Business eligibility and ownership guidelines](https://support.google.com/business/answer/13763036),
> read 2026-09-15

The same page lists "**Brands, organizations, artists, and other online-only
businesses**" among the things that are not eligible. "Organizations … online-only" is
Selftend, named in Google's own ineligibility list.

> "If your business either has a physical location that customers can visit, or travels
> to customers where they are, you can create a Business Profile on Google." … "If your
> business rents a physical mailing address but doesn't operate out of that location,
> also known as a virtual office, that location isn't eligible for a Business Profile."
> … "P.O. boxes or mailboxes located at remote locations aren't acceptable."
> — [Guidelines for representing your business on Google](https://support.google.com/business/answer/3038177),
> read 2026-09-15

Selftend has no physical location, does not travel to anyone, has no staff and no
stated hours. Even setting aside the absence of a legal entity, the eligibility test
fails on its first clause. And attempting it would be worse than useless: the flow
ends in address verification, which would require asserting a location that does not
exist.

**Answer to Q5: not applicable, and on the record as refused. Do not revisit.**

A footnote for completeness: Google's Organization page also mentions that merchants
"can influence more details in their merchant knowledge panel and brand profile". That
route runs through Google Merchant Center and presupposes selling products. Selftend
sells nothing and has ruled out monetisation, so it is inapplicable for the same class
of reason; I did not research Merchant Center eligibility in depth because the
premise fails at the first step.

---

## 6. Bottom line for the spec

**There is no on-site-only path to a knowledge panel or entity card of any kind.** The
spec can refuse it by name on four independent grounds, any one of which is sufficient:

1. **Google does not create panels on request.** "our current policy doesn't manually
   create or delete Knowledge Panels" —
   [knowledgepanel/7534842](https://support.google.com/knowledgepanel/answer/7534842),
   2026-09-15.
2. **The claiming flow is an edit right, not a creation path**, and cannot be entered
   without an existing panel —
   [knowledgepanel/7534902](https://support.google.com/knowledgepanel/answer/7534902),
   2026-09-15.
3. **Structured data is documented as advisory, never sufficient.** "help Google better
   understand"; "influence _which_ logo is shown … in your knowledge panel"; "enables a
   feature … does not guarantee" —
   [organization](https://developers.google.com/search/docs/appearance/structured-data/organization)
   (2026-09-08), [sd-policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
   (2026-07-10).
4. **Google Business Profile names online-only organizations as ineligible** —
   [business/13763036](https://support.google.com/business/answer/13763036), 2026-09-15.

And a fifth ground that is Selftend's own rather than Google's: the panel rows the
owner pointed at — Founders, CEO, Founded — **have no true values**, because no
registered entity exists (`docs/costs.md:95`, checked 2026-08-20; already the stated
reason `docs/indexability.md:141` refuses `nonprofitStatus`). Even a granted panel
could not be filled without inventing them, which is not on the table.

### What _is_ reachable on-site, honestly stated

Two documented features, both much smaller than what was asked for:

- **Favicon in search results** — already rendering for selftend.org as of 2026-09-15.
  Done; nothing to do.
- **Site name in search results** — all documented on-site inputs are already correct
  and Google is still showing `selftend.org`. The remaining documented input
  ("references to it that appear on the web") is off-site. Nothing on-site is left to
  add; this one is a _wait_, not a _task_.

Plus one defect worth a ticket: the production `sameAs` GitHub URL is the pre-rename
`github.com/vasilyoshev/mental-health` (301 → the canonical repo), sourced from a stale
`EXPO_PUBLIC_GITHUB_REPO_URL` repository variable rather than from `src/lib/env.ts`.

### The sentence not to write

Do not write "knowledge panel text comes from Wikipedia, therefore it is unreachable."
Google has published the opposite of the first clause
([blog.google, 2020-05-20](https://blog.google/products/search/about-knowledge-graph-and-knowledge-panels/):
Wikipedia "is a commonly-cited source, but it's not the only one"), and anyone
re-deriving this in six months would find that and reopen the question. Write instead:
_Google does not create knowledge panels on request from any source, and its
verification flow only edits panels that already exist._

---

## Sources

| Source                                                                                                                                 | Kind                  | Date                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- |
| [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)                      | Search Central docs   | Last updated 2026-09-08 UTC     |
| [Structured data general guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)                 | Search Central docs   | Last updated 2026-07-10 UTC     |
| [Intro to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)                 | Search Central docs   | Last updated 2025-12-10 UTC     |
| [Site names in Google Search](https://developers.google.com/search/docs/appearance/site-names)                                         | Search Central docs   | Last updated 2025-12-10 UTC     |
| [Favicon in Search](https://developers.google.com/search/docs/appearance/favicon-in-search)                                            | Search Central docs   | Last updated 2026-08-28 UTC     |
| [Add your business details to Google](https://developers.google.com/search/docs/appearance/establish-business-details)                 | Search Central docs   | Last updated 2025-12-10 UTC     |
| [Expanding markup support for Organization details](https://developers.google.com/search/blog/2023/11/introducing-organization-markup) | Search Central blog   | November 2023                   |
| [About knowledge panels](https://support.google.com/knowledgepanel/answer/9163198)                                                     | Knowledge Panel Help  | read 2026-09-15 (no date stamp) |
| [How Google's Knowledge Graph works](https://support.google.com/knowledgepanel/answer/9787176)                                         | Knowledge Panel Help  | read 2026-09-15 (no date stamp) |
| [Get verified on Google](https://support.google.com/knowledgepanel/answer/7534902)                                                     | Knowledge Panel Help  | read 2026-09-15 (no date stamp) |
| [Submit feedback on content about you](https://support.google.com/knowledgepanel/answer/7534842)                                       | Knowledge Panel Help  | read 2026-09-15 (no date stamp) |
| [Google's Knowledge Graph and knowledge panels](https://blog.google/products/search/about-knowledge-graph-and-knowledge-panels/)       | Google blog           | published 2020-05-20            |
| [Guidelines for representing your business on Google](https://support.google.com/business/answer/3038177)                              | Business Profile Help | read 2026-09-15                 |
| [Business eligibility and ownership guidelines](https://support.google.com/business/answer/13763036)                                   | Business Profile Help | read 2026-09-15                 |
| [schema.org/sameAs](https://schema.org/sameAs)                                                                                         | schema.org vocabulary | read 2026-09-15                 |

Live observations (Chrome, 2026-09-15): Google SERP for `selftend`, `calm.com` and
`calm app company`; `curl` against `https://selftend.org/`, `/robots.txt` and
`/favicon-512.png`; PNG header and alpha inspected locally.

**No third-party SEO writing was used.** Where a belief about knowledge panels is
common but appears nowhere in Google's documentation — for example, that a critical
mass of consistent `sameAs` links will trigger panel creation — it is _asserted by
third parties, not documented by Google_, and is not relied on above.
