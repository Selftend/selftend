# The four bound surfaces as they stand today — the "before" for #1822

Captured **2026-09-04** for [#1822](https://github.com/Selftend/selftend/issues/1822), a task ticket on
map [#1813](https://github.com/Selftend/selftend/issues/1813) (reposition Selftend tools-first).

Surface 2 was added **2026-09-05** by [#1934](https://github.com/Selftend/selftend/issues/1934); it needed a
native binary rather than a browser, and the set was left open until it landed.

Everything here is a record of what a real person sees **right now**. Nothing in this folder is a
proposal, and nothing here is copy to reuse. [#1823](https://github.com/Selftend/selftend/issues/1823)
owns what the surfaces should say next.

---

## ☠️☠️ Read this first: the live surfaces are NOT the repository

This is the single most important thing the capture found, and it changes what "before" means for
every ticket downstream.

- **`origin/main` is 117 commits behind `origin/dev`.**
- **The web was last deployed 2026-08-20** (`web-deploy.yml`, from `main`). Both store binaries are
  built from `main` too; the iOS listing shows **version 0.15.0, Aug 20**.
- So the live web, the live iOS binary and the live Android binary all serve **`main`**, not `dev`.

The ticket body for #1822 quotes the landing hero as _"A free, private CBT programme — cognitive
behavioural therapy — with everyday tools for the days you cannot face it."_ **That sentence is on
`dev`. It is not what selftend.org serves.** The live hero reads:

> Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions.

### `guided self-help` — the banned compound — is live 11 times

`docs/positioning.md` § _Words never to use_ bans `guided self-help`, and `store/play-listing.md:86`
calls it _"the single highest-leverage string Selftend owns"_. The fix ([#1616](https://github.com/Selftend/selftend/issues/1616))
**is merged on `dev` and has never been released.** Verified by grepping the live web bundle
(`/_expo/static/js/web/index-a6f02574ddb13e1e4ea245092bf9d7c6.js`) — 11 hits — and by diffing
`origin/main` against `origin/dev` per key:

| file :: key                                         | LIVE (`main`)                                                                                                                                                              | `dev`                                                                                                                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.json :: landing.subtitle`                     | Calm, guided self-help tools for personal reflection.                                                                                                                      | A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it.                                                                                                            |
| `auth.json :: landingPage.heroSupport`              | Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions.                                                                          | A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it. No ads, no subscriptions.                                                                                  |
| `common.json :: safety.description`                 | Selftend is for guided self-help when there is time and safety to reflect. …                                                                                               | Selftend is a CBT programme for when there is time and safety to reflect. …                                                                                                                                                     |
| `policies.json :: privacy.sections[0].body[0]`      | Selftend is a free, open-source wellness and guided self-help application available on web, iOS, and Android.                                                              | (section rewritten) This is the short version, in plain words. …                                                                                                                                                                |
| `policies.json :: terms.pageDescription`            | Terms of service for Selftend, a free wellness and guided self-help product.                                                                                               | Terms of service for Selftend, a free, private CBT programme.                                                                                                                                                                   |
| `policies.json :: terms.sections[2].body[0]`        | Selftend is a wellness and guided self-help tool. It is not therapy, …                                                                                                     | Selftend is a CBT programme you work through on your own. It is not therapy, …                                                                                                                                                  |
| `policies.json :: terms.sections[4].body[0]`        | Use the app for its intended purpose: personal wellness and guided self-help.                                                                                              | Use the app for its intended purpose: your own reflection and the CBT programme.                                                                                                                                                |
| `policies.json :: faq.sections[0].body[0]`          | No. Selftend is guided self-help. It is not therapy, counseling, …                                                                                                         | No. Selftend is a CBT programme you work through on your own, with no practitioner involved. It is not therapy, counselling, …                                                                                                  |
| `settings.json :: onboarding.appBody1`              | Selftend is a place for guided self-help and private reflection: structured exercises drawn from established approaches, plus everyday wellbeing tools, arranged your way. | Work through something, or just do one small thing today. Modules - CBT or ACT - take you step by step; eight everyday tools take a few minutes and ask nothing of you. You'll choose in a moment, and you can change it later. |
| `settings.json :: supportPage.boundaryDescription`  | This app is built as guided self-help. If you need urgent help …                                                                                                           | _(key removed on `dev`)_                                                                                                                                                                                                        |
| `settings.json :: legal.productBoundaryDescription` | This app is for wellness and guided self-help. It does not diagnose, …                                                                                                     | This app is a CBT programme for your own use. It does not diagnose, …                                                                                                                                                           |

**All eleven are already fixed on `dev`. Zero occurrences remain in any `dev` locale file.**

Two consequences that #1823 has to hold at once:

1. **Nine of these need no copy work at all — they need a release.** Writing new copy for them would
   be rewriting a string that is already rewritten and waiting to ship.
2. **The App Store subtitle is the exception: it is wrong on `dev` too.** `store/apple-info.json`
   still reads `"Calm, guided self-help tools"`, and the weekly drift guard's live pull on
   2026-09-03 printed _"App Store Connect matches the committed listing text"_ — so that string is
   genuinely published and no pending release fixes it.

The live copy also carries American spellings the British-style gate forbids — `behavior`
(wizard panel 3), `Behavioral activation` (widget catalogue), `counseling` (FAQ). All are
British on `dev`.

---

## Surface 1 — the web landing (`selftend.org`)

Live, signed out, English. `LandingScreen` (`src/components/app/landing/landing-screen.tsx`).

| shot                                       | what it shows                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `01-web-landing-desktop-1440-hero.png`     | 1440×900, above the fold. **Faithful desktop rendering.**                                                                                |
| `02-web-landing-desktop-1440-scrolled.png` | 1440×900, scrolled to the bottom. Faithful.                                                                                              |
| `02-web-landing-desktop-1440-full.png`     | whole page in one image, ☠️ **rendered at 985px wide** — see _Capture technique_ below. Overview only; do not read column widths off it. |
| `03-web-landing-phone-390-hero.png`        | 390×844, above the fold. Faithful.                                                                                                       |
| `04a` / `04b`                              | 390×844 slices at scrollTop 800 and 1600 (max scroll 1653). Faithful.                                                                    |
| `04-web-landing-phone-390-full.png`        | whole page, 380×2497. Overview; also shows the **cookie banner** on first visit, which overlays the tool-chip row.                       |

**Verbatim live copy, in document order:**

- Eyebrow: `FREE · OPEN SOURCE · PRIVATE`
- `<h1>`: **Small tools for heavy days.**
- Support: **Calm, guided self-help - CBT and ACT modules plus eight everyday tools. No ads, no subscriptions.**
- Buttons: `Start now - no account needed` · `Create an account` · `Sign in`
- Guest note: `Your data stays in this browser until you create an account - browsers can clear it.`
- Tool chips (8): `Daily check-in` · `Journal` · `Breathing` · `Meditation` · `Grounding` · `Gratitude log` · `Sleep` · `Habits`
- `CBT MODULE` → `<h2>` **Examine unhelpful thoughts** → _A focused section built around thought records, distortion awareness, and quiet review._
- `ACT MODULE` → `<h2>` **Act on your values** → _Skills for handling difficult feelings while doing what matters - acceptance, defusion, committed action._
- `HOW IT WORKS` → `01 Start where you are` / _Pick one module or one small tool. No intake quiz, no setup._ · `02 Go at your own pace` / _Sessions are short, and nothing expires._ · `03 Review quietly` / _Look back over your entries when you're ready - they stay yours._
- `<h2>` **Yours, and private** → _Your entries are encrypted at the field level - a leaked database backup exposes only ciphertext. No ads, no subscriptions, no tracking._ → button `View the source on GitHub`
- Safety: **Selftend is for guided self-help when there is time and safety to reflect. It is not emergency support and is not monitored by crisis responders.**
- Footer links: `Open crisis guidance` · `Terms of service` · `Privacy policy` · `Cookie policy` · `FAQ` · `Join our Discord`

**Head tags, live:** `<title>Selftend</title>` and nothing else — **no `og:title`, no `og:description`, no `meta description`.** `dev`'s `public/index.html` carries `og:title = "Selftend - a free, private CBT programme"`, so the social-preview shape exists in the repo and is not deployed.

**`manifest.webmanifest`, live:** `"description": "Calm guided self-help and private reflection."` — a
**fourth** shape of the frame sentence, and it carries the banned compound. `dev` has
_"A free, private CBT programme with calm everyday tools."_ (the "third shape" the map already recorded).

---

## Surface 2 — the app-shell auth landing (`AuthLandingBlock`)

☑ **Captured 2026-09-05 from the shipped binary** ([#1934](https://github.com/Selftend/selftend/issues/1934)):

| shot                                                 | what it shows                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `13-native-auth-landing-android-phone.png`           | the landing as it opens - 1080×2400 at 420dpi, i.e. 411×914 dp |
| `13a-native-auth-landing-android-phone-scrolled.png` | scrolled to the safety line and the four footer links          |

**It is the released artefact, not a rebuild.** `origin/main` is `v0.17.0` (`56476011`) - the exact
commit that produced the `release.yml` artefact `selftend-android-aab-24` - so the AAB users install
was downloaded, converted to a universal APK with `bundletool`, and run on the `Selftend_API_35` AVD
(Android 15, en-US). Two checks that it is the live copy and not `dev`'s: the bundle's
`index.android.bundle` contains `Calm, guided self-help tools for personal reflection` **once** and
the `dev` sentence **zero** times, and Settings on that same build reports **Selftend v0.17.0**.

☠️☠️ **The surface is unreachable on the web, and that is a finding rather than an omission.**
Both call sites are platform-gated:

- `app/index.tsx:29` - `Platform.OS === "web" ? <LandingScreen /> : <AuthLandingScreen />`.
- `src/components/app/protected-layout.tsx:109-113` - signed out on web returns `null` and an effect
  redirects to `/`; only native falls through to `<AuthLandingScreen />`.

A PWA install is still `Platform.OS === "web"`, so **the PWA shows the landing too**. `AuthLandingBlock`
ships only inside the iOS and Android binaries.

☠️☠️ **A first run never reaches it.** Native arrival on a clean install is `Quick policy check`
→ the onboarding wizard, and the wizard's `Skip for now` **creates the guest account and lands on
Home** - so this surface is never seen on a first run. It is reached only once a session ends; the
capture above was taken after deleting the guest account, which returns the app to `/`. Its real
audience is the returning-and-signed-out user, not the newcomer - worth knowing before it is designed
as a front door.

☠️ **The structure recorded while charting was wrong in one place: `GetTheAppSection` does not render
here.** `src/components/app/get-the-app-section.tsx:37` returns `null` when `Platform.OS !== "web"`
(_"advertising the Android app inside the Android app ... is noise"_), and native is the **only** place
this surface exists - so the store-referral block is dead on it in **every** build, not just this one.
The shots confirm it.

**Structure as it actually renders** (`src/components/app/auth-landing-block.tsx`): 72px app icon
(rounded 16) → title → subtitle → `SignInForm` (`Continue with Google` · `or continue with email` ·
Email · Password with `Forgot your password?` · `Continue` · `Don't have an account? Sign up`) → safety
line → a wrapped row of four link buttons (`Open crisis guidance`, `Terms of service`, `Privacy policy`,
`Cookie policy`). It carries **four** footer links; the web landing carries **six** (adds `FAQ` and
`Join our Discord`). ⚠️ Not in the earlier note: the screen's header is the app mark plus a **three-dot
overflow button**, and there is no drawer affordance.

| key                         | LIVE (`main`)                                                                | `dev`                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `auth:landing.title`        | Selftend                                                                     | Selftend                                                                                                             |
| `auth:landing.subtitle`     | **Calm, guided self-help tools for personal reflection.**                    | A free, private CBT programme - cognitive behavioural therapy - with everyday tools for the days you cannot face it. |
| `common:safety.description` | Selftend is for guided self-help when there is time and safety to reflect. … | Selftend is a CBT programme for when there is time and safety to reflect. …                                          |

---

## Surface 3 — the signed-in home and the sidebar

Captured live on `selftend.org` through the **guest door** (`Start now - no account needed`), which
creates an anonymous account and needs no email.

| shot                                   | what it shows                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `09-home-guest-fresh-phone.png`        | 390×844 home, fresh guest                                                            |
| `10-home-guest-fresh-desktop-1440.png` | 1440×900 home, fresh guest                                                           |
| `11-sidebar-nav-desktop-1440.png`      | nav drawer open, 1440                                                                |
| `12-sidebar-nav-phone-390.png`         | nav drawer open, 390                                                                 |
| `16-ios-store-shot-01-home.png`        | the **published** iOS home shot — a _populated_ home on the demo account, dark theme |

**Home, live, in order:** `TODAY · FRIDAY, SEPTEMBER 4` → `<h1>` **Good afternoon.** → `<h2>` **Right
now** → _How are you?_ + a 5-point emoji radio (`Awful` `Bad` `Okay` `Good` `Great`) → `<h2>` **Your
tools** + `Arrange` and `Add tool` buttons → the tool cards (fresh guest shows only `Check-in —
Nothing yet`).

☠️ **The method appears nowhere on the home screen** — no CBT, no programme, no module. The heading is
`Your tools`. This is the same failure the map recorded on iOS (#1818, #1817 clause 1), and it is
**also true of the web home**, which nobody had checked. `16-ios-store-shot-01-home.png` confirms it on
the published store asset: greeting → mood strip → Sleep → Today's habits → **Your tools** → Check-in,
Breathing practice, Habits today, Sleep, Self-care log, Defusion. No method in frame.

**Sidebar, live, in order:**

`Home` · `Insights` · `Routines` — **MODULES**: `CBT` · `ACT` · `DBT` — **TOOLS**: `Check-in` ·
`Journal` · `Breathing` · `Grounding` · `Gratitude log` · `Meditation` · `Sleep` · `Habit tracking` —
`Reminders` · `Settings` · `Support`

Modules sit **above** Tools. This grouping is the thing the owner wants inverted. Two corrections to
the #1822 ticket body: the first group reads **`Insights`**, not "Progress", and the tools read
**`Check-in`** and **`Habit tracking`**, not "Mood tracker" and "Habits" — matching what
[#1861](https://github.com/Selftend/selftend/issues/1861) found.

**The `Add tool` catalogue** (`/arrange`), live, in order: `Check-in` · `Breathing practice` ·
`Gratitude log` · `Today's pick` · `Habits, today` · `Self-care log ·CBT` · `Thought record ·CBT` ·
`Drop anchor ·ACT` · `Observing self ·ACT` · `Choice point ·ACT` · `Sleep` · `Thinking patterns ·CBT` ·
`CBT programme` · `ACT programme` · `Worry journal ·CBT` · `Core beliefs ·CBT` ·
`Behavioral activation ·CBT` · `Exposure ladder ·CBT` · `Goals ·CBT` · `Committed actions ·ACT` ·
`Defusion ·ACT` · `Make room ·ACT` · `Journal` · `Grounding sessions` · `Routines today`.

---

## Surface 4 — the first-run onboarding wizard

Live, on the fresh guest account, every panel.

| shot                                  | what it shows                     |
| ------------------------------------- | --------------------------------- |
| `05-firstrun-consent-gate-phone.png`  | the gate that precedes the wizard |
| `06-wizard-panel1-welcome-phone.png`  | panel 1                           |
| `07-wizard-panel2-concerns-phone.png` | panel 2                           |
| `08-wizard-panel3-modules-phone.png`  | panel 3                           |

**Consent gate (live):** `Quick policy check` → _We keep this brief: please review and accept the
latest Privacy Policy and Terms to continue._ → `Read Privacy Policy` / `Read Terms of Service` → a
single checkbox: _I am 18 or older, agree to the current Privacy Policy and Terms of Service, and
consent to Selftend processing the self-help entries I choose to save, including any wellness or
mental-health reflection content I enter._ → `Accept and continue` (disabled until ticked).

⚠️ This is an inline 18+ checkbox, **not** the neutral age-and-country gate merged as `fd49def8`
(#1764/#1806). That gate is on `dev` and unreleased, so no live user has met it yet. Relevant to the
teen-access map, not to this one — recorded so nobody reads its absence as a regression.

**Panel 1 — the category declaration.** `Welcome to Selftend` →
**Selftend is a place for guided self-help and private reflection: structured exercises drawn from
established approaches, plus everyday wellbeing tools, arranged your way.** → _It is not a diagnosis
tool, therapy replacement, or emergency support. Use local emergency or crisis resources if you need
urgent help._ → `Continue`. (`Skip for now` sits top-right.)

☠️ On `dev` this panel already leads with the tools: _"Work through something, or just do one small
thing today. Modules - CBT or ACT - take you step by step; eight everyday tools take a few minutes and
ask nothing of you."_ The wizard is the one surface where a partly tools-led framing has **already
landed** in the repo.

**Panel 2 — `What brings you here?`** → _Pick anything that fits - this only arranges your dashboard.
You can change it later, and nothing here is a diagnosis._ → six options: `Anxious thoughts` ·
`Low mood` · `Stress & overwhelm` · `Sleep` · `Building habits` · `Reflection & gratitude`. These are
the "six declared onboarding goals" the map's honest-crack argument refers to.

**Panel 3 — `Would a self-help module be useful?`** → _Choose CBT, ACT, both, or neither. This is a
preference, not an assessment._ → `CBT - work with thoughts and behavior` · `ACT - make room for
feelings and act on values` → **Leave both unselected if you only want individual tools.** → `Finish`
→ _You're using Selftend as a guest - you can create an account any time from Settings to protect your
data._ (`behavior` is American here and British on `dev`.)

---

## Surface 5 — both store listings, as published

| shot                                   | what it shows                                 |
| -------------------------------------- | --------------------------------------------- |
| `14-play-listing-live-desktop.png`     | the live Play listing, full page              |
| `15-appstore-listing-live-desktop.png` | the live App Store listing, full page         |
| `16`–`21`                              | the six published iOS screenshots at 598×1300 |

### Google Play — `org.vasilyoshev.selftend`

Updated **Aug 28, 2026**. 10+ downloads, no ratings. Health & Fitness. Content rating **Everyone**.

- Short description: **A free, private CBT programme — cognitive behavioural therapy.**
- Full description opens: _Selftend is a free, private CBT programme — cognitive behavioural therapy —
  with everyday tools for the days you cannot face it. A small set of calm, private tools in one place:
  no ads, no feeds, no pressure, no AI coach._
- Bullets: daily mood check-ins · CBT tools · **ACT tools — values, defusion, expansion, grounding, and
  committed action** · Sleep tracker · **Meditation — a simple timer-based sitting practice** ·
  Gratitude, journaling, breathing · Routines and widgets.
- Closes: _Selftend is a wellness and self-help tool. It is not therapy, diagnosis, treatment, …_
- _Available in English and Bulgarian. Selftend is for adults (18+)._

☠️ Live-confirms two things the map already recorded: the word **`grounding` is spent on an ACT
pillar** while the actual Grounding tool is never named in the store (#1861 decision 2), and the
meditation line **understates the tool** (#1818).

### App Store — `id6796318929`

Version **0.15.0, Aug 20**. No ratings. Health & Fitness. **Age rating 13+.** Listing locale is
**en-US only** — there is no Bulgarian App Store listing, though the app ships Bulgarian.

- Subtitle: **Calm, guided self-help tools** — the banned compound, published.
- Promo: _Free and open source. Journalling, CBT thought records, mood and sleep tracking, breathing
  and grounding - the tools are yours to pick from, at whatever pace suits you._
- Description opens: **Selftend is a calm, free set of guided self-help tools for personal reflection.**
  → _It is not a therapist and not a diagnosis engine. It is a place to write things down, notice
  patterns, and work through them with structured exercises drawn from CBT and ACT._
- Sections: _What is inside_ (journalling, gratitude, CBT thought records **with a guided walkthrough**,
  mood/sleep/activity tracking, breathing/grounding/meditation, ACT tools, routines and habits) ·
  _How it works_ · _Your writing is yours_ · _Free, and open source_ · crisis note.
- Screenshots, in published order: `01-home` (the `Your tools` home) · `02-cbt` · `03-act` ·
  `04-check-in` · `05-journal` · `06-breathing`.

**The two listings disagree, and they disagree on the frame.** Play leads with _a free, private CBT
programme_; the App Store leads with _calm, guided self-help tools_. The map recorded this; it is
confirmed live, on both public pages.

### Two off-map defects found while checking, recorded so they are not lost

- **`developerAgeRatingInfoUrl` has drifted.** The weekly guard has failed on every run since it began
  actually comparing: committed `https://selftend.org/faq`, live `null`. That is a real
  App Store Connect drift, unrelated to positioning.
- **The App Store shows a 13+ age rating** while `docs/product-principles.md` sets an adults-only
  posture and the Play description says _"Selftend is for adults (18+)"_.
  ☑ Corroborated inside the shipped binary while capturing Surface 2: v0.17.0's own consent gate
  (`Quick policy check`) reads **"I am 18 or older, agree to the current Privacy Policy and Terms of
  Service ..."**, so the 18+ posture is what a real installer accepts today, against a 13+ listing.

---

## Capture technique, and what it can and cannot support

- **Live only.** Every app and store string here was read from the deployed surface or the live
  bundle, never from a local build — a local build serves `dev` and would have hidden the whole
  finding above.
- **The app scrolls inside a container, not the document.** `fullPage` screenshots of `selftend.org`
  silently return a viewport-sized image; the first pass produced two truncated files that looked
  complete. The `*-full.png` overviews were made by expanding that container in JS first, which
  **changes the layout width** (desktop rendered 985px instead of 1440px). Trust `01`, `02-scrolled`,
  `03`, `04a`, `04b` for anything about layout; use the `-full` images only to see the whole page at once.
- **The signed-in shots are a fresh guest account, not a seeded one.** The demo account's password is
  in Windows Credential Manager and reading it was blocked in this session, so the with-data states
  come from the six **published** iOS screenshots instead, which were shot on the seeded demo account.
  A guest home therefore under-shows the tool-card states.
- **English only**, per the ticket. Bulgarian parity stays in the map's fog.
- The guest account created for this capture was anonymous, emailed nothing, and its browser session
  was cleared afterwards.
- **Surface 2 came from the released artefact, not a local build.** `origin/main` is `v0.17.0`, the exact
  commit behind the `release.yml` artefact `selftend-android-aab-24`, so that AAB was downloaded, turned
  into a universal APK with `bundletool` 1.18.3 (debug-signed, emulator only) and run on `Selftend_API_35`.
  This keeps the _live only_ rule above: rebuilding `main` would have been a rebuild, this is the binary
  users install. The guest account it created was deleted from inside the app afterwards.
