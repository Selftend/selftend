# Roadmap

Last updated: 2026-05-12

Selftend should finish a useful guided self-help MVP before adding broad modality coverage or community product features. Completed implementation details belong in focused docs, not as checked-off roadmap history.

Current setup and implementation references:

- [README.md](../README.md)
- [docs/README.md](../docs/README.md)
- [docs/stack.md](../docs/stack.md)
- [docs/architecture.md](../docs/architecture.md)
- [docs/deployment.md](../docs/deployment.md)
- [docs/android-development.md](../docs/android-development.md)
- [docs/android-closed-testing.md](../docs/android-closed-testing.md)
- [docs/internal-testing.md](../docs/internal-testing.md)
- [docs/accessibility.md](../docs/accessibility.md)
- [docs/policies.md](../docs/policies.md)
- [docs/gdpr-compliance.md](../docs/gdpr-compliance.md)
- [docs/operations-runbook.md](../docs/operations-runbook.md)
- [docs/analytics.md](../docs/analytics.md)
- [docs/modules/cbt.md](../docs/modules/cbt.md)
- [docs/modules/tools.md](../docs/modules/tools.md)
- [supabase/README.md](../supabase/README.md)

## Direction

Build a free, non-profit mental-health wellness app for iOS, Android, and web using the Expo product stack.

Keep the product:

- guided self-help first
- account-based for MVP continuity
- modular
- quiet by default
- optional and non-punitive around reminders, progress, streaks, quests, and habits
- privacy-conscious and data-minimizing
- open to code and non-code contributors

Do not add:

- ads, ad SDKs, ad-network pixels, or ad-based monetization
- subscription paywalls for care
- manipulative retention, shame mechanics, or punishment for missed days
- broad social feeds, public posting, or peer messaging in MVP
- diagnosis, prescribing, treatment claims, emergency support claims, or therapist-replacement framing
- user-facing AI therapist, AI counselor, or AI coach features in MVP
- a broad "everything mental health" taxonomy before the focused MVP works

## P0: Foundation

No open P0 tasks remain.

The app foundation, data model, module contract, shared components, Supabase migrations, onboarding flags, and Android start workflows are documented in the focused docs above. Treat Android dev-client startup failures, dependency-install integrity issues, native auth persistence warnings, or migration-history regressions as P0 before adding new MVP flows.

## P1: MVP Product Flows

Do this before broad launch work or post-MVP expansion:

1. [ ] Build daily or on-demand mood check-ins.
2. [ ] Build lightweight journaling.
3. [ ] Expand the guided self-help tools library beyond the current CBT slice.
4. [ ] Add a feedback/support entry point that warns users not to include urgent crisis details.
5. [ ] Apply the accessibility baseline to each new MVP flow.
6. [ ] Standardize save-failed, auth-expired, permission-denied, and destructive-action states.
7. [ ] Add lightweight schema, repository, export/delete, and critical UI-state tests for new modules.
8. [ ] Add a progress view centered on reflection, not pressure.
9. [ ] Add quests, habits, or streaks only if they are disabled by default or framed as soft progress.

CBT remains the working tool during MVP. Broader module enable/disable behavior is deferred to P4.

## P2: Launch Readiness

Order matters: public web truth first, then Android closed-test verification, then legal/ops review. iOS TestFlight/App Store work is deferred out of this launch path until the Apple Developer Program fee is funded or Selftend has a legal organization/nonprofit enrollment path.

1. [x] Purchase and configure `selftend.org`.
2. [x] Connect `selftend.org` to the Netlify production deployment.
3. [x] Configure Netlify production env vars for the hosted web app, including `EXPO_PUBLIC_PUBLIC_APP_URL=https://selftend.org`.
4. [x] Configure support, privacy, security, deletion, and contributor email aliases.
5. [x] Configure production Supabase Site URL, redirect URLs, and current migrations.
6. [x] Verify `/privacy`, `/terms`, `/crisis`, `/cookies`, `/account-deletion`, `/auth-callback`, and an unknown route in production.
7. [x] Test CSP headers against the real Expo web build.
8. [ ] Submit the domain for HSTS preload after HTTPS is stable.
9. [x] Test self-service deletion against production Supabase.
10. [x] Confirm Supabase DPA applicability.
11. [ ] Authenticate the build machine with Expo or configure `EXPO_TOKEN`.
12. [ ] Verify EAS, Netlify, and GitHub release variables/secrets for reproducible Android and web releases.
13. [x] Create the Google Play developer account and app record.
14. [x] Complete the Google Play Health apps declaration.
15. [x] Complete the Google Play Data safety form.
16. [x] Write Google Play app access instructions for account-required testing.
17. [ ] Complete legal review of privacy policy, terms, and safety/crisis copy.
18. [ ] Approve the global crisis-resource strategy.
19. [x] Resolve all-ages implications for launch by setting the product and store posture to 18+.
20. [x] Decide whether a DPIA is needed and document the decision.
21. [x] Complete transfer impact assessment.
22. [x] Document incident response and breach notification processes.
23. [x] Define support workflow for `support@selftend.org`.
24. [x] Define manual GDPR email request handling for requests not completed in-app.
25. [ ] Prepare app store assets, screenshots, policy-safe copy, FAQ, and public support guidance.
26. [x] Build the production Android AAB after EAS production env values are configured.
27. [x] Upload the first production AAB to Google Play.
28. [ ] Configure Google Play service account JSON after the first manual upload.
29. [ ] Submit or confirm the closed-testing release and tester list in Google Play.
30. [ ] Verify closed-test Android build, live auth, persistence, local reminders, and removed camera/microphone permissions on a real device.

