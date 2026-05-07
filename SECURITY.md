# Security Policy

Last updated: 2026-05-07

Selftend stores sensitive personal reflection from real people. We take security reports seriously and want to make it easy to send one.

## Reporting a vulnerability

Please report suspected vulnerabilities privately. Do not open a public GitHub issue for security problems.

- **Email:** `security@selftend.org`
- **GitHub Security Advisory:** https://github.com/vasilyoshev/self-tend/security/advisories/new

If you have not received a reply within 7 days, please follow up — emails do occasionally get filtered.

In your report, please include:

- a description of the vulnerability and its impact
- steps to reproduce, or a proof-of-concept where possible
- the affected surface (web app at `selftend.org`, Android build, Supabase backend, edge function, etc.)
- any relevant logs, screenshots, or network captures
- whether you would like public credit if a fix is published

You do not need to have a fix ready to report. A clear reproduction is enough.

## What we will do

- acknowledge your report within 7 days
- triage and confirm the issue, or explain why we do not consider it in scope
- keep you updated on progress for issues we plan to fix
- coordinate disclosure timing with you for serious issues
- credit you in the release notes if you would like, once the fix is public

## Scope

In scope:

- the Expo web app served from `selftend.org`
- the Android and iOS builds released through Google Play and the App Store under the Selftend identity
- the Supabase database schema, RLS policies, and edge functions in this repository (`supabase/`)
- account flows: sign-in, magic links, OAuth, session handling, account deletion, data export
- privacy-impacting bugs: leaks of user data across accounts, missing RLS, data sent to unintended parties
- web push reminder infrastructure under our control

Out of scope:

- vulnerabilities in third-party services we use (Supabase, Netlify, Google OAuth, Expo, browser push services). Report those to the respective vendors. We are happy to relay or coordinate where useful.
- denial-of-service from unrestricted traffic against rate limits we have not set
- reports relying on physical access to an unlocked device
- social-engineering attacks against maintainers or contributors
- bugs in the development build (`org.vasilyoshev.selftend.dev`) that do not affect the production build
- best-practice recommendations without an exploitable issue (welcome as regular issues, not as security reports)
- issues already covered in the public roadmap or known-issues docs

## Safe-harbor expectation

Good-faith security research that follows this policy is welcome. That means:

- you only access data belonging to test accounts you control, or accounts that have explicitly consented
- you do not exfiltrate, retain, or share user data
- you do not degrade the service for other users (no DoS, no automated mass scanning that creates load)
- you stop and report as soon as you confirm an issue, rather than escalating access

We will not pursue legal action against researchers acting in good faith under these conditions.

## What this is not

Selftend is a guided self-help product, not a regulated medical device, not an emergency service, and not a clinical record system. Reports should focus on confidentiality, integrity, and availability of user data and accounts. Mental-health content concerns (tone, accuracy, accessibility, safety framing) are valuable but go through the normal issue tracker rather than the security channel.

## Bounty

There is no monetary bug-bounty program. The project is non-profit, free to users, and currently maintainer-funded. Public credit is offered for any reporter who wants it.
