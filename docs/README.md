# Documentation

Index for everything under `docs/`. Top-level files like [README.md](../README.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [AGENTS.md](../AGENTS.md), [ROADMAP.md](../ROADMAP.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), and [SECURITY.md](../SECURITY.md) live in the repository root.

## Start here

- [contributor-roles.md](contributor-roles.md) — practical starting points for developers, designers, translators, testers, and mental-health experts.
- [product-principles.md](product-principles.md) — the eleven principles that shape every product decision. Read this before proposing scope.
- [stack.md](stack.md) — approved technical stack, why each piece is in, and dependency policy.
- [architecture.md](architecture.md) — how the runtime layers fit together: providers, routes, auth flow, data layer, reminders, where web and native diverge.

## Product

- [modules/cbt.md](modules/cbt.md) — first CBT module spec: thought-record flow, fields, routes, acceptance bar.
- [modules/tools.md](modules/tools.md) — Tools navigation, placeholder-module rules, and the module contract every new module must follow.
- [data-privacy-model.md](data-privacy-model.md) — data classes, ownership, privacy rules, export and deletion behavior.

## Technical

- [android-development.md](android-development.md) — Android dev-build setup, callback URLs, day-to-day workflow, troubleshooting, local builds.
- [branding.md](branding.md) — icon source, generated sizes, regeneration script.
- [deployment.md](deployment.md) — single-page web deployment and Supabase auth callback setup.
- [self-hosting.md](self-hosting.md) — supported hosted and self-hosted backend modes.
- [naming.md](naming.md) — final app name, identifiers, and production domain.

## Privacy, legal, and safety

- [policies.md](policies.md) — public policy surfaces (privacy, terms, cookies, crisis, account deletion) and launch-review status.
- [gdpr-compliance.md](gdpr-compliance.md) — GDPR/CCPA approach, lawful basis, processors, retention, user rights.
- [analytics.md](analytics.md) — analytics posture (currently: none) and what would need to change before adding any.
- [licensing.md](licensing.md) — AGPL-3.0-only choice, reference-repo rules, third-party content rules.

## Project ops

- [community.md](community.md) — community operating model, channels, popularization strategy, donation posture.
- [costs.md](costs.md) — launch and operating cost planning for a non-profit project.
- [github-setup.md](github-setup.md) — GitHub workflows, required release variables and secrets, label setup, branching.
- [reference-log.md](reference-log.md) — log of reference-repository usage (`../ifme`, `../quirk`, `../awesome-mental-health`).

## Launch and store readiness

- [internal-testing.md](internal-testing.md) — internal build and testing checklist.
- [android-closed-testing.md](android-closed-testing.md) — Google Play closed-testing readiness.

## Conventions for these docs

- Each doc starts with `Last updated: YYYY-MM-DD` so readers can judge staleness.
- Decisions are stated directly. Open questions are marked, not hidden.
- Implementation details that are likely to change (commands, env vars, routes) live in docs and the README rather than CLAUDE-style memory; they are easier to update there.
- When a change affects setup, commands, deployment, store submission, env vars, safety/legal boundaries, current blockers, or next user inputs, update the relevant doc in the same PR. See the Documentation expectation note in [README.md](../README.md).
