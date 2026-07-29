# AGENTS.md

This file defines how AI agents should work in this repository.

## Mission

Help build a free, non-profit mental health product that is useful, calm, privacy-conscious, contributor-friendly, and available on iOS, Android, and the web.

## Current project state

- Documentation quality matters because it carries context that a task line cannot.
- Task tracking lives outside the repo; AGENTS.md and the principles docs are the source of truth for product direction.
- Do not invent product direction that conflicts with the principles docs.

## Product guardrails

- Treat this as a wellness and self-help product, not a diagnosis engine and not a therapist replacement.
- Do not introduce manipulative retention mechanics.
- Streaks, quests, reminders, and gamification must always be optional and non-punitive.
- Missing a day must never create shame or product punishment.
- The app should stay modular so users can choose the parts they want.
- Notifications must be explicit, quiet by default, and easy to disable.
- Account access is required in MVP, but privacy and data minimization still matter.
- AI is not part of the MVP user-facing product.
- The product should remain free to users.
- Do not propose ad-based monetization or subscription paywalls.

## Technical defaults

- Platform: Expo + React Native + TypeScript
- Routing: Expo Router
- Styling: NativeWind + Tailwind CSS
- UI primitives: @rn-primitives (full suite of accessible components)
- Styling utilities: class-variance-authority, clsx, tailwind-merge, tailwindcss-animate
- Icons: lucide-react-native (primary), @expo/vector-icons (built-in fallback)
- Fonts: @expo-google-fonts/noto-sans
- Backend: Supabase
- State: TanStack Query for server state, Zustand for local state
- Forms and validation: React Hook Form + Zod
- Notifications: Expo Notifications
- Secure local secrets: Expo SecureStore
- Local storage: @react-native-async-storage/async-storage
- Animation: react-native-reanimated
- Image handling: expo-image-picker, expo-image-manipulator, react-easy-crop
- Navigation support: react-native-screens, react-native-safe-area-context
- Builds and submission: EAS Build and EAS Submit
- Web deployment: Cloudflare Workers (static assets; `wrangler.toml` prod / `wrangler.staging.toml` staging)
- i18n: i18next + react-i18next + expo-localization, seven namespaces in `src/i18n/locales/`
- Testing: Jest + @testing-library/react-native + jest-expo
- Code quality: ESLint, Prettier, Husky (pre-commit hooks)

## i18n conventions

- All user-visible strings must come from translation files, not hardcoded in components.
- Use `useTranslation("namespace")` in components. Use `i18n.t()` direct import only in non-component code.
- Policy page section content uses `t(sectionKey, { returnObjects: true })` to load structured arrays from JSON.
- When adding a new screen or feature, add keys to the appropriate namespace JSON files for all supported languages.
- Language preference is persisted in AsyncStorage and synced to the Supabase `user_preferences.language` column.
- Translations managed via Weblate hosted Libre plan at hosted.weblate.org.

## Dependency policy

- Prefer Expo built-ins and officially supported solutions for platform capabilities.
- NativeWind is the default styling exception and is an approved third-party dependency.
- Any new dependency should answer:
  - What problem is it solving?
  - Why are Expo defaults or approved dependencies not enough?
  - What maintenance or privacy cost does it add?

## Privacy and safety expectations

- Minimize personal data collection.
- Prefer feature-level justification before adding new data fields.
- Require explicit review before adding tracking, analytics, ads, social feeds, or behavioral nudges.
- Do not write product copy that implies medical outcomes, diagnosis, or emergency support.
- Safety and crisis guidance should be visible, calm, and clearly separate from the app's self-help features.
- The product currently targets all ages, so call out any child-safety, moderation, or legal-review burden you notice.

## Email deliverability rule

- When testing against a live Supabase environment (staging or production), never trigger auth or transactional emails to non-deliverable addresses — bounces damage the project's sender reputation, and Supabase warned about a high bounce rate on staging (2026-07-29).
- If a test needs a fresh account, either sign up with a real deliverable mailbox (e.g. a plus-tagged address) or create it via the public signup and confirm it with SQL through the Management API — then avoid resend/recover flows against it.
- Delete throwaway test accounts when done (`DELETE FROM auth.users WHERE email = '...'` via the Management API) so nothing emails them later.
- Flows whose success path inherently sends email (verification, password reset) are verified against deliverable mailboxes only, or left untested with the gap recorded.

## Working with reference repos

