# Claude Design brief — Selftend, tools-first

<!--
  THE PASTEABLE BLOCK STARTS AT THE NEXT HEADING AND RUNS TO THE END OF THE FILE.
  Paste it whole. It was written so the owner adds nothing from memory.

  ☠️ This file is deliberately excluded from the copy gate (`PUBLISHED_RECORDS` in
  `test/positioning-copy.test.ts`) because § "Never write" quotes the banned
  phrases in order to ban them, exactly as `docs/positioning.md` does. Nothing in
  it is copy to ship. If you want the reasoning behind any line, the ticket links
  are in `README.md` beside this file.
-->

## What you are designing

You are redesigning four surfaces of **Selftend**, a free, non-profit, open-source mental-health self-help app, so that its eight everyday tools lead and its programmes come second. The copy is decided and is given to you verbatim below. Your job is layout, hierarchy, and visual design, on the app's existing visual system, in a way a small team can build in React Native. Do not rewrite the copy. Where you think a line of copy is wrong, say so in a note rather than changing it.

Selftend runs on iOS, Android, and the web (a responsive web app that is also installable as a PWA). Every screen ships in English and Bulgarian, in light and dark, across eight user-selectable colour palettes. Design in tokens, not in hexes, and leave visible room for Bulgarian, which usually runs longer than the English.

### What Selftend is — the frame sentence, verbatim

> **Selftend is a free, private CBT self-help app — cognitive behavioural therapy — with everyday tools for right now and a programme to work through when you want one.**

The short form, for anywhere length is capped:

> **A private CBT self-help app.**

These are the only two sanctioned shapes of the sentence. Do not write a third. In particular, the old sentence — _"…with everyday tools for the days you cannot face it"_ — was deleted on purpose, because it made the tools the programme's fallback. The new frame is: the tools are something to do right now; the programme is there when you want it; CBT is the method behind both.

Vocabulary: **CBT self-help app** is the category. **Programme** means one of the modules (the CBT programme, the ACT programme) and is never the category. **Cognitive behavioural therapy** is spelled out on its first use on a surface, then **CBT**.

### Who it is for, and the state they arrive in

There is no target segment, and this brief must not invent one. Do not write or design for "people with anxiety", "young adults", "busy professionals", or any other group. What is decided is the **arrival state**: someone who wants something to do about how they feel, right now, with no commitment and no set-up. That is a use context, not a claim about who they are.

