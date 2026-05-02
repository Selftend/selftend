# Roadmap

## 1. Product summary

Build a free, non-profit, cross-platform mental health app for iOS, Android, and the web using a single Expo-based product stack.

The product should feel calm, useful, and safe:

- [ ] guided self-help first
- [ ] optional, non-punitive gamification
- [ ] account-required MVP for continuity across platforms
- [ ] modular features so users can choose what they want
- [ ] privacy-conscious and quiet by default
- [ ] open-source with a contributor-friendly operating model

## 2. What the MVP must accomplish

The MVP is not "everything mental health." It is a focused foundation that proves the product is useful without becoming overwhelming.

### MVP goals

- [ ] help users check in, reflect, and use a small set of practical tools
- [ ] make the product feel encouraging without making people feel trapped or guilty
- [ ] support cross-platform continuity with a required account
- [ ] establish the legal, privacy, contributor, and launch groundwork needed for a real public product

### MVP features

- [ ] Google sign-in, email magic link, sign-out, and session restore
- [ ] onboarding that sets expectations and allows feature selection
- [ ] daily or on-demand mood check-in
- [ ] lightweight journaling
- [ ] a small set of guided self-help tools
- [ ] optional quests or habits
- [ ] optional streaks, disabled by default or framed as soft progress
- [ ] explicit notification controls
- [ ] progress view focused on reflection, not pressure
- [ ] settings page with feature toggles, notification controls, privacy/data controls, and support/legal links
- [ ] support page linking to GitHub, contribution guidance, gratitude, donation options, and sharing guidance

### MVP non-goals to keep excluding

- [x] open social feed
- [x] public posting
- [x] peer-to-peer messaging
- [x] AI coach / AI therapist features
- [x] heavy therapist workflows
- [x] large content library
- [x] a broad "all conditions" taxonomy

## 3. Phase plan

### Phase 0: Foundation and trust

Before app implementation, complete the planning and operating groundwork:

- [ ] finalize working title and brand direction
- [x] lock the technical stack
- [x] write privacy, safety, and content principles
- [x] set contribution flow and maintainer model
- [x] prepare a lightweight launch/legal checklist
- [ ] review all-ages implications before public launch
- [x] create the initial GitHub repository
- [x] bootstrap the first local implementation scaffold

### Phase 1: MVP build

1. [x] decide the backend approach for the first end-to-end scaffold
2. [x] decide the remaining architecture choices needed for the first end-to-end scaffold
3. [x] confirm Supabase as the operational backend for the first live environment
4. [x] keep Expo as the client app framework, not the primary backend runtime
5. [x] avoid a separate custom JS backend by default
6. [x] decide whether any early backend logic belongs in Supabase Edge Functions
7. [x] create a real Supabase project
8. [x] add real `.env` values
9. [ ] confirm the first migration is applied and recorded in the active Supabase project
10. [x] verify live Google sign-in on web
11. [x] verify live CBT thought-record persistence on web
12. [ ] verify live auth and persistence on device builds
13. [ ] verify local reminders on real devices
14. [x] link the Expo project to EAS and add Android development-build workflow for device testing
15. [ ] manually review the scaffolded codebase and capture follow-up fixes
16. [x] push the initial setup to GitHub

Working rule for Android development:

- [x] use the installed Android development build for normal development and device verification
- [x] do not treat Expo Go as the primary Android development runtime

Working rule for early backend logic:

- [x] use Supabase Edge Functions for early server-side backend work when client-only code or direct database access is not enough

Ship a usable product on iOS, Android, and browser with these pillars:

- [ ] account and onboarding
- [ ] check-ins
- [ ] journaling
- [ ] a small tools library
- [ ] optional progress/gamification
- [ ] settings/support/privacy

Implementation priorities:

1. [ ] auth and account flows
2. [ ] data model for users, entries, check-ins, preferences, and enabled modules
3. [ ] onboarding and feature selection
4. [ ] core check-in and journaling flows
5. [ ] first tools library
6. [ ] progress and optional habit mechanics
7. [ ] settings, support, privacy, and legal pages
8. [ ] accessibility, offline tolerance, and error handling

