# Why the email-verification gate exists: repo archaeology

> Research for [wayfinder ticket #347](https://github.com/Selftend/selftend/issues/347)
> ("Why was the email-verification gate put there in the first place?"), part of map
> [#345](https://github.com/Selftend/selftend/issues/345). Resolved 2026-07-27.
> Sources are this repository's git history, `docs/`, shipped i18n copy, GitHub
> issues/PRs, and the Supabase documentation for the default it inherited.

## Bottom line

**Nobody decided to require email verification.** The gate is a hosted-Supabase default that
production inherited on day one, plus a client redirect added in passing while password auth was
being reinstated. No commit, no doc, no ADR, no issue and no PR in this repository states a reason
for it. In the whole repo the gate is given a _rationale_ exactly zero times and named as a
_liability_ three times.

One reason to keep an equivalent signal **was** reasoned about and written down — the count of
unconfirmed `auth.users` rows is the live tripwire for enabling CAPTCHA (#189, 2026-07-23) — but
that is a dependency discovered two months _after_ the gate existed, not the reason it was built.

**No legal, GDPR, or app-store-policy commitment depends on a verified email.** Details in §3.

## 1. Where the gate actually came from

The gate has two halves. Neither has a recorded decision behind it.

### 1a. The server switch — `enable_confirmations` (the real gate)

`supabase/config.toml:18-19` is only the _local_ stack. Production's "Confirm email" toggle lives
in the Supabase Dashboard, outside this repo, and **was never turned on by anyone here — it was on
by default**:

> "You can configure whether users need to verify their email to sign in. On hosted Supabase
> projects, this is **true by default**. On self-hosted projects or in local development, this is
> **false** by default."
> — Supabase docs, [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)

The git history matches that asymmetry exactly:

- `518bfba` (2026-05-07, "add local Supabase dev setup…") created `supabase/config.toml` with **no
  `[auth.email]` block at all** — so local ran on the CLI default (`false`) while production ran on
  the hosted default (`true`).
- `d8c7afd` (2026-05-26, **"fix email verification flow"**) added the three lines that still stand:

  ```toml
  [auth.email]
  enable_confirmations = true
  ```

  The commit message is that one line — no body. Its five files are `verify-email-form.tsx`, its
  test, EN/BG `auth.json`, and `config.toml`. `gh api repos/Selftend/selftend/commits/d8c7afd…/pulls`
  returns **empty** — pushed directly, no PR, no review thread.

  Read in sequence, this commit is not a decision to require verification. It is local dev being
  brought into line with a production behaviour that already existed and was already being coded
  against — the verify-email screen predates it by three weeks.

- `git log -S 'enable_confirmations' --all` returns exactly **two** commits ever: `d8c7afd` and
  `c713da2` (a docs commit describing it). The value has never been debated or changed.

- The comment block that _does_ sit above the flag (`supabase/config.toml:21-36`, from `9d063fa` /
  `5831572`) is entirely about `token_hash` vs `ConfirmationURL` under PKCE. It explains the link
  **format**. It never explains why confirmations are on.

### 1b. The client redirect — `protected-layout.tsx`

`git log -S 'email_confirmed_at' --all` puts the first occurrence in `1a6d809` (2026-05-03,
**"replace magic-link with email/password auth blocks"**), which added to `app/(app)/_layout.tsx`
(now `src/components/app/protected-layout.tsx:97`):

```tsx
if (!user?.email_confirmed_at) {
  return <Redirect href="/(auth)/verify-email" />;
}
```

Its message lists the change as a bare bullet with no justification:

```
- Add email verification requirement before app access
...
- Add verify-email route and gating in protected layout
```

and the ROADMAP hunk in the same commit records it the same flat way:

```diff
-- [x] passwordless email magic-link sign-in wired for web and native app flows
++ [x] email/password sign-in and sign-up with verification requirement
++ [x] verified-email gating before protected app access
```

`gh api repos/Selftend/selftend/commits/1a6d809…/pulls` also returns **empty** — direct push, no PR
body, no review discussion.

Two details make the silence louder:

- **The redirect carries no comment**, while the consent gate seven lines below it carries a
  six-line comment citing issue #164. The codebase explains the gate it reasoned about and says
  nothing about the one it didn't.
- **The earlier email/password flow had no such gate.** `1a6d809` is the first
  `email_confirmed_at` in the repo's history, and email/password auth existed before `d2050ea`
  (2026-04-16, "switch to Google OAuth and magic-link sign-in only") removed it. The gate is not a
  restored old behaviour; it is new in `1a6d809`.

### 1c. The most likely unstated cause (inference, not evidence)

Between `d2050ea` (2026-04-16) and `1a6d809` (2026-05-03) the only email sign-in was a **magic
link**, which proves inbox control by construction — you cannot sign in without opening the mail.
`1a6d809` replaced that with a password and added the verification requirement in the same commit.

The sequence is strongly suggestive: the gate looks like the property magic-link gave for free being
re-asserted by hand once passwords made it optional. **But nothing says so.** Treat this as the best
available narrative for a silent change, not as a recovered rationale.

## 2. Every evidenced reason, marked

| #   | Reason                                                                                                                                                                                                       | Status                                                            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **It is the hosted-Supabase default.** Production never had it turned on; it arrived on.                                                                                                                     | **Inherited**                                                     | [Supabase docs](https://supabase.com/docs/guides/auth/passwords): hosted default `true`. `518bfba` shipped `config.toml` with no `[auth.email]`; `d8c7afd` added `= true` to make _local_ match prod.                                                                                                                                                                                                                                 |
| R2  | **It replaced magic-link's built-in proof of inbox control.**                                                                                                                                                | **Inherited** (inferred from commit sequence; never written down) | `d2050ea` (2026-04-16) → magic-link only; `1a6d809` (2026-05-03) → passwords back + gate added in the same commit. No pre-`1a6d809` `email_confirmed_at` anywhere.                                                                                                                                                                                                                                                                    |
| R3  | **The client redirect is belt-and-braces over the server switch.** With `enable_confirmations = true` Supabase issues no session at all, so RLS already closes every table; the redirect only tidies the UI. | **Inherited**                                                     | `protected-layout.tsx:97`, added by `1a6d809` with no comment and no PR. Contrast the commented consent gate directly below it.                                                                                                                                                                                                                                                                                                       |
| R4  | **The unconfirmed-row count is the live tripwire for turning CAPTCHA on.**                                                                                                                                   | **DECIDED** — the only one                                        | Issue [#189](https://github.com/Selftend/selftend/issues/189) resolution (2026-07-23) and PR #197, recorded in `docs/operations-runbook.md:145-150` and `:263-272`: _"spike in unconfirmed `auth.users` rows — baseline 2/32 on 2026-07-23 … Any of these firing means the CAPTCHA deferral trigger has fired."_ Note this is a **post-hoc dependency**, ~2 months after the gate existed.                                            |
| R5  | **It carries Supabase's duplicate-signup enumeration protection**, which the app then had to work _around_.                                                                                                  | **Inherited** side-effect, not relied on                          | `3d03f72` (2026-05-21) added to `src/features/auth/api.ts`: _"When email enumeration protection is on, Supabase silently succeeds for existing accounts — identities will be empty instead of throwing an error."_ The app detects and reverses the obfuscation to show a real error.                                                                                                                                                 |
| R6  | **Nothing.** In three places the docs name the gate only as a cost.                                                                                                                                          | n/a — evidence _against_ a rationale                              | `docs/launch/smtp-deliverability-checklist.md:8-12`: _"With `enable_confirmations = true` … a tester who never receives the confirmation email is permanently stuck at signup. A whole tester wave can be lost silently."_ Also `docs/operations-runbook.md:238-244` (built-in SMTP "will break a tester wave with email confirmations enabled") and `docs/launch/first-impressions-plan.md:97-99` (_"signup *will* dead-end here"_). |

### Reasons people would assume exist, that do not

- **Account recovery / password-reset integrity.** The obvious candidate, and the standing
  constraint in map #345 — but **no pre-existing doc, commit, issue or PR argues it**. Password
  reset is documented as its own flow (`auth.json:49-59`, `supabase/README.md:154`,
  `operations-runbook.md:112-117`) and **does not read `email_confirmed_at`**. This is a reason the
  map is inventing now, not one it is recovering.
- **Bot / throwaway-signup prevention as a stated design goal.** "double opt-in", "throwaway
  email", "disposable email" and "email enumeration" as _concepts_ appear **nowhere** in the repo
  outside R5's incidental workaround. R4 uses the gate as an instrument; nothing claims it was
  built as a defence.
- **A security control.** `docs/security-optimization-audit-2026-06-01.md` (35 findings) never
  mentions email verification — not as a control, not as a gap. `e0fe99e` (2026-05-28), the
  deliberate auth-hardening pass that set the 12-char minimum and pre-enabled TOTP, wrote a detailed
  rationale for **every** toggle it touched and did not touch this one. The runbook line it added
  (`operations-runbook.md:46`) is pure inventory: _"**Email confirmations:** ON (already configured
  via `[auth.email]` in `config.toml` — verify the Dashboard view matches)."_ — "already
  configured", no reason given.
- **User-facing justification.** Not one of the 13 shipped verification strings in
  `src/i18n/locales/en/auth.json` tells the user _why_. No "to keep your account secure", no "so you
  can recover your password". The only "why" in the block (`auth.json:104`) explains the extra
  human-click gate on the link, i.e. a workaround for mail scanners (#211), not the gate itself.

## 3. Legal, GDPR and store-policy check — **nothing found**

This section is deliberately separate: a commitment here would constrain the spec rather than inform
it. **There is none.** Every legal, privacy and store surface refers to _having_ an email on file,
never to a _verified_ one.

| Surface                                                                       | What it actually commits to                                                                                                                                                                                                                                                                                           | Depends on verification?                           |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Lawful basis, `docs/policies.md:47-56`                                        | Email → **Contract, Art. 6(1)(b)**, _"Necessary to provide the service"_. Abuse prevention (Art. 6(1)(f)) is attached to **auth event logs**, not to email confirmation.                                                                                                                                              | **No**                                             |
| Published privacy policy, `src/i18n/locales/en/policies.json:22, 39`          | _"Processing your email … is necessary to provide the service you signed up for — maintaining your account, syncing your records, and delivering the self-help features."_                                                                                                                                            | **No**                                             |
| GDPR Art. 32 security measures, `docs/gdpr-compliance.md:31`                  | TLS, pgcrypto field encryption, Vault, RLS, SecureStore, CSP, HSTS. Email verification is **not listed**.                                                                                                                                                                                                             | **No**                                             |
| Age floor 18+, `docs/policies.md:36-45` (decision recorded 2026-07-23, #198)  | _"Attestation is passive: the terms and privacy policy state the 18+ requirement and creating an account constitutes agreement; there is no age checkbox at sign-up."_ Published copy: _"you represent that you are at least 18"_ (`policies.json:171`), and `policies.json:434` admits no age-assurance plan exists. | **No** — verification carries no age-gating weight |
| Published Terms §4, `policies.json:184-190`                                   | _"An account is required … so your records and preferences can sync across devices."_ / _"You are responsible for maintaining access to the email address associated with your account."_ The account's stated purpose is **sync**; the address burden is placed on the user with no verification promise.            | **No**                                             |
| Play listing + Data safety, `docs/android-closed-testing.md:223-241, 256-284` | Account exists _"so your records can sync across web and mobile builds."_ Play obligations are 18+ target audience, privacy-policy URL, deletion URL, data safety, health-apps declaration. "App access instructions" exist because the app is **account-required**, not verification-required.                       | **No**                                             |
| AGENTS.md:23                                                                  | _"Account access is required in MVP"_ — **account**, not verified account.                                                                                                                                                                                                                                            | **No**                                             |

Two things to carry into the spec anyway, neither of them a hard constraint:

- **Identity proof for GDPR requests is the closest adjacency.** `docs/operations-runbook.md:157`:
  _"Verify identity before disclosing or deleting account data. **Prefer** requests from the email
  address attached to the Selftend account."_ And the published fallback deletion path
  (`policies.json:322`) tells users to write to `privacy@selftend.org` _"from the email address
  associated with your account."_ An unverified address is a weaker proof for that workflow. This is
  an **operational** practice ("prefer", never reads `email_confirmed_at`), not a legal commitment —
  but the spec should say what identity proof an unverified account offers.
- **"One account per person"** (`policies.json:189`) is stated to users as a rule. It is not
  enforced today and does not rely on verification, but dropping the gate makes it cheaper to break.

## 4. Loose end noticed in passing

`supabase/README.md:149` still claims _"Local Auth has auto-confirm so the user is immediately
usable"_ for the sign-up-in-the-app path. That has been false locally since `d8c7afd` set
`enable_confirmations = true`. Worth correcting whichever way #345 lands.

## Sources

- Supabase, [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — hosted default
  `true`, local/self-hosted default `false`.
- Supabase CLI, [`auth.email.enable_confirmations`](https://supabase.com/docs/guides/cli/config#auth.email.enable_confirmations).
- Commits: `d2050ea`, `1a6d809`, `a4129c6`, `518bfba`, `3d03f72`, `4088322`, `d8c7afd`, `e63a344`,
  `e0fe99e`, `9d063fa`, `2200776`, `5831572`, `4e53a3b`, `c713da2`.
- Issues: [#189](https://github.com/Selftend/selftend/issues/189) (CAPTCHA re-defer),
  [#188](https://github.com/Selftend/selftend/issues/188) (CAPTCHA research),
  [#198](https://github.com/Selftend/selftend/issues/198) (final legal review),
  [#222](https://github.com/Selftend/selftend/issues/222) (age-assurance mechanics).
- Docs: `docs/operations-runbook.md`, `docs/policies.md`, `docs/gdpr-compliance.md`,
  `docs/android-closed-testing.md`, `docs/product-principles.md`, `docs/data-privacy-model.md`,
  `docs/security-optimization-audit-2026-06-01.md`, `docs/launch/smtp-deliverability-checklist.md`,
  `docs/launch/first-impressions-plan.md`, `supabase/README.md`.
- Shipped copy: `src/i18n/locales/en/auth.json`, `src/i18n/locales/en/policies.json`,
  `src/i18n/locales/en/security.json`.
- Negative searches run: `git log -S` on `enable_confirmations` / `email_confirmed_at` across all
  refs; `gh issue list --state all` and `gh pr list --state all` for verification / confirmation /
  signup / auth; repo-wide grep for double opt-in, disposable/throwaway email, email enumeration.
  No ADR directory exists in this repo (`docs/adr/` is absent).
