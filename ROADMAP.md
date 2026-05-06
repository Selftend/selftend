# Roadmap

Selftend should finish the app frame before adding deeper CBT, ACT, meditation, journaling, mood-tracking, or other guided self-help logic. This file is forward-looking: completed work belongs in the README, focused docs, changelog-style notes, or module docs, not as checked roadmap items.

Current implementation and setup are documented in:

- [README.md](README.md)
- [docs/stack.md](docs/stack.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/android-closed-testing.md](docs/android-closed-testing.md)
- [docs/internal-testing.md](docs/internal-testing.md)
- [docs/policies.md](docs/policies.md)
- [docs/gdpr-compliance.md](docs/gdpr-compliance.md)
- [docs/analytics.md](docs/analytics.md)
- [docs/modules/cbt.md](docs/modules/cbt.md)
- [docs/modules/tools.md](docs/modules/tools.md)
- [supabase/README.md](supabase/README.md)
- [docs/github-setup.md](docs/github-setup.md)
- [docs/community.md](docs/community.md)
- [docs/costs.md](docs/costs.md)
- [docs/licensing.md](docs/licensing.md)
- [docs/reference-log.md](docs/reference-log.md)

When the project opens for broader contributions, actionable slices from this roadmap should move into GitHub issues while this file stays focused on direction, sequencing, and readiness.

## 1. Mission And Guardrails

Build a free, non-profit, cross-platform mental health app for iOS, Android, and the web using one Expo-based product stack.

The product should stay:

- guided self-help first
- account-based for MVP continuity across platforms
- modular, so users can choose the parts they want
- quiet by default, with reminders off or minimal by default
- optional and non-punitive around habits, streaks, quests, or progress mechanics
- privacy-conscious and data-minimizing
- open-source and contributor-friendly

Non-negotiable boundaries:

- no ads, ad SDKs, ad-network pixels, or ad-based monetization
- no subscription paywalls for care
- no manipulative retention, shame mechanics, or punishment for missing a day
- no broad social feed, public posting, or peer-to-peer messaging in MVP
- no diagnosis, prescribing, treatment claims, or therapist-replacement framing
- no user-facing AI therapist, AI counselor, or AI coach in MVP
- no large "everything mental health" taxonomy before the focused MVP is useful

## 2. Priority Roadmap

### P0: Foundation Before More Business Logic

These foundation items affected every future feature and contributor workflow.

No open P0 tasks remain. The local app-foundation work is documented in [docs/data-privacy-model.md](docs/data-privacy-model.md), [docs/modules/tools.md](docs/modules/tools.md), and the shared components under `src/components`. The active Supabase project has had its migration history repaired, including the sortable `20260503000000_consent_and_deletion.sql` migration, avatar storage migrations, `20260504_add_language_preference.sql`, and `20260506_onboarding_flags.sql`.

The next product work should start from P1 unless new foundation regressions are found.

### P1: MVP Product Flows

Build these after the foundation is stable enough that each flow can follow shared data, safety, UI, and testing patterns.

1. [ ] Add enabled-module persistence and settings controls.
2. [ ] Add explicit notification preference persistence and in-app controls.
3. [ ] Build daily or on-demand mood check-ins.
4. [ ] Build lightweight journaling.
5. [ ] Expand the focused guided self-help tools library beyond the current CBT slice.
6. [ ] Add a visible feedback/support entry point that opens email or GitHub guidance and warns users not to include urgent crisis details.
7. [ ] Establish an accessibility baseline for new screens: contrast, screen-reader labels, keyboard support on web, touch target size, reduced-motion respect, and scalable text.
8. [ ] Standardize save-failed, auth-expired, permission-denied, and destructive-action states across MVP flows.
9. [ ] Add lightweight tests for every new module's schemas, repositories, export/delete coverage, and critical UI states.
10. [ ] Add a progress view focused on reflection, not pressure.
11. [ ] Add optional quests, habits, or streaks only if they stay disabled by default or framed as soft progress.

### P2: Launch Readiness

These are ordered by practical dependency: public URLs and backend truth first, then store setup, then review and release verification.

1. [ ] Purchase and configure the production domain: `selftend.org`.
2. [ ] Configure Netlify production environment variables with `EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org`.
3. [ ] Connect `selftend.org` to the Netlify web deployment.
4. [ ] Configure support, privacy, security, deletion, and contributor aliases on `selftend.org`.
5. [ ] Configure Netlify site ID and auth token for manual web production deploys.
6. [ ] Verify public production routes: `/privacy`, `/terms`, `/crisis`, `/cookies`, `/account-deletion`, `/auth-callback`, and an unknown route.
7. [ ] Test CSP headers against the real Expo web build.
8. [ ] Submit the domain for HSTS preload after production HTTPS is stable.
9. [ ] Verify production Supabase Site URL and redirect URLs after localhost OAuth fallback.
10. [ ] Test self-service deletion end-to-end against the real Supabase instance.
11. [ ] Confirm Supabase DPA applicability.
12. [ ] Authenticate the build machine with Expo for EAS, or configure `EXPO_TOKEN`.
13. [ ] Configure GitHub release variables and secrets for Android and web deploy workflows.
14. [ ] Create or confirm the Google Play organization or nonprofit developer account.
15. [ ] Confirm legal organization or nonprofit account details.
16. [ ] Complete the Google Play Health apps declaration.
17. [ ] Complete the Google Play Data safety form.
18. [ ] Write Google Play app access instructions for account-required testing.
19. [ ] Complete human/legal review of privacy policy and terms.
20. [ ] Complete human/legal review of safety and crisis resource copy.
21. [ ] Approve the global crisis-resource strategy.
22. [ ] Review all-ages implications before public launch.
23. [ ] Decide whether a DPIA is needed and document the decision.
24. [ ] Complete transfer impact assessment.
25. [ ] Document incident response and breach notification processes.
26. [ ] Define support workflow for `support@selftend.org`.
27. [ ] Define manual process for GDPR email requests that cannot be completed in-app.
28. [ ] Prepare app store assets, screenshots, and policy-safe copy.
29. [ ] Prepare FAQ and public support guidance.
30. [ ] Build the production Android AAB.
31. [ ] Manually upload the first AAB to Google Play for the first closed-test track.
32. [ ] Configure Google Play service account JSON after the first manual Play upload.
33. [ ] Verify closed-test Android build on a real device.
34. [ ] Verify live auth and persistence on device builds.
35. [ ] Verify local reminders on real devices.
36. [ ] Verify resolved Android prebuild config excludes camera and microphone permissions.