Initial scaffold work completed so far:

- [x] Expo Router + TypeScript project scaffold
- [x] auth UI scaffold
- [x] protected route shell
- [x] first CBT module scaffold
- [x] settings / support / legal surfaces
- [x] public privacy, terms, crisis, and account-deletion routes
- [x] Supabase schema draft
- [x] Google OAuth sign-in wired for web and native app flows
- [x] passwordless email magic-link sign-in wired for web and native app flows
- [x] CI and test harness
- [x] local web smoke test of the scaffold
- [x] Expo project linked to EAS and Android development-build workflow added for native reminder testing
- [x] local setup docs aligned around the current Node engine floor for Expo SDK 54

### Phase 2: Ready-for-public-product pass

This phase turns the MVP into a product that can be responsibly promoted.

- [ ] accessibility audit
- [x] privacy policy and terms implementation draft
- [x] safety and crisis resource copy implementation draft
- [ ] human/legal review of privacy policy and terms
- [ ] human/legal review of safety and crisis resource copy
- [ ] data export and account deletion
- [ ] minimal observability and incident response process
- [ ] app store assets and copy
- [ ] FAQ and support workflows
- [ ] backup and recovery plan
- [ ] contributor docs for code, content, and design

Launch-prep completed:

- [x] static web deployment checklist for Cloudflare Pages or equivalent hosting
- [x] Supabase production redirect and Google OAuth configuration checklist
- [x] Android closed-testing checklist, build commands, store-copy draft, and tester instructions
- [x] Google Play Health apps, Data safety, and account-deletion policy requirements called out
- [x] self-hosting defined as build-time Supabase portability for the pre-Android milestone
- [x] self-hosting docs and public env template added

Immediate launch blockers:

- [x] temporary public web-test domain selected: `yoshevbot.uk`
- [x] temporary support alias created: `support@yoshevbot.uk`
- [ ] `yoshevbot.uk` connected to the static web deployment
- [ ] privacy, security, and deletion aliases configured
- [ ] legal entity or nonprofit account details confirmed
- [x] broad/global crisis-resource intent captured
- [ ] global crisis-resource strategy approved
- [ ] Google Play organization/nonprofit developer account created or confirmed
- [ ] final public app name approved before Play upload; current candidate is `SteadyHearth`
- [ ] production Supabase redirect URLs configured
- [ ] closed-test Android build verified on a real device

### Phase 3: Post-MVP product expansion

Expand the product without losing focus.

Likely additions:

- [ ] more mental health modalities beyond CBT
- [ ] grounded reflection tools
- [ ] behavioral activation
- [ ] coping plans and kits
- [ ] sleep / stress / energy support
- [ ] better personalization
- [ ] module enable / disable and custom home
- [ ] improved trends and summaries

Possible later additions:

- [ ] trusted-circle sharing
- [ ] therapist companion exports
- [ ] private supporter roles

- [x] only explore these after the MVP is clearly useful and stable

### Phase 4: Community and popularization

The product and the open-source community need separate but aligned growth work.

#### User growth

- [ ] claim primary handles early
- [ ] launch a simple public site or landing presence
- [ ] create a public roadmap and changelog habit
- [ ] publish calm educational posts and feature explainers
- [ ] encourage sharing through usefulness, not pressure
- [ ] add app store presence once the product is stable

Recommended channel rollout:

1. [ ] GitHub
2. [ ] Discord
3. [ ] website / docs presence
4. [ ] Reddit community after MVP
5. [ ] one or two social platforms with the highest likelihood of sustained upkeep
6. [ ] additional platforms only after a repeatable content rhythm exists

#### Contributor growth

- [ ] make the first contribution easy
- [ ] keep a clean issue taxonomy
- [ ] publish contributor roles
- [ ] use GitHub Discussions or Discord for onboarding questions
- [ ] recognize contributors publicly
- [ ] invite docs, content, translation, design, and QA contributions, not just code

