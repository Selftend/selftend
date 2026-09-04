# The Claude Design handoff — tools-first Selftend (#1825)

The second destination artefact of map [#1813](https://github.com/Selftend/selftend/issues/1813)
(_reposition Selftend tools-first_), assembled **2026-09-05** for
[#1825](https://github.com/Selftend/selftend/issues/1825). It is the brief the redesign is made from,
kept in the repo so the follow-on implementation map reads the same brief the designs came from.

☠️ **This package closes the positioning map. It does not open the implementation.** Whatever Claude
Design returns starts a new map; nothing in this folder is a ticket.

The package is three things:

| Part                         | Where                                                 | What it is                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. The prompt**            | [`prompt.md`](prompt.md)                              | One pasteable block. Frame sentence, arrival state, the five themes and the hard rule, the four surfaces with their decided copy and ordering intent, the non-negotiable constraints, the visual system, and what not to design. |
| **2. The screenshots**       | [`../1822-before/`](../1822-before/) — manifest below | The four surfaces as a real person sees them today, captured live from `selftend.org`, the shipped Android binary and both public store pages.                                                                                   |
| **3. The decisions summary** | this file, below                                      | One line per decision, linked to the ticket that holds it, so a design question that turns out to be a positioning question is traced, not re-litigated.                                                                         |

## How to use it

1. Paste the whole of `prompt.md` from its first `##` heading to the end.
2. Upload the images in the manifest below, in surface order, and name each with its label.
3. When a design question comes back that is really a positioning question, find the row in
   § _The decisions_ and open the ticket. The answer is on its resolution comment. Do not answer it
   from the brief, and do not re-open it in the design tool.

⚠️ **The prompt is excluded from the copy gate on purpose** (`PUBLISHED_RECORDS` in
`test/positioning-copy.test.ts`): it spells the banned phrases out in order to ban them, exactly as
`docs/positioning.md` does, because the designer reads the brief and never the repo. Nothing in it is
copy to ship. This README stays inside the gate.

## The image set, labelled

Every file lives in [`../1822-before/`](../1822-before/) and is described in that folder's README,
which also records what each capture can and cannot support. ☠️ **Every image shows the LIVE app,
which serves `main` — several releases behind `dev`.** Some live copy is already replaced in the
repository and merely unreleased; the brief says which. The design's "before" is what a visitor sees,
so the live shots are the right before — but the copy in them is never the copy to design against.

### Surface 1 — the web landing (`selftend.org`, signed out)

| Upload as                        | File                                       | Notes                                                                           |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `S1 desktop hero`                | `01-web-landing-desktop-1440-hero.png`     | 1440×900 above the fold. Faithful.                                              |
| `S1 desktop scrolled`            | `02-web-landing-desktop-1440-scrolled.png` | 1440×900 at the bottom. Faithful.                                               |
| `S1 desktop full (overview)`     | `02-web-landing-desktop-1440-full.png`     | ☠️ rendered at 985px wide — whole-page overview only; never read widths off it. |
| `S1 phone hero`                  | `03-web-landing-phone-390-hero.png`        | 390×844 above the fold. Faithful.                                               |
| `S1 phone scroll 2` / `scroll 3` | `04a-…-scroll2.png`, `04b-…-scroll3.png`   | 390×844 slices. Faithful.                                                       |
| `S1 phone full (overview)`       | `04-web-landing-phone-390-full.png`        | 380×2497 overview; shows the first-visit cookie banner over the chip row.       |

### Surface 1b — the native signed-out landing (`AuthLandingBlock`)

| Upload as                      | File                                                 | Notes                                                |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| `S1b native landing`           | `13-native-auth-landing-android-phone.png`           | The shipped v0.17.0 binary on a 411×914 dp emulator. |
| `S1b native landing, scrolled` | `13a-native-auth-landing-android-phone-scrolled.png` | To the safety line and the four footer links.        |

### Surface 2 — the store listings (copy only; context, not a design surface)

| Upload as                     | File                                                                   | Notes                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S2 Play listing (live)`      | `14-play-listing-live-desktop.png`                                     | Leads with the programme.                                                                                                                         |
| `S2 App Store listing (live)` | `15-appstore-listing-live-desktop.png`                                 | Leads with the tools; subtitle carries the banned compound. The two listings disagree today.                                                      |
| `S2 iOS shot 01–06`           | `16-ios-store-shot-01-home.png` … `21-ios-store-shot-06-breathing.png` | The six published iOS screenshots, 598×1300, shot on the seeded demo account in dark. **Shot 01 doubles as the populated "before" of Surface 3.** |

### Surface 3 — the signed-in Home and the sidebar

| Upload as                                 | File                                   | Notes                                                                                           |
| ----------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `S3 home, fresh guest, phone`             | `09-home-guest-fresh-phone.png`        | 390×844. Empty-ish state; heading `Your tools`, no method in frame — the live clause-1 failure. |
| `S3 home, fresh guest, desktop`           | `10-home-guest-fresh-desktop-1440.png` | 1440×900.                                                                                       |
| `S3 sidebar, desktop`                     | `11-sidebar-nav-desktop-1440.png`      | Modules above Tools — the order the brief inverts.                                              |
| `S3 sidebar, phone`                       | `12-sidebar-nav-phone-390.png`         | The drawer.                                                                                     |
| `S3 home, populated (published iOS shot)` | `16-ios-store-shot-01-home.png`        | Same file as S2 shot 01; the only with-data Home capture.                                       |

### Surface 4 — the first-run welcome

| Upload as                        | File                                                                        | Notes                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `S4 consent gate (context only)` | `05-firstrun-consent-gate-phone.png`                                        | Precedes the wizard; legal, not to be designed. The live inline 18+ checkbox is already replaced on `dev` by the age-floor step. |
| `S4 panel 1 — welcome`           | `06-wizard-panel1-welcome-phone.png`                                        | The one panel that survives.                                                                                                     |
| `S4 panels 2–3 (being deleted)`  | `07-wizard-panel2-concerns-phone.png`, `08-wizard-panel3-modules-phone.png` | Context only: these panels are removed by map #1885, not redesigned.                                                             |

## The decisions

One line each. **The answer lives on the ticket's resolution comment, never here.** Ordered by the
route the map walked.

| Decision                                                                                                                            | Gist                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [What shelf do people reach for, and what do the tools-led incumbents lead with?](https://github.com/Selftend/selftend/issues/1816) | The "fatal" guided-audio table stake does not bind (Finch ships none, 747k ratings). No search volume is obtainable; four labelled proxies, no invented numbers. The incumbents are alive, so "into a vacated category" is unavailable.                                                                                                 |
| [Does "self-manage your mental health" clear the safety guardrails?](https://github.com/Selftend/selftend/issues/1815)              | The verb survives; the pairing dies. A management verb may not take a health-or-condition object. `mental health` as a noun is cleared.                                                                                                                                                                                                 |
| [Name the new market category, and answer the wellness/toolkit refusal](https://github.com/Selftend/selftend/issues/1814)           | **"A CBT self-help app."** The method stays inside the noun; `programme` becomes the module's noun only. Style: head-to-head on a crowded shelf, minus leadership, minus the reach claim. Never defend the frame on store pull.                                                                                                         |
| [Re-order the value themes with the tools leading](https://github.com/Selftend/selftend/issues/1817)                                | Five themes; the 1–4 ranking is retired for three named roles. Tools LEAD, programme CARRIES THE FRAME, honesty is the PRIMARY DIFFERENTIATOR and lands third. The hard rule becomes two clauses: tools never alone; privacy never first.                                                                                               |
| [Which table stakes does a tools-led frame re-import? Rebuild the refusals table](https://github.com/Selftend/selftend/issues/1818) | A stake is imported by the category noun a visitor assigns, not by a tool in a list — so clause 1 is what holds the whole refusals table up. Two new refusals (`habit tracker`, `a sleep app`). Selftend does ship guided audio; the gap is a narrated library. Meditation leads framed _unguided_ (weakest-authority item on the map). |
| [Re-rank the competitive alternatives](https://github.com/Selftend/selftend/issues/1859)                                            | Order holds; cluster 3's membership swaps from the graveyard to the living shelf, and the AGPL leg becomes unique for the first time. "No account needed" folds into the privacy compound as a fourth leg.                                                                                                                              |
| [Write the new frame sentence, short form, and supporting lines](https://github.com/Selftend/selftend/issues/1819)                  | The 164-char sentence and the 28-char short form. The short form is a 30-character object because the App Store subtitle is capped; `free` drops from it, `private` stays. The old tail is deleted, not moved. Five supporting lines, one per theme.                                                                                    |
| [Does product-principles.md have to change, and is that hierarchy move legal?](https://github.com/Selftend/selftend/issues/1820)    | The hierarchy was respected: only line 3 of the principles is copy; none of the twelve principles depends on the frame. §6 was widened to say the guardrail reaches what a phrase means in the clinic. `AGENTS.md:126` deliberately untouched → [#1902](https://github.com/Selftend/selftend/issues/1902).                              |
| [Does the new frame leave any ban dead rather than wrong?](https://github.com/Selftend/selftend/issues/1872)                        | No row dies; three get livelier. The compound ban is widened to allow one intervening word (the frame's own `CBT`). A ban leaves the table when its reason dies, never when its violations run out.                                                                                                                                     |
| [Does the warrant-to-continue survive the shelf move?](https://github.com/Selftend/selftend/issues/1860)                            | Stays whole: 30 W4-retained users by 2027-08-31. The number is upstream of the style. Two clocks stay apart: the frame re-check (2027-02-28) is never a survival referendum.                                                                                                                                                            |
| [Rewrite docs/positioning.md to the new frame](https://github.com/Selftend/selftend/issues/1824)                                    | Merged (PR #1915). The management-verb ban shipped at half its proposed width because the bare words are safety copy. Nothing user-visible changed.                                                                                                                                                                                     |
| [Do the eight tools' names read as a set now they lead?](https://github.com/Selftend/selftend/issues/1861)                          | Two names were the two refused category nouns: `Habit tracking` → **Habits**, `Sleep` → **Sleep diary**. `Grounding` keeps its name; the store stops spending the word on an ACT pillar. One canonical name per tool. The bg twin of Check-in is the owner's to author.                                                                 |
| [Capture the four surfaces as they stand today](https://github.com/Selftend/selftend/issues/1822)                                   | The live surfaces are not the repository: `main` is 100+ commits behind `dev`, the banned compound is live eleven times, and nine of those need a **release**, not copy. The App Store subtitle is the one real copy defect.                                                                                                            |
| [What each of the four surfaces says and shows, tools-first](https://github.com/Selftend/selftend/issues/1823)                      | Copy for surfaces 1 and 2 (h1 → _"Open one, and you're done."_; the four ordering-intent points; both store fields). Surface 3 was already decided by map #1885 and surface 4 gutted by it; the map asserted clause 1 there and deferred the rest. The sidebar flips TOOLS above MODULES as a sequence call.                            |
| [Three store fields have a length cap, not one](https://github.com/Selftend/selftend/issues/1940)                                   | Subtitle 30, promoText 170, Play short 80. The rule was not reopened; Play's short line takes the short form. `docs/positioning.md` has no automated check of its own facts → [#1944](https://github.com/Selftend/selftend/issues/1944).                                                                                                |
| [Capture the native auth landing from a main build](https://github.com/Selftend/selftend/issues/1934)                               | Captured from the shipped AAB. Three corrections: no store-referral block ever renders there, a first run never reaches it, and its reader is returning-and-signed-out.                                                                                                                                                                 |
| [Assemble the Claude Design handoff](https://github.com/Selftend/selftend/issues/1825)                                              | This folder.                                                                                                                                                                                                                                                                                                                            |

### Decided elsewhere, binding on the brief

| Decision                                                                                                            | Gist                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Home → Favourites (map #1885)](https://github.com/Selftend/selftend/issues/1885) — the spec is its closing comment | Home = greeting → Favourites → all eight tools → all three modules, one card, a star, no `Arrange`, no `Right now`. The modules section renders unconditionally — a positioning obligation posted by #1823 onto [#1894](https://github.com/Selftend/selftend/issues/1894). |
| [Which onboarding panels die (#1891)](https://github.com/Selftend/selftend/issues/1891)                             | Four of five panels go; `welcome` stands alone.                                                                                                                                                                                                                            |
| [Which surfaces carry the frame (map #1755)](https://github.com/Selftend/selftend/issues/1755)                      | A surface carries the frame sentence only if a person can meet it before crossing into the product. Post-threshold surfaces are free not to declare — but clause 1 still reaches them.                                                                                     |
| [Retention by return, not engagement (ADR-0004)](../../adr/0004-retention-by-return-not-engagement.md)              | "Fulfilling, and done." Nothing is designed to be reopened.                                                                                                                                                                                                                |
| [The update offer is a modal (ADR-0003)](../../adr/0003-update-offer-is-a-modal.md)                                 | Unprompted modals only on a fact about the app, never the person's behaviour.                                                                                                                                                                                              |

## Carried forward, not in the brief

- **Bulgarian.** Every string in the brief needs its `bg` twin at implementation; the brief asks the designer only to leave room. The bg name for _Check-in_ is the owner's to author (#1861).
- **The release that is already owed.** Nine live banned-phrase sightings and the 18+ consent line are fixed on `dev` and unreleased (#1822, #1934). The designs do not fix them; a release does.
- **Safety and legal copy still name the retired category noun.** `common:safety.description`, `settings:legal.productBoundaryDescription` and four policy sections still say _"a CBT programme"_ where the category is now _a CBT self-help app_. Exempt as a class from the frame rule, and four sites are consent-digest-bearing, so it is an owner call → [#1957](https://github.com/Selftend/selftend/issues/1957). The brief hands the designer the current line verbatim.
- **The App Store `description`** has no committed baseline (`store/README.md`), so it was not rewritten blind (#1823).
- **Store screenshots** are re-shot from the built app after implementation, not designed here — deferred by [#1893](https://github.com/Selftend/selftend/issues/1893) to a later effort against a shipped design.
- **`AGENTS.md:126`** subordinates the tools in scope wording; positioning has no authority over it → [#1902](https://github.com/Selftend/selftend/issues/1902).
