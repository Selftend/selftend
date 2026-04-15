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

- [ ] account creation, sign-in, password reset, email verification
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
- [ ] prepare a lightweight launch/legal checklist
- [ ] review all-ages implications before public launch
- [x] create the initial GitHub repository
- [x] bootstrap the first local implementation scaffold

### Phase 1: MVP build

1. [ ] decide the backend approach for the first end-to-end scaffold
2. [ ] decide the remaining architecture choices needed for the first end-to-end scaffold
3. [ ] confirm Supabase as the operational backend for the first live environment
4. [ ] keep Expo as the client app framework, not the primary backend runtime
5. [ ] avoid a separate custom JS backend by default
6. [ ] decide whether any early backend logic belongs in Supabase Edge Functions
7. [ ] create a real Supabase project
8. [ ] add real `.env` values
9. [ ] apply the first migration
10. [ ] verify live sign up / sign in / password reset on web
11. [ ] verify live CBT thought-record persistence on web
12. [ ] verify live auth and persistence on device builds
13. [ ] verify local reminders on real devices
14. [ ] manually review the scaffolded codebase once before the initial push
15. [ ] push the initial setup after the manual review

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

Initial scaffold work completed in this first commit:

- [x] Expo Router + TypeScript project scaffold
- [x] auth UI scaffold
- [x] protected route shell
- [x] first CBT module scaffold
- [x] settings / support / legal stubs
- [x] Supabase schema draft
- [x] CI and test harness
- [x] local web smoke test of the scaffold

### Phase 2: Ready-for-public-product pass

This phase turns the MVP into a product that can be responsibly promoted.

- [ ] accessibility audit
- [ ] privacy policy and terms
- [ ] safety and crisis resource copy
- [ ] data export and account deletion
- [ ] minimal observability and incident response process
- [ ] app store assets and copy
- [ ] FAQ and support workflows
- [ ] backup and recovery plan
- [ ] contributor docs for code, content, and design

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

### Later expansion

- [ ] optional supporter or trusted-circle features
- [ ] therapist companion workflows
- [ ] community-led content programs
- [ ] volunteer moderation and editorial processes

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
- [ ] privacy and legal docs
- [ ] crisis / safety boundaries
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
- [ ] shared email aliases: `hello@`, `support@`, `security@`, `contributors@`
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