## 4. Suggested feature roadmap

### MVP feature set

- [ ] authentication and account
- [ ] onboarding and feature selection
- [ ] mood check-ins
- [ ] journal
- [ ] core self-help tools
- [ ] optional quests and gentle progress
- [ ] notification preferences
- [ ] support, legal, privacy, sharing

### First expansion after MVP

- [ ] better home personalization
- [ ] more tools and content packs
- [ ] flexible reminders
- [ ] data export
- [ ] richer progress summaries
- [ ] localization groundwork
- [x] self-hosting and portability plan

### Later expansion

- [ ] optional supporter or trusted-circle features
- [ ] therapist companion workflows
- [ ] community-led content programs
- [ ] volunteer moderation and editorial processes
- [ ] easy managed self-host option, such as PikaPods or a similar service, if feasible
- [ ] do-it-yourself self-hosting guide

## 5. Product principles that must survive growth

- [x] free to users
- [x] non-profit mission
- [x] no ad model
- [x] no manipulative retention
- [x] no punishment mechanics
- [x] quiet defaults
- [x] modular feature set
- [x] privacy and dignity over growth hacks
- [x] open-source operations that do not depend on a single commercial platform

## 6. Accounts and privacy roadmap

Current direction:

- [x] MVP requires an account
- [x] account exists for cross-platform continuity and sync
- [x] do not use the account requirement as an excuse for unnecessary data collection
- [x] default hosted setup uses the maintainer's Supabase project
- [x] preserve a future path for users to bring their own compatible backend or self-hosted deployment
- [x] defer runtime backend switching until after the hosted MVP and Play testing path are stable

MVP data expectations:

- [ ] email
- [ ] auth credentials handled by backend provider
- [ ] user preferences
- [ ] journal and check-in data
- [ ] enabled modules and notification settings

Post-MVP privacy improvements:

- [ ] export
- [ ] deletion
- [ ] better encryption review
- [ ] clearer data lifecycle policies
- [ ] possible local-first or reduced-account options if later justified

## 7. Ready product checklist

The product should not be considered ready just because the screens work.

Ready means:

- [ ] useful core flows
- [ ] acceptable performance on phone and browser
- [ ] accessibility baseline
- [ ] store-ready assets and metadata
- [x] privacy and legal docs drafted in-app and in docs
- [x] crisis / safety boundaries drafted in-app and in docs
- [ ] privacy, legal, and crisis copy reviewed for launch jurisdictions
- [ ] account recovery flows
- [ ] support channel defined
- [ ] contributor entry path defined
- [ ] minimal observability and incident handling
- [ ] cost model understood
- [ ] launch messaging and community expectations documented

## 8. Community and support operations

Operate this as a community project, even if there is a primary maintainer.

Initial operations:

- [x] GitHub for source of truth
- [ ] Discord for contributor chat
- [ ] shared email aliases: `hello@`, `support@`, `privacy@`, `security@`, `contributors@`
- [ ] temporary `yoshevbot.uk` aliases: `support@`, `privacy@`, and `security@`
- [ ] public gratitude and acknowledgements
- [ ] donation path
- [ ] sharing page / support page plan

- [x] prefer Discord over Slack early because it is easier to operate for a public open-source community

## 9. Reference-repo rules

- [x] `../ifme`: study for contributor operations, docs culture, and community structure
- [x] `../quirk`: study for product flow lessons and focused self-help design
- [x] `../awesome-mental-health`: study for external resource discovery, comparable tools, and terminology scanning
- [x] do not copy code, content, or assets without explicit review
- [x] keep a record for every reused third-party asset, component, or text fragment

## 10. Cost planning

See [docs/costs.md](docs/costs.md) for detailed cost scenarios.

Practical default:

- [x] prototype cheaply
- [x] launch carefully
- [x] avoid enterprise plans until real usage justifies them
- [x] prefer free or low-cost infra until reliability or team scale makes paid tiers necessary
