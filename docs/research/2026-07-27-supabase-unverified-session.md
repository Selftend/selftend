# Can Supabase represent a signed-in user with an unverified email?

> Research for [wayfinder ticket #346](https://github.com/Selftend/selftend/issues/346), part of the
> [email-verification map #345](https://github.com/Selftend/selftend/issues/345). Resolved 2026-07-27.
>
> **Verdict: not via email/password signup.** There is no configuration in which `POST /signup` with an
> email and password returns a session while leaving `email_confirmed_at` null. The row state itself
> _is_ representable — GoTrue mints it on one code path — but that path is the OAuth callback, and it is
> unreachable from the signup form. Three workaround routes exist; all three are evaluated below.
> **This note does not pick one** — that is a later decision.
>
> GoTrue line references are pinned to commit
> [`67c55c0`](https://github.com/supabase/auth/tree/67c55c00789d69505881e3143dc248a2a1d2ab55)
> (`supabase/auth` `master` as of 2026-07-27, verified byte-identical to `master` at time of writing).
> Documentation was checked 2026-07-27.

## 1. What `enable_confirmations = false` / `MAILER_AUTOCONFIRM` actually does

**Confirmed: it auto-confirms every user immediately.** The expectation in the ticket is correct.

`Signup` branches on the flag and, when it is on, calls `user.Confirm(tx)` inline —
[`internal/api/signup.go:228-253`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/signup.go#L228-L253):

```go
if params.Provider == "email" && !user.IsConfirmed() {
    if config.Mailer.Autoconfirm {
        // ... audit log: UserSignedUpAction
        if terr = user.Confirm(tx); terr != nil {
            return apierrors.NewInternalServerError("Database error updating user").WithInternalError(terr)
        }
    } else {
        // ... audit log: UserConfirmationRequestedAction
        if terr = a.sendConfirmation(r, tx, user, flowType); terr != nil {
            return terr
        }
    }
}
```

`Confirm()` sets the timestamp and, notably, also writes `user_metadata.email_verified = true` —
[`internal/models/user.go:444-465`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/models/user.go#L444-L465):

```go
func (u *User) Confirm(tx *storage.Connection) error {
	u.ConfirmationToken = ""
	now := time.Now()
	u.EmailConfirmedAt = &now

	if err := tx.UpdateOnly(u, "confirmation_token", "email_confirmed_at"); err != nil {
		return err
	}

	if err := u.UpdateUserMetaData(tx, map[string]interface{}{
		"email_verified": true,
	}); err != nil {
```

And `IsConfirmed()` is nothing but a null check on that column —
[`internal/models/user.go:190-192`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/models/user.go#L190-L192):

```go
func (u *User) IsConfirmed() bool {
	return u.EmailConfirmedAt != nil
}
```

The two behaviours are welded together. **Session issuance at signup is gated on exactly the same
predicate** — [`internal/api/signup.go:305-344`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/signup.go#L305-L344):

```go
// handles case where Mailer.Autoconfirm is true or Phone.Autoconfirm is true
if user.IsConfirmed() || user.IsPhoneConfirmed() {
    // ... issueRefreshToken ...
    return sendJSON(w, http.StatusOK, token)   // <- session
}
// ...
return sendJSON(w, http.StatusOK, user)        // <- bare user, session: null
```

So `email_confirmed_at != null` is _the_ condition for getting a token out of `/signup`. Turning the flag
off does not create unverified sessions; it removes the distinction between verified and unverified
entirely, exactly as the ticket suspected. The docs describe the same behaviour from the client side
([`signUp` JS reference](https://supabase.com/docs/reference/javascript/auth-signup)):

> If **Confirm email** is enabled, a `user` is returned but `session` is null.
> If **Confirm email** is disabled, both a `user` and a `session` are returned.

Three side effects of flipping the flag that are easy to miss:

- **User-enumeration protection is lost.** Signing up with an already-registered address returns a hard
  `422 user_already_exists` instead of the sanitised fake-user object
  ([`signup.go:293-300`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/signup.go#L293-L300)).
  The docs say the same: _"When either Confirm email or Confirm phone … is disabled, the error message,
  `User already registered` is returned."_
- **PKCE stops working for signup.** The `signUp` reference states plainly: _"The PKCE flow cannot be used
  when autoconfirm is enabled."_ Our client is configured `flowType: "pkce"` in `src/lib/supabase.ts`.
- **The email rate limiter is bypassed.** `sendEmail` skips the limiter entirely when autoconfirm is on
  ([`internal/api/mail.go:796-807`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/mail.go#L796-L807), marked
  `TODO(km): Deprecate this behaviour`). Moot at signup — no mail is sent — but it changes the posture of
  every other auth mail.

Documentation note: the [CLI config reference](https://supabase.com/docs/guides/local-development/cli/config)
describes `auth.email.enable_confirmations` (default `false`) as _"If enabled, users need to confirm their
email address before signing in."_ The [self-hosting env-var page](https://supabase.com/docs/guides/self-hosting/auth/config)
publishes **that same sentence verbatim for `GOTRUE_MAILER_AUTOCONFIRM`**, which is its inverse. That
description is wrong — the source above is authoritative. Also worth recording:
_"On hosted Supabase projects, this is true by default. On self-hosted projects or in local development,
it is false by default"_ ([Password-based auth](https://supabase.com/docs/guides/auth/passwords)), which
is why `supabase/config.toml` sets it explicitly.

## 2. Is there any config that yields session + null `email_confirmed_at`?

**Not from `/signup`.** No config field participates in the `if user.IsConfirmed() || user.IsPhoneConfirmed()`
gate — it reads model state only.

The full `MailerConfiguration` surface is
[`internal/conf/configuration.go:611-650`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/conf/configuration.go#L611-L650).
One field is worth dwelling on.

### `MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS` — does exactly what the map wants, on a path we cannot reach

```go
type MailerConfiguration struct {
	Autoconfirm                 bool `json:"autoconfirm"`
	AllowUnverifiedEmailSignIns bool `json:"allow_unverified_email_sign_ins" split_words:"true" default:"false"`
```

A repository-wide search finds it read in exactly **one** non-test location — the **external OAuth
callback**, [`internal/api/external.go:394-437`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/external.go#L394-L437):

```go
if hasEmails && !user.IsConfirmed() {
    if decision.CandidateEmail.Verified || config.Mailer.Autoconfirm {
        // ... user.Confirm(tx), then issue token
    } else {
        emailConfirmationSent := false
        if decision.CandidateEmail.Email != "" {
            if terr = a.sendConfirmation(r, tx, user, models.ImplicitFlow); terr != nil { ... }
            emailConfirmationSent = true
        }
        if !config.Mailer.AllowUnverifiedEmailSignIns {
            if emailConfirmationSent {
                err := apierrors.NewUnprocessableEntityError(
                    apierrors.ErrorCodeProviderEmailNeedsVerification, ...)
                return 0, nil, storage.NewCommitWithError(err)
            }
            ...
        }
    }
}
```

With the flag on, the mail is still sent, `email_confirmed_at` stays null, and the callback falls through
to issue a session. **So the target state is representable in the schema, and GoTrue does mint it — but
only when an OAuth provider hands over an unverified email.** It is never consulted by `/signup`,
`/token`, `/verify`, `/resend` or `/user`. The tests that exercise it are `external_github_test.go` and
`external_kakao_test.go`. It is also mutually exclusive with autoconfirm —
[`configuration.go:1140-1142`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/conf/configuration.go#L1140-L1142):
`"cannot enable both GOTRUE_MAILER_AUTOCONFIRM and GOTRUE_MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS"`.

And it is unreachable for us in any case: it appears in **no** Supabase documentation — not the
[self-hosting env-var list](https://supabase.com/docs/guides/self-hosting/auth/config), not the
[CLI config schema](https://supabase.com/docs/guides/local-development/cli/config) (which lists only
`enable_signup`, `enable_confirmations`, `double_confirm_changes`, `secure_password_change`, `otp_length`,
`otp_expiry`, `max_frequency` under `[auth.email]`).

That this gap is known and unclosed is corroborated by the tracker: discussion
[#22363](https://github.com/orgs/supabase/discussions/22363), _"Enable the use of
`AllowUnverifiedEmailSignIns` for Email provider"_ (Apr 2024), requests precisely this extension. A
collaborator points at [supabase/auth#1661](https://github.com/supabase/auth/pull/1661), _"feat: set
`email_confirmed_at` to null when autoconfirm is on"_ — **still open and unmerged**, with a maintainer
requesting changes because it _"will change the expected behaviour … which can result in a breaking change
for many folks if they rely on the `email_confirmed_at` column in RLS policies."_ Comments as recent as
Jun 2025 report the need still unmet.

### And the password grant closes the back door

Even where such a session exists, the user cannot sign in again with a password —
[`internal/api/token.go:181-185`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/token.go#L181-L185):

```go
if params.Email != "" && !user.IsConfirmed() {
    return apierrors.NewBadRequestError(apierrors.ErrorCodeEmailNotConfirmed, "Email not confirmed")
}
```

No config bypasses this. The docs state the same rule:
_"By default, a user with an unverified email or phone number will not be able to sign in"_
([Users](https://supabase.com/docs/guides/auth/users)).

**Conclusion for §2:** there is no supported configuration in which an email/password signup issues a
session, leaves `email_confirmed_at` null, still sends the confirmation mail, and keeps `resend`/`verifyOtp`
able to confirm later.

## 3. The three alternative routes

### Route (a) — autoconfirm + our own verification state

`enable_confirmations = false`, plus a Selftend-owned notion of "verified".

GoTrue then gives us: an immediate session at signup; `email_confirmed_at` populated (and therefore
useless as a signal); `user_metadata.email_verified = true` (equally useless); **no confirmation mail sent
at all**; no PKCE on signup; and no user-enumeration protection (§1).

What we would have to rebuild, measured against the current codebase:

| Piece                       | Status today                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification-state store    | **Does not exist.** New column/table + policy. No RLS policy in `supabase/migrations/` reads confirmation or anonymity today — every predicate is `(select auth.uid()) = user_id`.                                    |
| Token minting               | **Does not exist.** GoTrue's `token_hash` is only obtainable via the Admin API `generateLink`, which needs the service-role key — so it must live in an Edge Function, never the client.                              |
| Mail transport              | **Exists.** `supabase/functions/_shared/ses.ts` already sends via AWS SES v2 (SigV4 via `aws4fetch`), used by `send-feedback` and `send-web-reminders`. A verification mailer could reuse it.                         |
| Mail template               | **Does not exist** outside GoTrue. `supabase/templates/*.html` are GoTrue-owned; a self-sent mail needs its own template plus i18n of the body. The existing functions send app-authored mail only, never auth links. |
| Rate limiting / idempotency | **Does not exist** for this path. Client-side `useAuthThrottle()` (5 attempts / 30 s) is a UI courtesy, not a server limit.                                                                                           |
| Token redemption            | **New** Edge Function or RPC. The `auth-callback` route only understands GoTrue's `?code=` and `?token_hash=&type=`.                                                                                                  |

This creates an asymmetry: the _recovery_ mail stays GoTrue's, but the _verification_ mail becomes ours,
so the two diverge in template, deliverability posture, and rate limiting — against the same SES sender
identity whose reputation the project has deliberately protected.

Downstream in the app, `email_confirmed_at` becomes meaningless, so the gate at
`src/components/app/protected-layout.tsx:97` (`if (!user?.email_confirmed_at)`) becomes dead code, and
`verify-email-form.tsx` — which polls `getSession()` every 4 s and calls `refreshSession()` to pick up the
new claim — loses its subject entirely.

### Route (b) — `signInAnonymously()` then `updateUser({ email })`

`SignupAnonymously` unconditionally issues a token —
[`internal/api/anonymous.go:41-51`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/anonymous.go#L41-L51) — so
this is the only route that genuinely produces "usable session, email not verified" for a form signup.
The docs describe the conversion:

> Converting an anonymous user to a permanent user requires linking an identity to the user. This requires
> you to enable manual linking in your Supabase project.
> […] You can use the `updateUser()` method to link an email or phone identity to the anonymous user. To
> add a password for the anonymous user, the user's email or phone number needs to be verified first.
> — [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)

Five findings that matter, four of them only obtainable from source.

**1. The documented password constraint is stricter than the enforced one.** The actual code check is
[`internal/api/user.go:112-118`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go#L112-L118):

```go
if user.IsAnonymous {
    if params.Password != nil && *params.Password != "" {
        if params.Email == "" && params.Phone == "" {
            return apierrors.NewUnprocessableEntityError(apierrors.ErrorCodeValidationFailed,
                "Updating password of an anonymous user without an email or phone is not allowed")
        }
    }
}
```

It requires an email or phone to be **present in the request**, not **verified**. There is no
`IsConfirmed()` check anywhere in `PUT /user`, and the password write (`user.UpdatePassword`,
[`user.go:211`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go#L211))
runs _before_ the email-change branch
([`user.go:240`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go#L240))
in the same transaction. So `updateUser({ email, password })` in a single call is accepted. **Only the
password-setting step carries the documented constraint** — and it carries it as guidance, not
enforcement. (The docs are also internally inconsistent here: the constraint sentence appears in the
JavaScript and Python tabs and is absent from the Flutter, Swift and Kotlin tabs of the same section.)

**2. But the constraint bites anyway, for a different reason.** Until verification, `user.Email` stays
empty — `ConfirmEmailChange` is what moves `EmailChange` into `Email`
([`models/user.go:485-532`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/models/user.go#L485-L532)).
A password with no email on the row is unusable: `signInWithPassword` has nothing to match, and
`resetPasswordForEmail` cannot find the row either. So while the _write_ succeeds, the account stays
reachable **only via the anonymous session's refresh token on that one device** until the email is
verified. Losing the device before verifying loses the data outright. Against the map's standing
"recovery integrity is in scope" constraint, this is the central risk of route (b) — and it is strictly
worse than today's behaviour, where an unverified user has no data to lose.

**3. The double-confirmation trap does not fire for anonymous users.** `SecureEmailChangeEnabled` defaults
`true` (`configuration.go:620`; docs: _"a user will be required to confirm any email change on both the
old, and new email addresses"_), but the guard includes `user.GetEmail() != ""` —
[`verify.go:545-550`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L545-L550) — so an
anonymous user with no current email gets a single confirmation on the new address only. This would _not_
hold for a later email change by a permanent user.

**4. The mail is the `email_change` template, and it renders with an empty `{{ .Email }}`.** This is
documented explicitly — [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
describes `{{ .Email }}` as _"the original email address of the user. **Empty when trying to link an email
address to an anonymous user.**"_ Our `supabase/templates/email_change.html` and its production Dashboard
twin would both need reviewing for that case; `{{ .NewEmail }}` is the address to use.

**5. `is_anonymous` flips to `false` only on successful verification**, inside `emailChangeVerify` —
[`verify.go:613-618`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L613-L618).
**No Supabase doc states this anywhere** — it was established from source only, and it is the single most
important fact for using `is_anonymous` as the verified/unverified signal.

Operational preconditions and costs specific to this route: `auth.enable_anonymous_sign_ins` defaults to
`false` and must be turned on; so must manual identity linking. Supabase _"strongly recommends"_ invisible
CAPTCHA or Cloudflare Turnstile against abuse (neither exists in the app today), and the Supabase database
advisor raises lint [`0012_auth_allow_anonymous_sign_ins`](https://supabase.com/docs/guides/database/database-advisors?lint=0012_auth_allow_anonymous_sign_ins)
whenever the feature is on, warning that _"anonymous users share the same database role as permanent users,
so existing security policies may unintentionally grant them access"_ — every existing policy would need
re-auditing. _"Automatic cleanup of anonymous users is currently not available"_; manual SQL deletion of
rows older than 30 days is the documented remedy. `signInAnonymously` is not currently called anywhere in
`src/`.

### Route (c) — OTP / magic-link signup instead of password

`signInWithOtp` with `shouldCreateUser: true` routes to `MagicLink`, which internally calls `Signup` with a
33-character random password when the user is new _or_ not yet confirmed —
[`internal/api/magic_link.go:74-136`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/magic_link.go#L74-L136):

```go
if user != nil {
    isNewUser = !user.IsConfirmed()
}
if isNewUser {
    // User either doesn't exist or hasn't completed the signup process.
    // Sign them up with temporary password.
    password := crypto.GeneratePassword(config.Password.RequiredCharacters, 33)
```

So this route **also issues no session before verification** — it inherits §1 wholesale. The docs confirm
the response shape: _"you receive a response with `error: null` and a `data` object where both `user` and
`session` are null. Let the user know to check their email inbox."_
([Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)).

Route (c) changes _what the wall is made of_ (one click in a mail instead of a password plus a click), not
_whether there is a wall_. It is **not a route to unverified access**. It is relevant to the map only as a
way to lower the wall's friction, or in combination with route (a).

### Summary of viability

| Route                                         | Session before verification? | Verified/unverified distinguishable? | Confirmation mail still GoTrue's? |
| --------------------------------------------- | ---------------------------- | ------------------------------------ | --------------------------------- |
| Status quo (`enable_confirmations = true`)    | **No**                       | Yes                                  | Yes                               |
| Native "unverified session" via signup config | **Does not exist**           | —                                    | —                                 |
| (a) autoconfirm + own state                   | Yes                          | Only via something we build          | **No** — none is sent             |
| (b) anonymous + `updateUser({ email })`       | **Yes**                      | Yes, via `is_anonymous`              | Yes (`email_change` template)     |
| (c) OTP / magic link                          | **No**                       | Yes                                  | Yes (magic-link template)         |

Only **(a)** and **(b)** deliver "usable session immediately". **(c)** does not.

## 4. Per-route behaviour of `resend`, `verifyOtp`, `resetPasswordForEmail`, `email_change`

### `resend({ type: "signup" })`

Validated types are `signup`, `email_change`, `sms`, `phone_change`
([`resend.go:22-34`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/resend.go#L22-L34)).
For `signup`, the handler short-circuits when the user is already confirmed —
[`resend.go:100-121`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/resend.go#L100-L121):

```go
case mail.SignupVerification:
    if user.IsConfirmed() {
        // if the user's email is confirmed already, we don't need to send a confirmation email again
        return sendJSON(w, http.StatusOK, map[string]string{})
    }
```

It also returns an empty `200` when the user is not found (`resend.go:94-96`), so a silent empty `200` is
ambiguous between "unknown address" and "already confirmed". **The docs do not document the
already-confirmed case at all** — this is source-only. (The `resend` reference does say the method _"will
only resend an email or phone OTP to the user if there was an initial signup, email change or phone change
request being made"_, and that passwordless resends go through `signInWithOtp()` and recovery resends
through `resetPasswordForEmail()` instead.)

- **Route (a): always a silent no-op.** Every user is confirmed, so this returns `{}` and sends nothing.
  `resendVerificationEmail()` in `src/features/auth/api.ts` becomes inert, along with the "already
  confirmed" error mapping in `verify-email-form.tsx`.
- **Route (b):** `type: "signup"` is the **wrong type** — the pending state is an email change, so
  `type: "email_change"` is required. That branch resends only if `user.EmailChange != ""`
  (`resend.go:111-115`) and dispatches `sendEmailChange` (`resend.go:146-153`). It does not check
  `IsConfirmed()`.
- **Route (c):** the resend equivalent is calling `signInWithOtp` again, not `/resend`.

### `verifyOtp`

Dispatch: `signup` and `invite` → `signupVerify`; `recovery` and `magiclink` → `recoverVerify`;
`email_change` → `emailChangeVerify`
([`verify.go:151-168`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L151-L168)).
`type=email` is a **dispatcher, not a type of its own** — it probes both `confirmation_token` and
`recovery_token` and rewrites the type to `signup` or `magiclink`
([`verify.go:734-744`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L734-L744)).
`verifyPost` then issues a session unconditionally.

There is no explicit `!IsConfirmed()` guard on `signupVerify`; the implicit guard is that `Confirm()`
blanks `confirmation_token`, so a confirmed user's token no longer matches and lookup fails with
`403 otp_expired`.

**Worth flagging for the spec regardless of route:** the
[`verifyOtp` reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) now states that
**`signup` and `magiclink` are deprecated** types, and that `email` should be used _"when verifying an OTP
sent to the user's email during sign-up or sign-in"_. `src/features/auth/callback.ts` currently accepts
`signup`, `invite`, `recovery`, `email_change`, `email`, and our `supabase/templates/confirmation.html`
emits `type=signup` links. Both still work (the source dispatch above still handles `signup`), but this is
existing drift independent of this map.

Per route: (a) nothing to verify — no signup token is ever minted. (b) `type: "email_change"`; on success
it clears the change tokens, sets `Email`, calls `Confirm()` if not already confirmed, and flips
`is_anonymous` to false. (c) `type: "email"` (or the deprecated `magiclink`), confirming via
`recoverVerify`.

### `resetPasswordForEmail`

**It does not require a confirmed email.** `Recover` looks the user up and sends, with no `IsConfirmed()`
check anywhere in the file —
[`internal/api/recover.go:49-70`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/recover.go#L49-L70).
A missing user yields an empty `200` (enumeration protection, imperfect: malformed addresses still get
`400 validation_failed`, and rate-limit errors are observable).

The sharpest consequence, and one that reframes the map's recovery question: **completing a password reset
also confirms the email.** `recoverVerify` does this explicitly —
[`verify.go:378-387`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L378-L387):

```go
if !user.IsConfirmed() {
    // ... audit log: UserSignedUpAction
    if terr = user.Confirm(tx); terr != nil {
        return terr
    }
}
```

In GoTrue's model, "can receive mail at this address" _is_ the verification proof, so recovery and
verification are the same act. That is native today and needs no work.

- **Route (a):** recovery works, but its confirming side-effect is meaningless (everyone is already
  confirmed), so it cannot double as our verification signal without us wiring that ourselves.
- **Route (b): recovery is unavailable before verification** — `FindUserByEmailAndAudience` cannot match a
  row whose `email` is still empty, so the call returns the indistinguishable empty `200`. Same gap as
  §3(b)(2).
- **Route (c):** a recovery mail on an unconfirmed user confirms them on click, as above.

### The `email_change` flow

Governed by `SecureEmailChangeEnabled` (default `true`, `configuration.go:620`; `config.toml` key
`double_confirm_changes`; docs: _"By default, email updates sends a confirmation link to both the user's
current and new email"_). Skipped when the user has no current email (§3(b)(3)) and short-circuited
entirely for anonymous users **only when autoconfirm is on** —
[`internal/api/user.go:240-264`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go#L240-L264):

```go
if user.IsAnonymous && config.Mailer.Autoconfirm {
    // anonymous users can add an email with automatic confirmation, which is similar to signing up
    // permanent users always need to verify their email address when changing it
```

Note the interaction: **routes (a) and (b) are mutually exclusive in their preferred settings.** Route (a)
needs autoconfirm on, which would make an anonymous user's `updateUser({ email })` auto-confirm with no
mail at all — collapsing route (b) into route (a).

## 5. What the JWT looks like

There is **no email-confirmation claim in the access token.** The full claim set is
[`internal/tokens/service.go:73-86`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/tokens/service.go#L73-L86):

```go
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	Email                         string                 `json:"email"`
	Phone                         string                 `json:"phone"`
	AppMetaData                   map[string]interface{} `json:"app_metadata"`
	UserMetaData                  map[string]interface{} `json:"user_metadata"`
	Role                          string                 `json:"role"`
	AuthenticatorAssuranceLevel   string                 `json:"aal,omitempty"`
	AuthenticationMethodReference AMRClaim               `json:"amr,omitempty"`
	SessionId                     string                 `json:"session_id,omitempty"`
	IsAnonymous                   bool                   `json:"is_anonymous"`
	ClientID                      string                 `json:"client_id,omitempty"`
	Scope                         string                 `json:"scope,omitempty"`
}
```

`email_verified` _is_ a first-class claim — but only on the **OIDC ID token**
([`service.go:88-98`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/tokens/service.go#L88-L98)),
a different token that Supabase clients do not use for RLS.

Implications per route:

- **Route (a):** the only RLS-readable signal would be something we write. `user_metadata.email_verified`
  is in the JWT and `Confirm()` sets it — but **it is client-writable and therefore untrusted**:
  `PUT /user` gates `app_metadata` behind `isAdmin`
  ([`user.go:100-104`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go#L100-L104))
  and applies no such gate to `data` → `user_metadata`. Any signed-in user can set their own
  `email_verified: true`. (It is also never written as `false`; an unconfirmed user simply lacks the key.)
  A trustworthy signal must be `app_metadata` (service-role writes only), a table column with a policy
  forbidding self-service updates, or a **Custom Access Token Auth Hook** — the hook receives the claims
  map and can replace it wholesale before signing
  ([`service.go:721-739`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/tokens/service.go#L721-L739)),
  which is the supported way to add a genuine confirmed-state claim.
- **Route (b):** `is_anonymous` is a real, server-controlled boolean claim, and Supabase documents RLS
  against it:

  ```sql
  create policy "Only permanent users can post to the news feed"
  on news_feed as restrictive for insert
  to authenticated
  with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false );
  ```

  Note the docs' emphasis that this must be `as restrictive`, because _"RLS policies are permissive by
  default, which means that they are combined using an 'OR' operator"_
  ([Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)). This is the only route
  where the distinction is enforceable at the database with no new machinery — at the cost of re-auditing
  every existing policy.

- **Route (c):** identical to the status quo — a session only ever exists post-confirmation.

Today the repo reads none of this server-side: no RLS policy in `supabase/migrations/` references
`confirmed_at`, `is_anonymous`, or `auth.jwt()`. The gate is entirely client-side. Related row-level
detail, source-only: a plain email signup writes `identities.identity_data.email_verified = false`, flipped
to `true` in `signupVerify`
([`verify.go:350-360`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go#L350-L360)) —
a per-identity signal that is _not_ in the JWT.

## 6. Rate limits and SMTP behaviour per route

Two sources disagree in detail because they describe different things: GoTrue's compiled-in defaults, and
the limits Supabase's hosted platform actually applies. Both are given.

**Hosted platform** ([Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), verbatim
figures) — token-bucket, max capacity 30, `429` on exhaustion:

| Operation                          | Endpoint                       | Limited by   | Limit                                                                                                                                            |
| ---------------------------------- | ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoints that trigger email sends | `/signup`, `/recover`, `/user` | project-wide | **2 emails/hour on the built-in provider**; changeable only with custom SMTP. Applied to `/user` _only_ when the call updates the email address. |
| Send OTPs                          | `/otp`                         | project-wide | 30/hour                                                                                                                                          |
| Send OTPs or magic links           | `/otp`                         | per user     | 60 s between requests                                                                                                                            |
| Signup confirmation request        | `/signup`                      | per user     | 60 s between requests                                                                                                                            |
| Password reset request             | `/recover`                     | per user     | 60 s between requests                                                                                                                            |
| Verification requests              | `/verify`                      | IP           | 360/hour, burst 30, **not customizable**                                                                                                         |
| Token refresh                      | `/token`                       | IP           | 1800/hour, burst 30, **not customizable**                                                                                                        |
| Anonymous sign-ins                 | `/signup`                      | IP           | 30/hour, burst 30 — applies only when the body carries no email or phone                                                                         |

**GoTrue defaults** ([`configuration.go:423-433`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/conf/configuration.go#L423-L433)):
`RateLimitEmailSent` 30/hr (**global, not per-IP**, and **skipped entirely when autoconfirm is on**),
`RateLimitVerify` 30, `RateLimitTokenRefresh` 150, `RateLimitAnonymousUsers` 30, `RateLimitOtp` 30. There
is no `RateLimitSignUps` — `/signup`, `/recover`, `/resend`, `/otp`, `/magiclink` and `PUT /user` all draw
on the `RateLimitOtp` bucket (per 5 min, burst 30, per IP). Per-user cooldown is `SMTP.MaxFrequency`
(`config.toml`: `auth.email.max_frequency`, default `1m`); `Mailer.OtpExp` defaults to 86400 s when unset
and governs **all** email links — confirmation, recovery, email change and invite alike.

Per route:

- **(a)** No GoTrue mail is sent at signup, so no GoTrue limit applies to it. Our self-sent verification
  mail would run on AWS SES with **no rate limit of any kind** unless we build one; `useAuthThrottle()`
  does not constrain a determined caller. This is the largest new abuse surface of route (a), pointed at
  the same SES sender identity whose deliverability the project protects.
- **(b)** Adds the anonymous-sign-in bucket (30/hr per IP) _and_ still consumes the email-send budget,
  because the docs state that limit applies to `/user` when it updates the email address — so the
  `updateUser({ email })` call costs the same as a signup confirmation would. CAPTCHA/Turnstile is
  recommended and absent.
- **(c)** Governed by the OTP buckets: 30/hour project-wide plus a 60 s per-user window. Otherwise as
  today.

Mail volume, alongside the map's out-of-scope deliverability item: route (a) sends _fewer_ GoTrue mails
(none at signup) but relocates them to our own sender; route (b) sends the same volume, from the
`email_change` template rather than `confirmation`.

## 7. Not established from a primary source

Stated plainly, so nothing here is mistaken for fact:

- **Whether Supabase hosted exposes `MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS` at all.** Its absence from
  the dashboard docs, the self-hosting env-var page and the CLI config schema is established; that the
  hosted control plane rejects it is inferred. Since it only affects the OAuth path, this changes no
  conclusion.
- **Whether Supabase hosted runs the same code paths.** All source claims are against
  `supabase/auth@67c55c0`; hosted GoTrue versions are not published per project. No claim here was tested
  against a live instance.
- **Whether anonymous users count toward MAU billing.** The
  [MAU page](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users) never
  mentions them, and the anonymous guide frames abuse cost purely as database size. Suggestive, not
  documented.
- **The exact `auth.users` row shape for a fresh anonymous user.** No doc states that `email` is null; it
  is strongly implied by `updateUser({ email })` running the _email-change_ flow, but not stated.
- **How long an abandoned `email_change` persists, and whether a second `updateUser({ email })` to a
  different address cleanly replaces the first.** Not traced. Directly relevant to route (b) if the user
  mistypes their address.
- **Whether a Custom Access Token Auth Hook can be used freely here.** The mechanism exists and can
  rewrite claims (§5), but the claim allowlist, failure modes and hosted availability were not verified.
  Worth checking before route (a) is costed.
- **`email_confirmed_at` for an OTP-created user before verification.** Only inferable from the generic
  "if null, not confirmed" definition plus the `session: null` response; the docs never state it for the
  OTP path. Source strongly implies null, since `MagicLink` delegates to `Signup`.

Two documentation defects found in passing, recorded so nobody re-derives them:
the self-hosting page's description of `GOTRUE_MAILER_AUTOCONFIRM` is inverted (§1), and the
anonymous-user password constraint is present in the JS/Python doc tabs but silently absent from the
Flutter/Swift/Kotlin tabs (§3b).

## Sources

**GoTrue source** (all pinned to [`supabase/auth@67c55c0`](https://github.com/supabase/auth/tree/67c55c00789d69505881e3143dc248a2a1d2ab55)):

- [`internal/api/signup.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/signup.go) — autoconfirm branch, session gate, enumeration protection
- [`internal/api/token.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/token.go) — password-grant confirmation check
- [`internal/api/user.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/user.go) — anonymous password rule, `app_metadata` admin gate, email-change branch
- [`internal/api/verify.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/verify.go) — `signupVerify`, `recoverVerify`, `emailChangeVerify`, `is_anonymous` flip
- [`internal/api/resend.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/resend.go) — resend short-circuits
- [`internal/api/recover.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/recover.go) — no confirmation requirement
- [`internal/api/magic_link.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/magic_link.go) — OTP signup delegates to `Signup`
- [`internal/api/anonymous.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/anonymous.go) — unconditional token issue
- [`internal/api/external.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/external.go) — sole use of `AllowUnverifiedEmailSignIns`
- [`internal/api/mail.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/api/mail.go) — `sendConfirmation`, email rate limiter, autoconfirm bypass
- [`internal/models/user.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/models/user.go) — `Confirm`, `IsConfirmed`, `ConfirmEmailChange`
- [`internal/conf/configuration.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/conf/configuration.go) — `MailerConfiguration`, rate limits, validation
- [`internal/tokens/service.go`](https://github.com/supabase/auth/blob/67c55c00789d69505881e3143dc248a2a1d2ab55/internal/tokens/service.go) — `AccessTokenClaims`, `IDTokenClaims`, custom-claims hook

**Supabase issue tracker:**

- [Discussion #22363](https://github.com/orgs/supabase/discussions/22363) — request to extend `AllowUnverifiedEmailSignIns` to the email provider
- [PR supabase/auth#1661](https://github.com/supabase/auth/pull/1661) — _"set `email_confirmed_at` to null when autoconfirm is on"_, open and unmerged

**Supabase documentation** (checked 2026-07-27):

- [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous) ·
  [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) ·
  [Users](https://supabase.com/docs/guides/auth/users) ·
  [Identities](https://supabase.com/docs/guides/auth/identities)
- [Password-based auth](https://supabase.com/docs/guides/auth/passwords) (the former `auth-email` guide now
  redirects here) · [Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) ·
  [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- JS reference: [`signUp`](https://supabase.com/docs/reference/javascript/auth-signup) ·
  [`resend`](https://supabase.com/docs/reference/javascript/auth-resend) ·
  [`verifyOtp`](https://supabase.com/docs/reference/javascript/auth-verifyotp) ·
  [`resetPasswordForEmail`](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) ·
  [`updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser) ·
  [`signInAnonymously`](https://supabase.com/docs/reference/javascript/auth-signinanonymously)
- [CLI config reference](https://supabase.com/docs/guides/local-development/cli/config) ·
  [Self-hosting auth config](https://supabase.com/docs/guides/self-hosting/auth/config) ·
  [Database advisor lint 0012](https://supabase.com/docs/guides/database/database-advisors?lint=0012_auth_allow_anonymous_sign_ins)

**Selftend codebase** (2026-07-27): `supabase/config.toml`, `supabase/templates/`,
`src/lib/supabase.ts`, `src/components/app/protected-layout.tsx`,
`src/components/app/verify-email-form.tsx`, `src/features/auth/`,
`supabase/functions/_shared/ses.ts`, `supabase/migrations/`.
