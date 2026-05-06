# AGENTS.md

This file defines how AI agents should work in this repository.

## Mission

Help build a free, non-profit mental health product that is useful, calm, privacy-conscious, contributor-friendly, and available on iOS, Android, and the web.

## Current project state

- This repo is planning-first.
- Documentation quality matters because it is the source of truth for future implementation.
- Do not invent product direction that conflicts with the roadmap or principles docs.

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
- Web deployment: Netlify
- i18n: i18next + react-i18next + expo-localization, seven namespaces in `src/i18n/locales/`
- Testing: Jest + @testing-library/react-native + jest-expo
- Code quality: ESLint, Prettier, Husky (pre-commit hooks)

## i18n conventions

- All user-visible strings must come from translation files, not hardcoded in components.
- Use `useTranslation("namespace")` in components. Use `i18n.t()` direct import only in non-component code.
- Policy page section content uses `t(sectionKey, { returnObjects: true })` to load structured arrays from JSON.
- When adding a new screen or feature, add keys to the appropriate namespace JSON files for all supported languages.
- Language preference is persisted in AsyncStorage and synced to the Supabase `user_preferences.language` column.

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
- Because the roadmap currently targets all ages, call out any child-safety, moderation, or legal-review burden you notice.

## Working with reference repos

- `../ifme` is a reference for contributor operations, community process, openness, and mental-health product framing.
- `../quirk` is a reference for flow ideas, exercise structure, and lessons from a focused self-help app.
- `../awesome-mental-health` is a reference for resource discovery, terminology, external organizations, and idea benchmarking across the broader mental-health space.
- Do not copy code, assets, or long text from these repos without explicit review.
- If borrowing an idea, describe it as an idea or pattern, not as original invention.

## Documentation rules

- Keep docs direct and implementation-oriented.
- Prefer concrete decisions over vague aspiration.
- When pricing or platform policy is mentioned, link to official sources where possible and record the date checked.
- If a decision is uncertain, mark it as an assumption or open question instead of hiding the uncertainty.
- After each meaningful product, infrastructure, or process change, update `ROADMAP.md` so it shows current status and the immediate next steps.
- Also update the docs or README files that a fresh-context agent would read to resume safely. If a change affects setup, commands, deployment, store submission, environment variables, safety/legal boundaries, current blockers, or the next expected user inputs, record it in the relevant doc during the same change.

## Git safety rule

- Agents must never stage files, create commits, or push branches/remotes by themselves.
- Only perform staging, committing, or pushing if the user explicitly asks for that exact git action.

## Roadmap discipline

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