Selftend is for people aged 13 and over (or their country's higher floor). There is no separate teen mode; protections are the same for everyone. Nothing in the design should read as adults-only, and nothing should ask for more about the person than the surface needs.

## The five value themes, in the order a person meets them

Roles are named. The number is only the order of encounter, never "importance".

1. **"Something to do right now, with no commitment."** The eight everyday tools. **This LEADS.**
   Supporting line: _"Eight everyday tools that ask nothing of you — not even an account. Open one, use it, and you're done."_
2. **"You can work through something, not just track how you feel."** The programme. **This CARRIES THE FRAME** — it is where the method is named.
   Supporting line: _"Work through something, don't just track how you feel."_
3. **"You can be honest here."** **The PRIMARY DIFFERENTIATED VALUE**, stated instrumentally, never morally.
   Supporting line: _"Anything you write for an audience stops being useful to you. Yours is encrypted at rest, the key is held outside the database, the source is public, and no AI is reading it."_
4. **"You run it yourself, without a gatekeeper."** Supporting. Must read as _available without a gatekeeper_, never as _instead of professional help_.
   Supporting line: _"You run it yourself — nothing to be assigned, nobody to wait for."_ (Sanctioned tamer form if that strains: _"You run it yourself — nothing here is assigned to you."_ Do not write a third.)
5. **"It won't be taken away or turned against you."** Supporting; it answers _"what's the catch?"_
   Supporting line: _"Free because it is a non-profit, not because it is a trial. Your data exports whenever you want, and the source is public."_

### ☠️ The hard rule — the single instruction most likely to be lost in a redesign

Two clauses. Apply them to every surface you produce, and answer both reading tests in your annotations.

> **1. The tools may lead, but never appear alone.** No surface presents the tools without the method somewhere on it. The failure is not the tools being prominent — that is the point — it is the tools appearing as a **bare inventory with nothing behind them**. And the tools are never **enumerated in prose**: a sentence says what they are _for_, the page _shows_ which ones exist. Eight items in a headline is still a flat list; eight chips or eight cards under a headline is fine.
>
> **2. Privacy is never the opening claim.** It is the strongest differentiator and it still lands third. Leading with it makes a visitor read Selftend as "an anti-AI thing" before they know what it is.

Reading tests: _Is the method (CBT, the programme, a module) visible on this surface?_ and _Is privacy the first claim the eye lands on?_ The first answer must be yes and the second must be no, on every surface.

Clause 1 is **not** a deletion rule. Do not remove or shrink the tools to satisfy it; put the method beside them. The live app is failing clause 1 today — its home screen is headed "Your tools" with no module in frame — and that is the failure you are fixing, not a baseline to preserve.

## The four surfaces

Numbered as the positioning map numbers them. The "before" screenshots you have been given are of the **live** app, which is several releases behind the repository; some of the live copy is already replaced in code and merely unreleased. Design against the copy in this brief, never against the copy in the screenshots.

### Surface 1 — the web landing page (`selftend.org`, signed out)

**An existing page, re-laid-out.** Desktop (1440) and phone (390). It is the one surface that is both pre-threshold (so it carries the full frame sentence) and tools-led, so it is the worked example of the hard rule.

Copy, in document order (unchanged lines are shipped copy and stay as they are):

- Eyebrow: `Free · Open source · Private` (unchanged — privacy is last of three, so clause 2 holds)
- h1: **Open one, and you're done.**
- Support line: **A free, private CBT self-help app - cognitive behavioural therapy - with everyday tools for right now and a programme to work through when you want one. No ads, no subscriptions.**
- Buttons: `Start now - no account needed` · `Create an account` · `Sign in`
- Guest note: `Your data stays in this browser until you create an account - browsers can clear it.`
- The eight tool chips: `Check-in` · `Journal` · `Breathing` · `Meditation` · `Grounding` · `Gratitude log` · `Sleep diary` · `Habits`
- `CBT MODULE` kicker → h2 **Examine unhelpful thoughts** → _A focused section built around thought records, distortion awareness, and quiet review._
- `ACT MODULE` kicker → h2 **Act on your values** → _Skills for handling difficult feelings while doing what matters - acceptance, defusion, committed action._
- `HOW IT WORKS` → `01 Start where you are` / _Pick one small tool, or one module. No intake quiz, no setup._ · `02 Go at your own pace` / _Sessions are short, and nothing expires._ · `03 Review quietly` / _Look back over your entries when you're ready - they stay yours._
- h2 **Yours, and private** → _Your entries are encrypted at the field level - a leaked database backup exposes only ciphertext. No ads, no subscriptions, no tracking._ → button `View the source on GitHub`
- Safety line (verbatim, visually separate, never styled as a feature): _Selftend is a set of mental health tools for when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders._
- Footer links: `Open crisis guidance` · `Terms of service` · `Privacy policy` · `Cookie policy` · `FAQ` · `Join our Discord`

Ordering intent — what the layout must achieve:

1. **The eight tool chips and the frame sentence share the first viewport**, on desktop and on phone. The chips are the lead; the sentence is the method standing behind them. Today the chips sit below the CTA stack and the guest note, low enough that a short viewport shows a bare inventory. Fixing that is the main job on this surface.
2. **The h1 does not enumerate**, and no other prose does. The chip row shows the eight.
3. **The two module sections stay on the page and stay second.** They are where the method is named at length. Do not collapse them into the hero or drop them to make room for the tools.
4. **Privacy keeps its own section, well down the page.** Clause 2.

Do not: lead with privacy; list the eight tools in a sentence; show the chips without the sentence; invent a new shape of the frame sentence; move the safety line into a feature card.

### Surface 1b — the native app's signed-out landing (`AuthLandingBlock`, iOS and Android only)

**An existing screen; copy changes, layout is yours to improve.** Phone only. It does not exist on the web (a PWA install still gets Surface 1).

☠️ Its audience is not who you would guess. **A first run never reaches this screen**: a new install goes straight through a policy check into the app as a guest. This screen is seen only after a session ends — sign-out, or a deleted account. Its reader is **returning and signed out**, and its own form already says "Welcome back!". Design it for that reader: a quiet front door, not a pitch. It still carries the frame sentence because it is pre-threshold by surface identity, but the sentence is orientation here, not persuasion.

Structure as it renders: 72px app icon → title `Selftend` → subtitle → sign-in form (`Continue with Google` · `or continue with email` · Email · Password with `Forgot your password?` · `Continue` · `Don't have an account? Sign up`) → safety line → a wrapped row of four link buttons (`Open crisis guidance` · `Terms of service` · `Privacy policy` · `Cookie policy`). The header is the app mark plus a three-dot overflow; there is no drawer. There is no "get the app" block on this screen and there never was — do not add one.

Copy:

- Subtitle: **A free, private CBT self-help app - cognitive behavioural therapy - with everyday tools for right now and a programme to work through when you want one.**
- Safety line: same as Surface 1, verbatim.

### Surface 2 — the two store listings

**Copy only. Not a design surface in this brief.** The text is decided and given here so you know what the store says; the store _screenshots_ will be re-shot from the built app after this redesign is implemented, in a separate effort. Do not design store screenshots or store-listing layouts.

- App Store subtitle (30-char cap): **A private CBT self-help app.**
- App Store promotional text: _Eight everyday tools that ask nothing of you - not even an account. And a CBT programme to work through when you want one. Free and open source, no ads, no subscriptions._
- Play short description (80-char cap): **A private CBT self-help app.**
- Play full description, first paragraph: _Selftend is a free, private CBT self-help app — cognitive behavioural therapy — with everyday tools for right now and a programme to work through when you want one. A small set of calm, private tools in one place: no ads, no feeds, no pressure, no AI coach._

### Surface 3 — the signed-in Home, and the sidebar

**A NEW surface, already specified.** Home is being rebuilt by a separate, closed decision map ("Home → Favourites"), and its spec is the authority for anything this brief does not say — where the two disagree, the spec wins. Design phone (390) and desktop (1440), light and dark, and the open sidebar at both widths.

The section stack, top to bottom, inside the existing 720px content column:

| #   | Section        | Heading (h2)                                                                            | Renders                                       |
| --- | -------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Greeting       | none — eyebrow `Today · {date}` over `Good morning` / `Good afternoon` / `Good evening` | always                                        |
| 2   | **Favourites** | `Favourites`                                                                            | always — the starred cards, or one quiet line |
| 3   | **Tools**      | `Tools`                                                                                 | always, all eight                             |
| 4   | **Modules**    | `Modules`                                                                               | **always, unconditionally**                   |

☠️ **The Modules section may never be hidden when Favourites is empty, collapsed behind a disclosure, or deferred below a "show more".** This is the hard rule's clause 1 applied to Home, and it is the exact fix for the live failure. Design the empty-Favourites, fresh-guest state and show all three modules on it.

Deleted from today's Home, so do not carry them forward: the `Right now` mood strip, the `Arrange` and `Add tool` header buttons, the dashed empty-state box with its three buttons, the `Guided programmes` tier, and the `Your tools` heading (it loses its possessive on purpose — the section is the whole catalogue, and the possessive moves to Favourites, which earns it).

**The card** — one component, used identically in Favourites and in the two catalogue sections. A favourited item simply appears twice, unmarked. Shape: `mark → name / what-it-is / what-you-have → star`, on an inert bordered card (`rounded-2xl border bg-card p-4`, in the app's classes), holding two interactive siblings: the navigating region and the star.

- The **mark** is a MaterialIcons glyph for a tool (muted-foreground ink) or a two-to-three-letter abbreviation for a module — `CBT`, `ACT`, `DBT` — in foreground ink, because the abbreviation is content. No border around the mark.
- **What-you-have** is a one-line stat for tools only (e.g. a count of entries this week). A module card has **no stat line and no blank slot** where one would be. While data is loading, draw no stat and no star — never a zero and never a hollow star, because both are claims.
- The **star** is the trailing 44px column, alone; there is no chevron. Glyph `star` / `star-outline`, never a heart (the heart is the gratitude tool's own glyph). Off: muted-foreground. On: the app's primary colour. It flips optimistically with no pending state.
- Cards wrap in a row: min width 260, flex 1. A mixed row stretches to the tallest card; that is accepted.

Copy for the cards (tool names are canonical and appear identically in the sidebar, on `/tools`, and in the store):

| Tool          | What it is                    |
| ------------- | ----------------------------- |
| Check-in      | Patterns over time            |
| Journal       | Private free-text reflection  |
| Breathing     | Calm your nervous system      |
| Grounding     | Anchor to the present         |
| Gratitude log | Notice the small wins         |
| Meditation    | Train steady attention        |
| Sleep diary   | Log and review your sleep     |
| Habits        | Build consistent daily habits |

| Module (abbreviation mark) | Name                          | What it is          |
| -------------------------- | ----------------------------- | ------------------- |
| CBT                        | Cognitive behavioural therapy | Think · Act · Be    |
| ACT                        | Acceptance & commitment       | Act on what matters |
| DBT                        | Dialectical behaviour therapy | Four skill groups   |

Order within the eight tools is free; the order above is today's. Modules are always CBT, ACT, DBT.

Empty Favourites: one muted line under the heading, no box, no button — **Star a tool or a module to keep it here.** The catalogue is directly below it, so a "browse" door would be a link to the next paragraph.

Star labels for accessibility: `Favourite {name}` / `Remove {name} from favourites`. No success toast on starring. A failed save shows a title-only toast, `Couldn't save`.

**The sidebar.** The decided change is a re-order: **TOOLS above MODULES**, so the sidebar and Home agree on the order of encounter. Everything else stays. Rows, top to bottom: `Home` · `Looking back` · `Routines` — **TOOLS** `Check-in` · `Journal` · `Breathing` · `Grounding` · `Gratitude log` · `Meditation` · `Sleep diary` · `Habits` — **MODULES** `CBT` · `ACT` · `DBT` — `Reminders` · `Settings` · `Support`. (The live build reads `Insights` where the repository now reads `Looking back`; use `Looking back`.) The sidebar is a drawer on phone and a persistent column on desktop.

### Surface 4 — the first-run welcome

**An existing five-panel wizard collapsing to ONE panel.** Phone. The other four panels — what brings you here, module choice, guidance preference, starter routine — are deleted by the same Home map; nothing replaces them, and designing a replacement first-run flow is out of scope. The consent and age-floor check that precedes this panel is legal copy and is not yours to design.

This panel is post-threshold, so it does **not** carry the frame sentence and does not declare a category. It still names the method (clause 1 reaches here too): a welcome that named only tools would be the bare-inventory failure on the first screen a person sees.

Copy:

- Title: **Welcome to Selftend**
- Body 1: **Start with one small thing - a check-in, a breath, a few lines. Or open a module - CBT or ACT - and work through something step by step. Nothing is set up in advance, and you can change what you use whenever you like.**
- Body 2 (safety, unchanged, visually separate): _Selftend is not a diagnosis tool, therapy replacement, or emergency support. Use local emergency or crisis resources if you need urgent help._
- One primary action (today's label is `Continue`) and a quiet `Skip for now`. Both close the panel and land on Home; neither preselects anything.

Do not promise a choice that is coming ("you'll choose in a moment") — there is no next panel.

## Never write

These are not style preferences. Four of the six phrase bans are enforced by a merge gate in the repository, and copy that trips one cannot ship.

| Never                                                                                                                                                                                                                      | Why                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **guided self-help** (also with one word between, e.g. "guided CBT self-help")                                                                                                                                             | Clinically means _with a practitioner_. Selftend has none. This is the phrase the live app ships most, and it is the one most likely to come back in a redesign. |
| A management verb over a health or condition object: _manage / treat / cure / fix / improve / work on_ **your** _mental health / wellbeing / anxiety / depression / panic / trauma / OCD / burnout / symptoms / condition_ | Implies a clinical outcome the product does not deliver. _Look after_, _take care of_, _tend_ are fine with the same objects. _Self-manage_ on its own is fine.  |
| **end-to-end**, **zero-knowledge**, **even we can't read them**                                                                                                                                                            | False. The design is provider-recoverable.                                                                                                                       |
| **AI therapist / AI counsellor / AI coach**, as something Selftend is                                                                                                                                                      | The negation ("no AI coach") is fine and is shipped copy.                                                                                                        |
| **no streaks**, **no streak pressure**, **streak-free**                                                                                                                                                                    | There are no streaks in the build, and their absence is never a pitch.                                                                                           |
| **AI-powered**                                                                                                                                                                                                             | AI is not part of the product.                                                                                                                                   |

Also never: copy implying diagnosis, treatment, a medical outcome, or emergency support; "come back tomorrow" or any line that prescribes a return; content that varies by date or visit on an otherwise unchanged surface; loss-framed progress; an unprompted modal triggered by the person's behaviour or absence.

Allowed adjacent phrasing: "no pressure", "no shame", "no ads, no subscriptions", "no account needed".

**The privacy boundary — sayable and not.** Sayable: _encrypted at rest_, _encrypted at the field level_, _the key is held outside the database_, _the source is public_, _no AI is reading it_, _no account needed to check any of that_. Never: the three phrases in the table above.

**British spelling, enforced by the same gate:** programme, behaviour, behavioural, favourite, colour, organise, practising, recognise, judgement, fulfil, counsellor, journalling. Identifiers and URLs keep their existing spelling.

## Product rules that shape layout

- **Free, non-profit, no ads, no subscriptions, no paywall.** Nothing in the design implies a tier, a trial, or an upsell.
- **Optional everything.** Streaks do not exist. Reminders, routines, and any gamification are opt-in, quiet by default, and non-punitive. Missing a day is never surfaced as a loss.
- **Fulfilling, and done.** A surface is designed to be used and left, not reopened. No engagement mechanics.
- **Modular.** People choose the parts they want. Nothing preselects a module.
- **AI is not in the product.** No assistant, no chat, no generated content.
- **Crisis guidance is visible, calm, and clearly separate** from the self-help features. Safety lines are never styled as features and never buried.
- **Registration is optional.** First use creates a guest silently; creating an account is an invited conversion, never a gate and never nagged.

## The visual system — design on it, not beside it

The app is **Expo + React Native + TypeScript**, styled with **NativeWind (Tailwind classes)**, with **`@rn-primitives`** for accessible primitives. What comes back must be buildable on that stack by one or two people, so prefer the existing components and tokens over new ones.

**Colour tokens** (the "quiet-lilac" default; seven other palettes reuse the same twenty names, so never hard-code a hex — name the token):

| Token                                | Light                               | Dark                                |
| ------------------------------------ | ----------------------------------- | ----------------------------------- |
| background                           | hsl(260 28% 96%)                    | hsl(260 20% 9%)                     |
| foreground                           | hsl(260 18% 14%)                    | hsl(260 30% 96%)                    |
| card / card-foreground               | hsl(260 28% 99%) / hsl(258 22% 15%) | hsl(260 16% 16%) / hsl(260 30% 96%) |
| primary / primary-foreground         | hsl(262 62% 56%) / white            | hsl(264 72% 72%) / hsl(260 22% 12%) |
| primary-ink (primary as small text)  | hsl(262 62% 28%)                    | hsl(264 72% 80%)                    |
| secondary / secondary-foreground     | hsl(260 8% 92%) / hsl(260 12% 24%)  | hsl(260 8% 22%) / hsl(260 24% 92%)  |
| muted / muted-foreground             | hsl(260 14% 95%) / hsl(260 8% 42%)  | hsl(260 12% 18%) / hsl(260 12% 72%) |
| accent / accent-foreground           | hsl(260 28% 93%) / hsl(260 28% 25%) | hsl(260 20% 24%) / hsl(260 32% 93%) |
| destructive / destructive-foreground | hsl(0 72% 48%) / white              | hsl(0 68% 64%) / white              |
| border, input                        | hsl(260 14% 87%)                    | hsl(260 12% 24%) / hsl(260 12% 22%) |
| ring                                 | hsl(262 62% 64%)                    | hsl(264 72% 72%)                    |

Radius token: 10px (`--radius`); cards use `rounded-2xl`.

☠️ **Chrome is neutral.** There are eight named hues (think, act, be, aqua, mist, iris, ink, clay) but they are an **encoding palette only** — a colour survives only where it carries information the person reads off it (a scale, a live state, a colour they chose). Module identity is **icon and label, never colour**: do not tint the CBT card, the ACT section, or the sidebar groups. Chrome roles: body text = foreground; secondary text = muted-foreground; a decorative glyph = muted-foreground; an interactive/selected mark = primary; hairlines = border; a badge sits on secondary.

**Type.** Body: Noto Sans (400, 500, 600, 700, 800 are loaded). Display: **Nunito ExtraBold (800)** for h1 and h2 and hero numerals. Heading levels are explicit and semantic on the web (each screen has one h1; sections are h2).

**Icons.** MaterialIcons only, through the app's `Icon` wrapper (icons are hidden from assistive tech by default and sized/coloured by class). Brand marks (Google sign-in) are the only exception.

**Layout constants.** Content column 720px for home-type screens, 620px for forms; content is centred inside the shell. Phone floor 360 wide. The one responsive breakpoint is 640. Touch targets are 44px. Cards wrap at min-width 260.

**Existing components** (use them before inventing): Text (with heading variants), Button, Card, Badge, Input, Textarea, Checkbox, Switch, Label, Popover, Avatar, Icon. The house empty state renders its own card — Home's empty-Favourites line deliberately does not use it.

**Files to look at if you have the repository**: `global.css` (tokens, both schemes), `src/lib/theme/styles.ts` (all eight palettes), `src/lib/theme/chrome.ts` (chrome roles), `src/lib/theme/encoding.ts` (where hue survives), `tailwind.config.js`, `src/components/react-native-reusables/`, `src/lib/layout.ts`, `docs/accessibility.md`, `docs/architecture.md`.

## What NOT to design

- Any change to **which tools and modules exist**, or what onboarding preselects. The inventory is eight tools and three modules; do not add, merge, rename, or remove one.
- A replacement **first-run flow** beyond the single welcome panel.
- The **consent / age-floor gate**, policy pages, or legal copy.
- **Store screenshots** or store-listing layouts.
- The **app icon, the name, or the brand mark**.
- Anything about **pricing, donations, or monetisation**.
- **Notifications, reminders, streaks, or re-engagement** of any kind.
- **AI features** or a chat surface.
- Implementation. The designs come back to a separate implementation effort; do not produce code.

## What to deliver

For each surface: the screens named above, annotated. On every screen, answer the two reading tests in a note — _where is the method on this surface?_ and _what is the first claim?_ — and mark any place you departed from the copy or the Home spec, with the reason. Show Surface 3 in both light and dark, and the fresh-guest state (empty Favourites) as well as a populated one. Keep every string in this brief verbatim; leave visible room for Bulgarian.
