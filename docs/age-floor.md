# Age Floor

The minimum age for using Selftend, per country.

> [!IMPORTANT]
> **This table is the eligibility rule, in the app and in the published text.**
> [#1767](https://github.com/Selftend/selftend/issues/1767) rewrote privacy §11,
> terms §2 and the FAQ around it in `en` and `bg`, bumped `policyVersion` to
> `2026-09-04-teen-floor`, and removed the age assertion from the consent
> checkbox. The 18-and-over posture is gone from every surface this repository
> controls.

> [!WARNING]
> **One surface still says 18 and over, and it is not in this repository.** The
> Google Play target-audience declaration reads "18 and over" (last edited
> 2026-05-08) and moves to 13-15 / 16-17 in the owner's rollout pass,
> [#1771](https://github.com/Selftend/selftend/issues/1771) — same day as the
> release that publishes this text, per §7's fixed order: owner legal review,
> then release and publish together, then the Play Console pass. Until that day
> the store record and the app disagree, which is why the order is not a
> preference. `store/play-listing.md` and `docs/app-store-review-information.md`
> reproduce live store values and are updated by that pass, not by this file.

Source: **[Spec: teen access (13+ per-country age floor)](https://github.com/Selftend/selftend/issues/227) §2**, the settled
destination of wayfinder map [#216](https://github.com/Selftend/selftend/issues/216). This file is the durable copy — the
values were previously reviewable only inside an issue body.

Implemented in `src/features/auth/age-floor.ts`.

## The table

| Floor  | Countries                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **13** | United States, United Kingdom, Belgium, Denmark, Estonia, Finland, Latvia, Malta, Portugal, Sweden, Norway, Iceland — **and every jurisdiction not named below** |
| **14** | Austria, Bulgaria, Cyprus, Italy, Lithuania, Spain                                                                                                               |
| **15** | Czechia, France, Greece, Slovenia                                                                                                                                |
| **16** | Croatia, Germany, Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia, Liechtenstein                                                            |

Never below 13, anywhere.

## Why the floor varies

The floor is set by **GDPR Art. 9(2)(a) explicit consent, not by contract.**

Thought records, mood entries and journal text are special-category health
data. The age that matters is therefore the age at which a person may consent
to _that processing_ on their own behalf — which member states set individually
under Art. 8, between 13 and 16. Where a country sets it higher, Selftend's
floor rises to match.

There is **no parental-consent path and no age verification.** Where the law
would require one, the floor rises instead. That is a deliberate scope
decision: parental-consent infrastructure is a different product with different
risks, and Selftend does not build it.

The Recital 38 counselling carve-out is a fallback defence only. It is never
load-bearing, and no row in the table depends on it.

## Why 13-floor countries are listed individually

Thirteen is also the catch-all, so those rows look redundant. They are not.

An entry means the value was **decided and sourced** for that jurisdiction. The
catch-all means **nobody has looked yet.** The legal review needs to tell those
two apart, and so does anyone extending the table later.

## Where each row came from

Every row now has a provenance record in
[age-floor-statute-checks.md](age-floor-statute-checks.md), and
`test/age-floor-provenance.test.ts` holds the two together: a country in the
table above with no row there, or a row whose stated floor has drifted from the
code, fails `verify`.

The rows that were only ever established from secondary summaries — the research
marks them **`(C)`** — were read against the national statute on 2026-09-04 for
[#1763](https://github.com/Selftend/selftend/issues/1763). Twenty of twenty-two
confirmed.

> [!CAUTION]
> **Denmark is the exception, and this table has not been changed.** The Danish
> age of digital consent has been **15** since 1 January 2024, and the table
> above still says 13. A primary source contradicting the table is **raised, not
> silently applied** — the table is a settled decision of map #216, and revising
> it is the owner's call with counsel. That decision is
> [#1921](https://github.com/Selftend/selftend/issues/1921), and it is cheaper
> before the §7 release than after it.

**Hungary is unverified**, not confirmed: the official consolidated repository
could not be reached. It carries 16, which is the GDPR's own default and the
highest floor here, so the exposure is over-protection rather than under —
recorded in the checks document as an open question for counsel.

The 2026-07-24 research behind the original table is not merged: it lives at
`docs/research/2026-07-24-gdpr-consent-ages.md` on branch
`research/gdpr-consent-ages`, so reading it means checking that branch out. Its
own claim that no country other than Slovenia had changed its age is what Denmark
falsified.

## Behaviour worth knowing

- **Country codes are ISO 3166-1 alpha-2**, read case-insensitively. The United
  Kingdom is `GB`.
- **An unknown or malformed country takes the catch-all**, rather than throwing.
  A gate that crashes on an unrecognised code fails open, which is the one
  outcome worth ruling out.
- **The check fails closed.** An impossible date, a birth in the future, or an
  unusable clock reading all return "does not meet the floor".
- **29 February births qualify on 1 March** in non-leap years — the later of the
  two possible readings, which is the conservative one for a protective floor.
- **The date of birth is compared and dropped.** The module returns a boolean
  and never echoes the date back, which is what lets the caller honour §227 §3's
  "DOB is discarded" without holding anything in reserve.

## The gate that asks

Built in [#1764](https://github.com/Selftend/selftend/issues/1764):
`src/components/app/age-gate.tsx`, decided by
`src/features/auth/age-attestation.ts`, offered the world by
`src/features/auth/countries.ts`.

**It runs in the shared gate slot in `ProtectedLayout`, above the consent
gate.** That position is a deliberate correction to §3, which predates two of
the app's entry paths. There are now **four** — email/password, Google, Apple,
and the silent guest from `signInAnonymously`, which is the primary one. One
gate in the shared slot covers all four; per-flow plumbing would have missed
guests, and guests write thought records, which are exactly the Art. 9 data the
floor exists to protect. Confirmed by the owner 2026-09-03.

**Who is asked, and who is never asked again:**

- A brand-new account — one that has not been through the consent gate, so
  `policy_version_accepted` is `null`. Guests included.
- **Not** an account that predates the gate. `age_floor_met` is `null` for every
  existing account and `null` means _never asked_, so null alone cannot be the
  trigger: gating on it would ask the entire install base. §7 is explicit that
  existing users meet the one-time consent prompt **without** being re-asked for
  age or country, and the policy-version clause is what delivers that.
- The verdict is read as `=== true`, never as a truthiness check. Three states,
  and `null` is not `false`.

**What the screen does and does not say.** Date of birth is three empty fields —
day, month, year — rather than a calendar, because a picker has to open on some
month and that is a default year §3 rules out. Country is type-to-find over all
250 codes. Nothing before or during the questions names an age, a range, or a
qualifying answer; `age-gate.test.tsx` asserts that against the strings in both
locales, and fires the same predicate on deliberately bad copy so the absence
assertions cannot go quiet.

**A typo is not an exit.** `meetsAgeFloor` collapses "too young" and "that date
is nonsense" into one `false` so that a careless caller still fails closed — but
the gate checks the calendar first and shows a correctable field error, because
the under-floor path deletes an account and a mistyped birthday must never reach
it.

**A failure writes nothing at all** — not even `age_floor_met = false`. Only a
pass is persisted, through `recordAgeAttestation`, which takes a country and a
verdict and has no parameter a date of birth could travel in.

### The one known gap in the gate as it stands

Recorded rather than hidden, and it closes on the release sequencing rather
than on a ticket:

- **The gate fails open on a preferences error with nothing cached.** In that
  state the attestation is unknown, and the person reaches the shell until a
  fetch succeeds. Failing closed would block every user whose first fetch of a
  cold start failed — nothing in that state tells a new guest from a
  ten-month user. The consent gate makes the identical call for the identical
  reason ([#164](https://github.com/Selftend/selftend/issues/164)), so the age
  gate is no weaker than the legal gate beside it, but the window is real and
  belongs in the legal review's view of §3.

The second gap recorded here — _"the under-floor block is React state only"_ —
is closed by [#1765](https://github.com/Selftend/selftend/issues/1765), below.

## What happens below the floor

Built in [#1765](https://github.com/Selftend/selftend/issues/1765):
`src/components/app/under-floor-screen.tsx`, driven by
`src/features/auth/use-under-floor-exit.ts` over
`src/features/auth/under-floor-block.ts`.

**The account is deleted, and the capability that deletes it already existed.**
The gate runs after the session exists on three of the four entry paths — guest,
Google, Apple — so an auth user has been created by the time the verdict is
known. §3 describes this as an OAuth-specific deletion; it is not, and the
silent guest is what makes it the common case. It goes through
`delete_user_account()`, which is `security definer`, runs as the function
owner, and delegates to `purge_user_account(uuid)` — revoked from `public`,
`anon` **and** `authenticated`, so only the owner and `service_role` can call
it (`20260826000000_account_purge_helper.sql`). The client holds no
service-role key and cannot name a target: the RPC derives one from
`auth.uid()`, so the only account it can erase is the caller's own. An edge
function was **not** added — it would be a second definition of what deletion
removes, which that migration warns against in its own words.

**The device flag is written before the deletion is asked for**, and the order
is the guarantee. A crash, a kill or a dead network between the two leaves a
blocked device with a live empty account, which is recoverable: the next launch
lands back on the exit screen and retries. The reverse order would leave a
deleted account with no flag — a person walking straight back into the gate.

That recovery has one edge, and it is worth naming rather than implying it away.
The retry needs the token, so if the session is lost before a failed deletion
ever succeeds, the account is stranded — empty, but stranded. There is no
server-side sweep that closes this in general: the guest dormancy job
(`20260826010000_guest_dormancy_cleanup.sql`) only touches
`auth.users.is_anonymous` rows and only after twelve months, so it eventually
collects a stranded **guest** and never collects a stranded Google, Apple or
email account. Nothing personal is in either — the gate writes nothing on a
failing verdict — so this is an orphaned empty row rather than retained data,
and it is recorded here rather than presented as impossible.

**A failed deletion does not sign out.** `delete_user_account()` reads
`auth.uid()`, so the token is the only thing that can finish the job. The exit
screen says so plainly rather than claiming an erasure that did not happen, and
offers to run it again — the _account_, never the answers. A failed sign-out
after a successful purge is the opposite case: it is reported, not surfaced,
because a token naming a user row that no longer exists authenticates nothing.

**The flag holds one expiry timestamp and nothing else** — no date of birth, no
country, no age, no user id. It expires 24 hours after **the verdict**, because
a permanent device flag would be a ban on a phone rather than a block on a
person, it would outlive the household that owns the device, and a reinstall
would defeat it anyway. It fails open: an unreadable store answers "not
blocked", so a storage fault can never strand a device with no way to get a
session.

⚠️ **From the verdict, not from every launch** — and that took a deliberate
line of code. Writing the flag restarts the window, and the exit hook mounts on
every launch inside it, so an unconditional write would roll the block forward
indefinitely for anyone who opens the app daily. That is a ban on a device
rather than a speed bump, and punitive in the way AGENTS.md rules out, so the
write is skipped when the window is already running.

**Nothing lifts the block but time.** `clearUnderFloorBlock` is deliberately not
exported — its only caller is the expiry branch inside the module — because an
exported clear is an invitation to lift the block from a screen, which is the
hole the flag exists to close. The module's export surface is asserted, so the
property cannot be quietly re-exported.

**Three places consult it**, and each answers a different way back in:

- `ProtectedLayout`, **above** the `!session` branch. The exit signs the person
  out, so a block checked below that branch would answer its own success with
  the auth landing. It also suppresses the web signed-out redirect, which would
  otherwise bounce the person to the marketing landing the instant the erasure
  succeeded.

  ☠️ On that redirect the **React state does the work, not the flag**, and the
  condition carries both for that reason. `useUnderFloorBlock` reads storage
  once on mount, and the exit writes the flag after that read — so for the whole
  of the verdict's own mount `blocked` is still `false`. On web that mount _is_
  the normal path: every under-floor person there has a session, because the
  `!session` branch precedes the gate. A guard written on the flag alone reads
  as correct and does nothing.

- `SessionProvider`, which does not mint a guest for a blocked device. The
  block holds without this, but every launch inside the window would otherwise
  create an anonymous user purely so the exit screen could delete it again.
- Nothing else. In particular the **public marketing landing is not blocked**:
  the flag prevents entry, not reading, and blocking a public page would be
  over-reach. A web visitor inside the window can therefore sign up again — and
  meets the gate again, and is deleted again. The floor holds; only the speed
  bump is thinner there, and that is a deliberate line rather than an oversight.

**The exit screen links `/crisis` and Find A Helpline**, and both work without
an account, because this person is about to not have one: `/crisis` is a root
route, a sibling of the `(app)` group rather than a screen inside it, and Find A
Helpline is a plain external URL read from `crisisActionUrls` — the same table
`app/crisis.tsx` renders, so the URL has one home.

**The copy is calm and non-shaming, and that is tested as a property of the
strings**, in both locales, with the predicate fired on deliberately bad copy so
the absence assertions cannot go quiet. It covers the whole `underFloor` block,
which is why the erasure retry is worded about the account ("Remove it now") and
never about having another go at the questions.

## The explicit consent that sits beside it

Built in [#1766](https://github.com/Selftend/selftend/issues/1766):
`src/components/app/consent-gate.tsx`, recorded through
`recordPolicyConsent` into `user_preferences.health_data_consent_at`
(`supabase/migrations/20260906000000_health_data_consent.sql`).

The floor exists because the age that matters is the age at which a person may
consent to Art. 9 processing on their own behalf. That argument only holds if
the consent is actually asked for — so the gate asks it, of **everyone**,
whatever age they gave.

**It was already in the app, and being in the app was not the same as being
given.** The consent gate had one checkbox carrying three things at once: an age
assertion, agreement to the terms and privacy policy, and consent to processing
the entries. Art. 9(2)(a) asks for an act that is explicit — separately worded
and separately performed — and a single tick cannot be that, however carefully
the sentence is written. So the control split in two: the contractual acceptance
above, and the Art. 9 consent below it under its own heading, unticked, with the
withdrawal path stated next to it rather than left in a policy the person would
have to go and find.

**Both are required to leave the gate.** `disabled={!accepted ||
!healthDataConsent || …}`, restated inside the submit handler so the invariant
lives where the write is. `consent-gate.test.tsx` fails if the two are ever
folded back into one boolean, which is the shape a later tidy-up would naturally
restore.

**The record is its own column, and it is never inferred.**
`health_data_consent_at` is NULL until the act is performed, and no migration
backfills it from `privacy_policy_accepted_at` — every existing row ticked the
old bundled checkbox, and the whole reason for the column is that a bundled tick
is not what Art. 9(2)(a) asks for. It is written in the same upsert as the
contractual acceptance and with the same timestamp (one submit, one moment), and
it is carried in `export_user_data`, so a person can see their own consent and
when they gave it.

**Existing users meet it once, and are never asked their age.** Nothing in
[#1766](https://github.com/Selftend/selftend/issues/1766) bumps `policyVersion`
— [#1767](https://github.com/Selftend/selftend/issues/1767) does, as part of the
policy rewrite, and that bump is what re-gates every account through this same
consent slot. The age gate above it is scoped to accounts that have never
accepted a policy version, so an existing account passes straight through it to
the consent step. That is §7's "no age or country re-ask", and it falls out of
the ordering rather than needing a rule of its own.

⚠️ **The copy lives in the `settings` namespace, not `auth`.** §6's inventory
lists the consent step under "`auth` namespace — new keys", written when the
step was expected to be part of the age-gate flow. It landed in the consent
gate instead, whose existing copy (`consent.title`, `consent.checkbox`, and the
rest) has always been in `settings` — splitting one screen's strings across two
namespaces to satisfy the inventory would cost more than it bought. Recorded
here because it is a documented divergence, not because it is in doubt.

✅ **The contractual checkbox no longer asserts an age.** It read _"I am 18 or
older and agree to the current Privacy Policy and Terms of Service"_ until
[#1767](https://github.com/Selftend/selftend/issues/1767) and now reads _"I
agree to the current Privacy Policy and Terms of Service."_ The age question is
asked properly one screen earlier, and terms §2 carries the representation, so a
second and weaker claim on the tick box would only train people to tick through
something already answered. #1766 deliberately left it alone because published
eligibility copy moves with the terms; that is what #1767 did.

## The assessment behind the floor

[dpia-minors-assessment.md](dpia-minors-assessment.md) is the combined DPIA and
Connecticut/Colorado minors' assessment
([#1768](https://github.com/Selftend/selftend/issues/1768), spec §4). It
describes this flow end to end for a reader who has not seen the code, carries
the risk register — including the two gaps this file records, as R7 and R8 — and
is where the no-minor-flag decision is argued rather than merely stated.

## The content behind the floor

Admitting thirteen-year-olds is a copy question as well as a legal one, and
[child-safety-review.md](child-safety-review.md) is the record of that pass
([#1770](https://github.com/Selftend/selftend/issues/1770), spec §4): every module against §4's
five-row checklist, what was fixed, what was raised, and — the half a review usually loses —
what was deliberately **accepted**, with the reasoning. `test/child-safety-copy.test.ts` holds
the rules it established as a merge gate.

## Where the table is published

Privacy policy §11 (_Minimum age_) lists it floor by floor, in `en` and `bg`,
and terms §2 carries the catch-all clause — _"or the higher minimum age at which
you may consent to the processing of your personal data in your country"_ —
which is what makes the terms true in the ~200 countries the table never names.

`src/features/policies/policy-age-floor.test.ts` compares the published lists
against `FLOOR_BY_COUNTRY` country by country, in both locales, using the same
names the age gate's own selector shows. A country moved in one and not the
other fails `verify`. That is the reason `FLOOR_BY_COUNTRY` is exported at all:
a published list retyped by hand drifts silently, and it drifts in the direction
that admits someone the floor exists to hold back.
