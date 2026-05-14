# Roadmap

Selftend should finish a useful guided self-help MVP before adding broad modality coverage or community product features.

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

CBT thought records are the working tool during MVP. Mood check-ins, journaling, and broader tools sit in the post-MVP backlog. Broader module enable/disable behavior is also deferred. Expansion beyond CBT is allowed, but favor depth in a few useful tools over shallow breadth.

iOS TestFlight/App Store work is deferred until the Apple Developer Program fee is funded or Selftend has a legal organization/nonprofit enrollment path. MVP launch path is public web on `selftend.org` followed by Android closed testing on Google Play.

## Current work

This file is the source of truth for tracked work. Tick `[x]` when an item is complete; add new items here rather than in other docs. When the project opens to outside contributors, mirror selected items into GitHub Issues for visibility — the Issue should link back to the ROADMAP line. Per-PR review gates live in `.github/pull_request_template.md` and are not tracked here.

## P1: MVP Product Flows

1. [ ] Build daily or on-demand mood check-ins.
2. [ ] Build lightweight journaling.
3. [ ] Expand the guided self-help tools library beyond the current CBT slice.
4. [x] Complete CBT Phase 5 recovery planning and cross-cutting pattern insights.
5. [ ] Add a feedback/support entry point that warns users not to include urgent crisis details.
6. [ ] Apply the accessibility baseline to each new MVP flow.
7. [ ] Standardize save-failed, auth-expired, permission-denied, and destructive-action states.
8. [ ] Add lightweight schema, repository, export/delete, and critical UI-state tests for new modules.
9. [ ] Add a progress view centered on reflection, not pressure.
10. [ ] Add quests, habits, or streaks only if they are disabled by default or framed as soft progress.

## CBT Spec Follow-Ups

1. [x] Include all CBT strategy tables in `export_user_data()` account export coverage.
2. [x] Add Recovery Plan timeline, personal stats summary, and user-controlled export polish.
3. [x] Build the dashboard/check-in loop from the CBT spec: morning/evening check-ins, open tasks, scheduled activities, and 7/30-day mood summaries.
4. [ ] Add remaining strategy-specific insights: activity mood lift by category, recurring thought-to-core-belief suggestions, self-care trends, anger patterns, and exposure progress.
5. [ ] Add lightweight schema, repository, export/delete, and critical UI-state tests for newer CBT strategy modules.
6. [ ] Scope quiet opt-in CBT notification extensions without streak pressure or punitive reminders.

## P2: Launch Readiness

1. [x] Submit the domain for HSTS preload after HTTPS is stable.
2. [x] Authenticate the build machine with Expo or configure `EXPO_TOKEN`.
3. [x] Verify EAS, Netlify, and GitHub release variables/secrets for reproducible Android and web releases.
4. [ ] Complete legal review of privacy policy, terms, and safety/crisis copy.
5. [x] Approve the global crisis-resource strategy (Option B: generic + Find A Helpline registry; bg locale surfaces 112 inline).
6. [ ] Run local Android verification including the permission check before submission.
7. [x] Prepare public FAQ (in-app + web `/faq` route) and public support guidance (extended `/support` route).
       Play Store short/full descriptions and "what's new" copy are drafted in the conversation history; paste into Play Console at launch time.
8. [ ] Prepare Google Play store assets and screenshots.
9. [x] Configure Google Play service account JSON after the first manual upload.
10. [ ] Create the closed-testing track and tester list in Google Play; submit the closed-testing release for Google review.
11. [ ] Verify closed-test Android build, live auth, persistence, local reminders, and removed camera/microphone permissions on a real device.

## Deferred reminders infrastructure

1. [ ] Generate production VAPID keys and configure Supabase Edge Function secrets.
2. [ ] Deploy `send-web-reminders` and schedule the Supabase cron job after Vault secrets are set.
3. [ ] Verify web push reminders on supported desktop, Android web, and iOS/iPadOS Home Screen contexts.

## P3: Post-MVP Privacy And Portability

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

1. [ ] Add more modalities beyond CBT.
2. [ ] Add grounded reflection tools, behavioral activation, coping plans, sleep, stress, and energy support.
3. [ ] Improve personalization, module enable/disable behavior, and custom home behavior.
4. [ ] Add richer progress summaries and flexible reminders.
5. [ ] Consider biometric app lock and home-screen widgets.
6. [ ] Consider community-led content programs only after moderation, abuse-handling, and child-safety review.
7. [ ] Consider supporter, trusted-circle, or therapist companion exports only after review.
8. [ ] Improve self-hosting docs and evaluate managed self-host options if feasible.

## P5: Tooling Maturity

1. [ ] Commitlint or conventional-commit enforcement if contributor volume needs it.
2. [ ] Full end-to-end test suite.
3. [ ] Netlify Supabase integration only if it simplifies deployment without changing architecture.
4. [ ] Offline queue and multi-device conflict resolution after online-first behavior is reliable.

## Security maintenance

1. [ ] Establish a regular security testing and audit cadence.

## Community And Operations

1. [ ] Mirror open ROADMAP items into GitHub Issues when the project opens for broader contribution, so contributors can browse work without reading the repo.
2. [ ] Keep first contributions easy and issue labels useful as issue volume grows. Current issue templates cover code, docs, content, QA, accessibility, and localization; the PR template asks for the relevant guardrail checks.
3. [ ] Publish contributor roles and keep contributor docs current.
4. [ ] Use GitHub Discussions or Discord when onboarding volume needs it.
5. [ ] Recognize contributors publicly, including non-code work.
6. [ ] Claim primary public handles and create a simple public site/docs presence.
7. [ ] Publish calm feature explainers and a changelog habit.
8. [ ] Add donation support without restricting care.

## Pre-Public Cleanup

1. [x] Review crisis guidance by jurisdiction (approved Option B; posture recorded in [docs/policies.md](../docs/policies.md) Crisis guidance section).
2. [x] Audit docs for stale internal notes and broken URLs.
3. [x] Remove debug logging before public release.
4. [x] Verify translation coverage for supported languages.
5. [x] Review [.github/THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and source license headers before launch.
6. [x] Verify environment variable docs and CI/CD workflows.
7. [x] Verify DNS/domain setup and Supabase Authentication redirect URL allow-list.

## Reference repos

- `../ifme` for contributor operations, docs culture, and community-structure ideas
- `../quirk` for product-flow lessons and focused self-help design ideas
- `../awesome-mental-health` for resource discovery, comparable tools, and terminology scanning

Do not copy code, content, or assets from reference repos without explicit review. Track any reused third-party asset, component, or text fragment.