Deferred reminder infrastructure, not blocking first public web testing:

1. [ ] Generate production VAPID keys and configure Supabase Edge Function secrets.
2. [ ] Deploy `send-web-reminders` and schedule the Supabase cron job after Vault secrets are set.
3. [ ] Verify web push reminders on supported desktop, Android web, and iOS/iPadOS Home Screen contexts.

## P3: Post-MVP Privacy And Portability

Do not block web launch or Android closed testing on these, but preserve compatibility:

1. [ ] Add hosted data export.
2. [ ] Add import support.
3. [ ] Add local-only storage for non-technical users.
4. [ ] Add data-location choice before first sign-in: hosted sync, local-only, or custom Supabase.
5. [ ] Add settings controls for data location with export/import and switching warnings.
6. [ ] Add encrypted backup file export.
7. [ ] Complete deeper encryption and data-lifecycle review.
8. [ ] Revisit reduced-account or local-first product paths after the hosted MVP is stable.
9. [ ] Defer automatic cloud backup/sync until export/import and local-only mode are reliable.

## P4: Post-MVP Product Expansion

Expand only after the MVP is useful, stable, and understandable:

1. [ ] Add more modalities beyond CBT.
2. [ ] Add grounded reflection tools, behavioral activation, coping plans, sleep, stress, and energy support.
3. [ ] Improve personalization, module enable/disable behavior, and custom home behavior.
4. [ ] Add richer progress summaries and flexible reminders.
5. [ ] Consider biometric app lock and home-screen widgets.
6. [ ] Consider community-led content programs only after moderation, abuse-handling, and child-safety review.
7. [ ] Consider supporter, trusted-circle, or therapist companion exports only after review.
8. [ ] Improve self-hosting docs and evaluate managed self-host options if feasible.

## P5: Tooling Maturity

Add after the main flows stabilize:

1. [ ] Commitlint or conventional-commit enforcement if contributor volume needs it.
2. [ ] Full end-to-end test suite.
3. [ ] Netlify Supabase integration only if it simplifies deployment without changing architecture.
4. [ ] Offline queue and multi-device conflict resolution after online-first behavior is reliable.

## Community And Operations

1. [ ] Keep this roadmap current after meaningful product, infrastructure, or process changes.
2. [ ] Move actionable roadmap slices into GitHub issues when the project opens for broader contribution.
3. [ ] Keep first contributions easy and issue labels useful.
4. [ ] Publish contributor roles and keep contributor docs current.
5. [ ] Use GitHub Discussions or Discord when onboarding volume needs it.
6. [x] Invite docs, content, translation, design, and QA contributions. Weblate Libre is live at hosted.weblate.org.
7. [ ] Recognize contributors publicly, including non-code work.
8. [ ] Claim primary public handles and create a simple public site/docs presence.
9. [ ] Publish calm feature explainers and a changelog habit.
10. [ ] Add donation support without restricting care.

Reference repos:

- `../ifme` for contributor operations, docs culture, and community-structure ideas
- `../quirk` for product-flow lessons and focused self-help design ideas
- `../awesome-mental-health` for resource discovery, comparable tools, and terminology scanning

Do not copy code, content, or assets from reference repos without explicit review. Track any reused third-party asset, component, or text fragment.

## Pre-Public Cleanup

1. [x] Replace placeholder organization names with the confirmed legal entity.
2. [x] Verify domain-based emails.
3. [ ] Complete legal review for policies, terms, and crisis guidance.
4. [ ] Review crisis guidance by jurisdiction.
5. [ ] Audit docs for stale internal notes and broken URLs.
6. [ ] Remove debug logging before public release.
7. [ ] Verify translation coverage for supported languages.
8. [ ] Review [.github/THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and source license headers before launch.
9. [ ] Verify environment variable docs, CI/CD workflows, DNS/domain setup, and Supabase redirects.
