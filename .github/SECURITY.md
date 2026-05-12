# Security Policy

Last updated: 2026-05-12

Selftend stores private reflection data. Please report vulnerabilities privately.

## Report A Vulnerability

- Email: `security@selftend.org`
- GitHub Security Advisory: https://github.com/Selftend/selftend/security/advisories/new

Do not open a public issue for security problems. If there is no reply within 7 days, follow up by email.

Include:

- impact and affected surface
- reproduction steps or proof of concept
- relevant logs, screenshots, or network captures
- whether you want public credit after disclosure

A fix is not required. A clear report is enough.

## Response

The maintainer will:

- acknowledge the report within 7 days
- triage the issue or explain why it is out of scope
- share progress for issues planned for repair
- coordinate disclosure timing for serious issues
- credit the reporter if requested after the fix is public

## In Scope

- Expo web app at `selftend.org`
- Android and iOS builds released under the Selftend identity
- Supabase schema, RLS policies, storage rules, and edge functions in this repo
- sign-in, magic links, OAuth, sessions, account deletion, and export flows
- user-data leaks, missing RLS, or data sent to unintended parties
- web push reminder infrastructure controlled by this project

## Out Of Scope

- vulnerabilities in Supabase, Netlify, Google OAuth, Expo, browsers, or push providers
- denial-of-service reports based only on missing rate limits
- attacks requiring physical access to an unlocked device
- social engineering against maintainers or contributors
- development-build bugs that do not affect production builds
- best-practice suggestions without an exploitable issue
- issues already documented in the roadmap or known project docs

## Safe Harbor

Good-faith security research is welcome when you:

- use only accounts and data you control or have explicit consent to test
- do not exfiltrate, retain, or share user data
- do not degrade service for other users
- stop testing and report once the issue is confirmed

The project will not pursue legal action against researchers acting in good faith under this policy.

## Not A Clinical Channel

Security reports should focus on confidentiality, integrity, and availability of accounts and data. Mental-health content concerns belong in normal issues unless they expose private data or account safety risk.

## Bounty

There is no monetary bug bounty. Selftend is free, non-profit, and maintainer-funded. Public credit is available when requested.