- `../ifme` is a reference for contributor operations, community process, openness, and mental-health product framing.
- `../quirk` is a reference for flow ideas, exercise structure, and lessons from a focused self-help app.
- `../awesome-mental-health` is a reference for resource discovery, terminology, external organizations, and idea benchmarking across the broader mental-health space.
- Do not copy code, assets, or long text from these repos without explicit review.
- If borrowing an idea, describe it as an idea or pattern, not as original invention.

## Documentation rules

- Keep docs direct and implementation-oriented.
- `AGENTS.md` is the single source of truth for AI-agent instructions. No other file (`CLAUDE.md`, `.cursorrules`, `.clinerules`, `.windsurfrules`, etc.) should hold AI-agent rules. One exception: a `CLAUDE.md` that consists solely of an `@AGENTS.md` import line is permitted — it holds no rules itself, it only makes this file load for tools that read `CLAUDE.md`. Contributor, user, product, and process docs are written for humans and should not link to, quote, or depend on AI-agent instructions.
- Prefer concrete decisions over vague aspiration.
- When pricing or platform policy is mentioned, link to official sources where possible and record the date checked.
- If a decision is uncertain, mark it as an assumption or open question instead of hiding the uncertainty.
- After each meaningful product, infrastructure, or process change, update any human-facing doc whose content the change affects - setup, commands, deployment, store submission, environment variables, safety/legal boundaries, blockers, or expected user inputs. If a change affects setup commands or contributor-visible defaults, update `README.md` in the same change.
- Per-PR review gates live in `.github/pull_request_template.md`.

## Architecture rule

Architectural changes must update control-tower. If this change adds/removes/moves a service,
changes hosting/provider, adds or changes a domain or public URL, introduces a new external or
cross-project dependency, or touches a credential — file a control-tower issue
(`gh issue create -R vasilyoshev/control-tower ...`) or edit its `docs/inventory.md` directly if
you have it checked out. Canonical rule:
https://github.com/vasilyoshev/control-tower/blob/main/docs/architecture-rule.md

## Git safety rule

- Agents may stage, commit, and push on feature branches, and open PRs, without asking - including in autonomous loops (policy changed 2026-07-14).
- Direct pushes to `main` only when the user explicitly asks for that; otherwise changes reach `main` through PRs and the required `verify` check.
- Never force-push, never skip hooks (`--no-verify`), never merge PRs autonomously - merging is a human action.

## Product discipline

- Do not add task checklists to docs in `docs/`, `supabase/`, or anywhere else - task tracking lives outside the repo.
- MVP should stay focused on guided self-help.
- Community operations can start early outside the app, but community product features should not crowd out MVP utility.
- Expansion beyond CBT is allowed, but the product should avoid becoming a vague "everything app."
- Favor depth in a few useful tools over shallow breadth.
- Prefer smaller, reviewable increments after the initial scaffold/setup phase.

## Things to push back on

- Dark patterns framed as growth.
- Default-on streaks or reminders.
- Broad social features in MVP.
- "AI therapist" or "AI counselor" framing.
- Large dependency additions without a clear reason.
- Casual copying from AGPL or GPL projects without tracking license implications.

## Review guidelines

These guide automated PR reviewers (e.g. Codex) and human reviewers alike. Flag high-severity issues; prefer signal over nitpicks, and defer formatting to ESLint/Prettier.

- **Privacy & safety (highest priority):** personal or health data logged, sent to a third party, or added as a new field without feature-level justification; new tracking/analytics/ads/behavioral nudges without explicit review; product copy implying diagnosis, medical outcomes, or "AI therapist/counselor" framing; crisis/safety guidance made less visible or blended into self-help features.
- **Security:** secrets, tokens, or keys committed or hardcoded; Supabase changes with missing/incorrect RLS, queries that bypass row ownership, or service-role usage reachable from the client; untrusted input reaching SQL, file paths, or HTML sinks without validation; Zod validation removed or weakened on external input.
- **Retention & product guardrails:** default-on streaks, reminders, or notifications; punitive "missed day" mechanics; manipulative retention; notifications that aren't explicit, quiet-by-default, and easy to disable.
- **i18n:** user-visible strings hardcoded in components instead of translation files; new screens/features missing keys in the relevant namespace for supported languages.
- **Correctness & tests:** tests weakened or assertions rewritten to match broken behavior (call this out explicitly); a feature or bugfix landing without corresponding test coverage; TanStack Query / Zustand misuse (stale cache keys, mutations that don't invalidate) and violations of the Reanimated / React hooks rules.
- **Dependencies:** a new third-party dependency where an Expo built-in or approved dependency would do, or with unclear maintenance/privacy cost; code or text copied from the reference repos (`../ifme`, `../quirk`, `../awesome-mental-health`) without license tracking.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (Selftend/selftend) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels, used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
