# Launch Checklist: Transactional Email Deliverability

**Purpose:** Prove that the three auth transactional emails — **signup
confirmation**, **password recovery**, and **email-change confirmation** —
actually reach testers' inboxes (not spam, not silently dropped) before
closed-testing invites go out.

**Why this is a launch blocker:** Supabase's built-in email sender is rate-limited
to a few messages/hour and sends from a generic Supabase domain that lands in
spam. With `enable_confirmations = true` (see `supabase/config.toml`), a tester
who never receives the confirmation email is permanently stuck at signup. A whole
tester wave can be lost silently.

**Scope / current state (from the repo):**

- `supabase/config.toml` sets `enable_confirmations = true` and points the four
  templates at `supabase/templates/*.html` (confirmation, recovery, email_change,
  invite). Those bodies are for the **local** stack; **production must mirror them
  in the Supabase Dashboard** (the config comment says so explicitly).
- The `send-feedback` edge function sends via **AWS SES** (env
  `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`, `SES_FROM_EMAIL`)
  from the DKIM-verified `send.selftend.org` identity — Resend was retired for
  feedback (control-tower #111). The stack is retiring Resend entirely
  (control-tower #102), so **Part A below targets SES** for auth custom SMTP too.
  Sending-domain authentication for `send.selftend.org` is already in place via SES.
- Canonical domain is **`selftend.org`** — **Cloudflare DNS** (registrar still
  Porkbun); the `send.selftend.org` sender lives in Cloudflare. Aliases like
  `support@`, `privacy@`, `security@` route to the owner's inbox via Cloudflare
  Email Routing.

**Legend:**

- 🔒 **OWNER-ONLY** — DNS records, provider dashboard, real inbox access, sending
  real mail. A coding agent cannot do these.
- 🛠 **Repo/agent-doable** — can be checked or prepared from the working tree.

---

## Part A — Provider + domain authentication (do once)

### A1. 🔒 Pick and configure the SMTP provider

- [ ] Use **AWS SES** — already the stack's transactional provider (`send-feedback`
      sends via the SES v2 API). For auth mail use **SES SMTP**. The sending domain
      `send.selftend.org` is already a verified SES identity (Easy DKIM + custom
      MAIL FROM), so no new domain onboarding is needed.
- [ ] Decide the **From** address for auth mail. Recommended:
      `no-reply@send.selftend.org` — it must be on the **verified SES domain**
      (`send.selftend.org`), and ideally a mailbox/alias that can receive replies
      or bounces. Record the choice.
- [ ] Decide the **From name**: `Selftend`.

> Note: `SES_FROM_EMAIL` used by `send-feedback` may differ from the auth From
> address — that's fine, but both must be on the verified SES domain
> `send.selftend.org`.

### A2. 🔒 Publish SPF / DKIM / DMARC DNS records (Cloudflare)

For `send.selftend.org` these are **already published** — added when the SES
identity was verified (control-tower #110): SES Easy DKIM `CNAME`s, the custom
MAIL FROM `bounce.send.selftend.org` (`MX` → `feedback-smtp.eu-central-1.amazonses.com`
plus SPF `v=spf1 include:amazonses.com ~all`), and DMARC at `_dmarc.send.selftend.org`
(`p=none`). If auth mail sends from that same domain, **no new records are needed** —
just confirm:

- [ ] The `send.selftend.org` identity shows **Verified** in the SES console
      (DKIM + MAIL FROM both successful).
- [ ] Optionally tighten `_dmarc.send.selftend.org` from `p=none` to
      `p=quarantine` once you've confirmed alignment for a week.

### A3. 🔒 Point Supabase Auth at the custom SMTP

Supabase Dashboard → Project Settings → Auth → **SMTP Settings**:

- [ ] Enable **Custom SMTP**.
- [ ] Host/port/user/pass from **SES SMTP credentials** (SES console → **SMTP
      settings → Create SMTP credentials** — these are distinct from the
      `ses-sender` API access key; the console mints a dedicated IAM user for SMTP).
      Host `email-smtp.eu-central-1.amazonaws.com`, port `465` (TLS) or `587`
      (STARTTLS), username/password = the generated SMTP credentials.
- [ ] **Sender email** = the authenticated From address from A1.
      **Sender name** = `Selftend`.
- [ ] Save. Supabase sends a verification/test — confirm it succeeds. (The account
      must be out of the SES **sandbox**, or the test recipient verified —
      control-tower #109.)

### A4. 🔒 Mirror the production email templates + review rate limits

- [ ] In Supabase Dashboard → Auth → Email Templates, paste the bodies from
      `supabase/templates/{confirmation,recovery,email_change,invite}.html` so
      production matches local. **Critical:** these templates use
      `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=...` links
      (not the default `{{ .ConfirmationURL }}`, and not `{{ .RedirectTo }}`) —
      the config comment explains why: `ConfirmationURL` breaks cross-browser
      ("PKCE code verifier not found in storage"), and `RedirectTo` renders as
      the dead literal `ZgotmplZ` when a native client sent the app scheme.
- [ ] Confirm the subjects match config.toml (`Confirm your email for Selftend`,
      `Reset your Selftend password`, etc.).
- [ ] Confirm the `Site URL` is exactly `https://selftend.org` (no trailing
      slash — `{{ .SiteURL }}` is the base of every emailed link) and the
      redirect allow-list includes `https://selftend.org/auth-callback` plus
      the app scheme(s).
- [ ] Auth → Rate Limits: confirm signup/OTP/recovery limits won't lock out a
      12–20 tester wave arriving the same day (several may share an office/household
      IP). Raise if needed for the wave.

---

## Part B — Repo/template sanity (🛠 agent-doable, do before Part C)

- [ ] Confirm every template's action link uses the `token_hash` form, not
      `{{ .ConfirmationURL }}`:
      `grep -n "ConfirmationURL\|token_hash" supabase/templates/*.html`
      — expect only `token_hash` hits.
- [ ] Confirm each template has a plain-text-visible purpose line (the hidden
      preheader `<span>` is present in confirmation/recovery) and an
      "ignore this email if you didn't request it" line — both help spam scoring
      and user trust. (Present as of this writing.)
- [ ] Confirm links are absolute `https://` (spam filters penalize bare/relative
      links) — they are, via `{{ .SiteURL }}`.
- [ ] Note: templates render an HTML button with a bare-domain fallback is
      **absent** — consider adding a visible plain URL under the button for
      clients that strip buttons. (Owner judgment; not a blocker.)

---

## Part C — 🔒 OWNER-ONLY — Manual send-and-receive test (the real gate)

You must actually receive each email at real inboxes across major providers.
Prepare **fresh** test addresses at:

- [ ] **Gmail** (largest; strictest bulk rules)
- [ ] **Outlook / Hotmail / Live** (notoriously aggressive filtering)
- [ ] **Yahoo** (or iCloud) — a third independent filter
- [ ] Optionally a corporate domain (Microsoft 365 / Google Workspace)

### C1. Signup confirmation

For each provider address:

- [ ] Sign up in the production build/app with that address.
- [ ] Email arrives within ~1–2 min. **Record: Inbox vs Spam vs Never.**
- [ ] From shows `Selftend <no-reply@selftend.org>` (your chosen From), not a
      Supabase default domain.
- [ ] The "Confirm email address" link opens and completes signup **on a
      different browser/device than the one that requested it** (this exercises
      the `token_hash` cross-device fix). It should succeed, not error.
- [ ] Link works once; a second click shows an expired/used state, not a crash.

### C2. Password recovery

- [ ] Trigger "reset password" for each provider address.
- [ ] Email arrives; **Inbox vs Spam** recorded.
- [ ] "Choose a new password" link opens the reset flow and lets you set a new
      password. Confirm you can then sign in with it.

### C3. Email-change confirmation

- [ ] From a signed-in account, change the email to a second test address.
- [ ] Confirmation email arrives at the **new** address; link confirms the change.
- [ ] (If your config also notifies the old address, confirm that arrives too.)

### C4. Deliverability scoring

- [ ] Send one confirmation (or a copy of the template) to
      **<https://www.mail-tester.com>** (or GlockApps / Postmark spam check) and
      aim for **9–10/10**. It flags missing SPF/DKIM/DMARC alignment, spammy
      HTML, and blacklist hits.
- [ ] In Gmail, open the received email → **Show original** → confirm
      **SPF: PASS**, **DKIM: PASS**, **DMARC: PASS**, and that DKIM/SPF domains
      **align** with `selftend.org` (the From domain).
- [ ] Confirm the sending IP / domain isn't on a major blocklist (mail-tester
      reports this; or check the provider's reputation dashboard).

---

## Part D — Post-verification hardening (owner, after C passes)

- [ ] Tighten DMARC from `p=none` to `p=quarantine` once a week of `rua`
      reports shows only aligned mail.
- [ ] Watch bounce/complaint rates in the **SES console / Virtual Deliverability
      Manager** (a hard-bounce or spam-complaint spike during closed testing is an
      early warning); SES's account-level suppression list catches repeat bounces.
- [ ] Record the final From address, provider, and "deliverability verified"
      date in `docs/operations-runbook.md` Pre-Invite Checklist (the SMTP item
      there currently only says "send a test signup and confirm it arrives" —
      upgrade it to reference this checklist's Part C evidence).

---

## Sign-off checklist (owner)

- [ ] 🔒 Provider domain authenticated; SPF + DKIM + DMARC published & verified (A1–A2)
- [ ] 🔒 Supabase Custom SMTP enabled and test-verified (A3)
- [ ] 🔒 Production templates mirror repo `token_hash` templates; redirect
      allow-list correct (A4)
- [ ] 🔒 Rate limits sized for the tester wave (A4)
- [ ] 🛠 Template link/format sanity passed (Part B)
- [ ] 🔒 Signup / recovery / email-change all received at Gmail + Outlook +
      Yahoo, **Inbox not Spam**, links work cross-device (C1–C3)
- [ ] 🔒 mail-tester score ≥ 9/10; SPF/DKIM/DMARC all PASS & aligned (C4)

Do **not** send closed-testing invites until every 🔒 box is checked.
