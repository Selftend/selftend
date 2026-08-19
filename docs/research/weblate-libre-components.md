# Hosted Weblate Libre: adding 13 components — status, limits, process, mechanics

> Research for [wayfinder ticket #1094](https://github.com/Selftend/selftend/issues/1094)
> (part of #1091, blocking #1098), resolved 2026-08-19.
> All claims are from primary sources — weblate.org, docs.weblate.org, and
> hosted.weblate.org public pages/API — checked **2026-08-19**, with no login used.

## 1. Plan status: still in trial, not yet approved as Libre

The public project page <https://hosted.weblate.org/projects/selftend/> carries a
warning banner (an `alert alert-warning` in the page HTML):

> "This project is in a trial period, be cautious while contributing. Setup can
> still change before being approved as a libre project."

So as of 2026-08-19 the Libre request (pending since 2026-08-13) is **not yet
approved** — the project is publicly marked as in its trial period. That banner is
the only plan-related information visible publicly:

- The project object at <https://hosted.weblate.org/api/projects/selftend/> has
  **no billing/plan/trial keys** (full key list inspected).
- <https://hosted.weblate.org/api/billing/> returns **404 unauthenticated**; per
  <https://docs.weblate.org/en/latest/api.html> it lists "billing plans for the
  currently authenticated user". **Plan/limit/expiry detail and the request's
  approval-queue status are visible only behind the owner's login** — not
  verifiable publicly, and not guessed at here.

Publicly reported numbers (unauthenticated GET, all 200 OK):

- <https://hosted.weblate.org/api/projects/selftend/components/> → `"count": 8` —
  the 7 i18next namespaces (auth, common, cbt, errors, navigation, policies,
  settings) **plus the auto-created glossary** (slug `glossary`, format `tbx`,
  repo `local:`). Namespace components report `file_format: "i18nextv4"`,
  filemask `src/i18n/locales/*/<ns>.json`,
  `check_flags: "ignore-ellipsis, ignore-reused"`,
  `allow_translation_propagation: false`, branch `main`.
- <https://hosted.weblate.org/api/projects/selftend/statistics/> →
  `"total": 4332, "total_words": 25008, "total_chars": 154718`; last change
  2026-08-13. That total is translation units across languages: 2,166 source
  strings × (en + bg), with the English units shown as `readonly`. **4,332 of the
  160,000-string budget used (~2.7%).**
- Project object: `license: "AGPL-3.0-only"`, `access_control: 0` (public),
  `web: "https://selftend.org"`.

## 2. Limits: strings only — components are uncapped; counted as strings × languages

Source: <https://weblate.org/en/hosting/> (checked 2026-08-19):

- The pricing table columns are "Hosted strings | Translation projects |
  Translation components | Number of translators"; the 160k row reads
  **160,000 | ∞ | ∞ | ∞**. **Component count is uncapped** — only strings are
  limited. "Cloud hosting prices are based purely on number of strings. All
  plans include all Weblate features."
- The counting definition, verbatim (under "Hosted strings"):

  > "Pricing is based on the number of strings **in all used languages**. A
  > string is a text unit defined in a translation format. It can be a word,
  > sentence, or paragraph."

  i.e. the budget is **translation units = source strings × languages** — not
  source strings alone, and not words. Selftend's public numbers confirm the
  source-language units count too: 2,166 × 2 = the reported 4,332. **Every new
  language multiplies the count**: at 2 languages, 160k allows ~80k source
  strings; even at 20 languages, 8k source strings. The 13 extra components are
  nowhere near a limit problem at today's ~2.2k source strings.

- Libre plan, verbatim: "If you feel that being supported by Weblate will help
  your libre project, set it up and get the Libre plan gratis. It has the same
  limits as the 160k plan, and is only for public projects."
- No word-count-based limit exists anywhere; words are reported in statistics
  but not priced. (Ambiguity: "in all used languages" doesn't spell out
  read-only source units, but the observed numbers show they count.)

## 3. Process: approval is per-project and one-time; components are self-serve

- The approval flow (official Weblate news post,
  <https://weblate.org/en/news/archive/weblate-even-more-open-now/>, 2020-11-27):
  set the project up during the 14-day trial, then "once you're happy with your
  project setup … ask for approval to keep it free forever." Conditions,
  verbatim: "The source code publicly available in a supported repository, and a
  license approved as libre by OSI or recognized as libre by FSF is all you
  need."
- The trial banner and the docs both frame approval as **project-level**
  ("…before being approved as a libre project";
  <https://docs.weblate.org/en/latest/admin/access.html>: "Projects running the
  gratis Libre plan on Hosted Weblate are always Public.")
- **No official source says new components need (re-)approval.** Nothing on
  weblate.org/hosting/, docs.weblate.org, or the FAQ mentions per-component
  review. The enforcement model is a numeric limit check, not a human gate
  (<https://docs.weblate.org/en/latest/admin/optionals.html>, Billing → Usage):
  component creation by non-superusers is possible when

  > "The billing is in its configured limits (**any overusage results in
  > blocking of project/component creation**) and paid (if its price is non
  > zero)"

  So adding components is **self-serve while within the string limit**; going
  over blocks creation automatically.

- Unverifiable without login: whether creation behaves differently while the
  Libre request is still pending. The trial is a normal billing with plan
  limits and the existing 8 components were created during it, so more should
  work. Practical note: the reviewer will assess the project as it stands, and
  the banner wording ("setup can still change before being approved") actively
  anticipates setup changes during trial — adding the 13 components before
  approval simply means they get reviewed as part of the setup.

## 4. Mechanics: one scripted API pass works, with internal repo linking

Sources: <https://docs.weblate.org/en/latest/api.html>
(`POST /api/projects/(string:project)/components/`),
<https://docs.weblate.org/en/latest/formats/i18next.html>,
<https://docs.weblate.org/en/latest/vcs.html>.

### 4a. Scripted creation — yes, fully supported

`POST /api/projects/selftend/components/` "Creates translation components in the
given project." The request body is the full component object (same schema as
`GET /api/components/<project>/<component>/`), which includes every field needed:

- `file_format` — use **`i18nextv4`** ("i18next JSON file v4 … Choose this
  format if unsure. It stores plurals using standard CLDR suffixes"). Plain
  `i18next` is the **legacy v3** numeric-plural format. All 7 existing selftend
  components report `"file_format": "i18nextv4"`.
- `filemask` — plus `template` (monolingual base file; existing components set
  `src/i18n/locales/en/<ns>.json`, so include it).
- `check_flags` — a comma string; existing components carry exactly
  `"ignore-ellipsis, ignore-reused"`.
- `allow_translation_propagation` — settable at creation; existing components
  are `false`.
- Also settable: `repo`, `branch`, `vcs`, `new_lang`, `license`,
  `language_regex`, `priority`, etc. Minimum in practice: `name`, `slug`,
  `file_format`, `filemask`, `repo` (+ `template`/`new_base` for monolingual).
  Auth via API token (`Authorization: Token …`).

### 4b. Internal repo linking — yes, and it is the officially recommended shape

<https://docs.weblate.org/en/latest/vcs.html>, "Weblate internal URLs":

> "Share one repository setup between different components by referring to its
> placement as `weblate://project/component` in other (linked) components."

Benefits, verbatim: "Saves disk space on the server, the repository is stored
just once" and "Makes the updates faster, only one repository is updated". The
API docs put the recommendation on the create endpoint itself: "Hint: Use
Weblate internal URLs when creating multiple components from a single VCS
repository." Since Weblate 4.6 it is automatic: "The cloned repositories are now
automatically shared within a project using Weblate internal URLs. Use
`disable_autoshare` to turn off this."

**Selftend already uses this pattern**: `common`, `cbt`, `errors`, `navigation`,
`policies`, and `settings` all report `linked_component: …/selftend/auth/` —
**`auth` holds the only real clone**. (The `repo` field misleads: per the API
docs, "this is the actual repository URL even when Weblate internal URLs are
used, use `linked_component` to detect this situation".) New components should
pass `"repo": "weblate://selftend/auth"` — or just rely on autoshare. Caveats
from vcs.html: linked components share the complete checkout (no per-component
file isolation — a non-issue with a single owner), and "Removing main component
also removes linked components" — **never delete `auth` casually**.

### 4c. Gotchas for the scripted pass

- **Creation is async**: "Most of the component creation happens in the
  background. Check the `task_url` attribute of created component and follow
  the progress there." Poll each component's `task_url`
  (`GET /api/tasks/<uuid>/`) before asserting success.
- **Limit enforcement is the only gate**: overusage of the plan's string limit
  blocks project/component creation outright (see §3). Irrelevant at
  4,332/160,000.
- **Rate limits** (<https://docs.weblate.org/en/latest/api.html>, "API rate
  limiting"): "100 requests per day for anonymous users and 5000 requests per
  hour for authenticated users", surfaced via `X-RateLimit-*` headers
  (anonymous limit 100 confirmed live). 13 authenticated POSTs + polling is
  trivially within budget.
- **Anubis anti-bot gate**: hosted.weblate.org challenges browser-like clients —
  a `Mozilla/…` User-Agent gets a 403/JS proof-of-work redirect
  (`/.within.website/…`), while curl's default UA passes straight through.
  Scripted API access should use a non-browser UA.
- **The glossary counts as a component**: the project has 8 components, not 7.
  Scripts that enumerate components should filter `is_glossary` / slug
  `glossary`.

## Open items (owner-login only)

1. Exact trial expiry date and the Libre request's queue status
   (`/api/billing/` is 404 unauthenticated; the hosted billing page is behind
   login).
2. Whether staff ever re-look at an approved project when components are added —
   no official statement either way; all official material frames approval as
   one-time and project-level, with enforcement as an automatic string-limit
   check.