### P3: Post-MVP Privacy And Portability

Do not block web launch or Android closed testing on these, but keep the architecture compatible with them.

1. [ ] Add import support.
2. [ ] Add local-only storage mode for non-technical users.
3. [ ] Add explicit data-location choice before first sign-in: hosted sync, local-only, or advanced custom Supabase.
4. [ ] Add data-location controls in settings with clear export/import and switching warnings.
5. [ ] Add encrypted backup file export.
6. [ ] Complete deeper encryption review.
7. [ ] Clarify long-term data lifecycle policies.
8. [ ] Revisit reduced-account or local-first product paths only when the hosted MVP is stable.
9. [ ] Defer automatic cloud backup/sync, including Google Drive, until export/import and local-only mode are reliable.

### P4: Post-MVP Product Expansion

Expand only after the MVP is useful, stable, and understandable.

1. [ ] Add more mental-health modalities beyond CBT.
2. [ ] Add grounded reflection tools.
3. [ ] Add behavioral activation.
4. [ ] Add coping plans and kits.
5. [ ] Add sleep, stress, and energy support.
6. [ ] Improve personalization.
7. [ ] Improve module enable/disable and custom home behavior.
8. [ ] Add richer progress summaries.
9. [ ] Add flexible reminders.
10. [ ] Consider biometric app lock.
11. [ ] Consider home-screen widgets.
12. [ ] Consider community-led content programs.
13. [ ] Consider volunteer moderation and editorial processes.
14. [ ] Consider optional supporter or trusted-circle features.
15. [ ] Consider therapist companion exports only after review.
16. [ ] Consider private supporter roles only after review.
17. [ ] Consider richer onboarding or initial module-selection walkthroughs only after the MVP flows are stable.
18. [ ] Improve self-hosting guide and consider a managed self-host option, such as PikaPods or a similar service, if feasible.

### P5: Tooling Maturity

These are useful later, but should not block the foundation or MVP feature work above.

1. [ ] Add commitlint or conventional-commit enforcement if contributor volume makes commit history hard to maintain.
2. [ ] Add a full end-to-end test suite after the main MVP flows stabilize.
3. [ ] Evaluate Netlify Supabase integration only if it proves useful as deployment convenience rather than required architecture.
4. [ ] Add full offline queue and multi-device conflict resolution only after online-first behavior is reliable.

## 3. Community And Operations

Operate Selftend as a community project, even while there is a primary maintainer.

Contributor operations:

1. [ ] Keep this roadmap current after meaningful product, infrastructure, or process changes.
2. [ ] Migrate actionable roadmap chunks into GitHub issues when the project opens for broader contributions.
3. [ ] Make the first contribution easy.
4. [ ] Keep a clean issue taxonomy.
5. [ ] Publish contributor roles.
6. [ ] Use GitHub Discussions or Discord for onboarding questions when contribution volume justifies it.
7. [ ] Recognize contributors publicly.
8. [ ] Invite docs, content, translation, design, and QA contributions, not just code.
9. [ ] Keep contributor docs for code, content, design, and QA up to date.

Community and support:

1. [ ] Claim primary handles early.
2. [ ] Launch a simple public site or docs presence.
3. [ ] Create a public changelog habit.
4. [ ] Publish calm educational posts and feature explainers.
5. [ ] Encourage sharing through usefulness, not pressure.
6. [ ] Add app store presence once the product is stable.
7. [ ] Introduce Discord for contributor chat when there is enough ongoing activity to maintain it.
8. [ ] Add public gratitude and acknowledgements.
9. [ ] Add donation path.

Recommended public channel rollout:

1. GitHub
2. Website / docs presence
3. Discord when contributor onboarding needs it
4. Reddit community after MVP
5. One or two social platforms with the highest likelihood of sustained upkeep
6. Additional platforms only after a repeatable content rhythm exists

Reference-repo rules:

- Use `../ifme` for contributor operations, docs culture, and community-structure ideas.
- Use `../quirk` for product-flow lessons and focused self-help design ideas.
- Use `../awesome-mental-health` for external resource discovery, comparable tools, and terminology scanning.
- Do not copy code, content, or assets without explicit review.
- Describe borrowed ideas as ideas or patterns, not original invention.
- Keep a record for every reused third-party asset, component, or text fragment.

Cost discipline:

- Prototype cheaply.
- Launch carefully.
- Avoid enterprise plans until real usage justifies them.
- Prefer free or low-cost infrastructure until reliability or team scale makes paid tiers necessary.
- Keep detailed cost scenarios in [docs/costs.md](docs/costs.md).
