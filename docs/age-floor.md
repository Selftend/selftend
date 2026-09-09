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

⚠️ **One row deliberately no longer matches §2.** Denmark is 15 here and 13
there, because the spec inherited a figure from a mapping that predated the
Danish amendment. The statute won, by the owner's decision on
[#1921](https://github.com/Selftend/selftend/issues/1921) — so where this table
and §2 disagree about Denmark, **this table is right**. Every row's source and
the date it was last read are in
[age-floor-statute-checks.md](age-floor-statute-checks.md).

Implemented in `src/features/auth/age-floor.ts`.

## The table

| Floor  | Countries                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **13** | United States, United Kingdom, Belgium, Estonia, Finland, Latvia, Malta, Portugal, Sweden, Norway, Iceland — **and every jurisdiction not named below** |
| **14** | Austria, Bulgaria, Cyprus, Italy, Lithuania, Spain                                                                                                      |
| **15** | Czechia, Denmark, France, Greece, Slovenia                                                                                                              |
| **16** | Croatia, Germany, Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia, Liechtenstein                                                   |

Never below 13, anywhere.

## Why the floor varies

The floor is set by **GDPR Art. 9(2)(a) explicit consent, not by contract.**

Thought records, mood entries and journal text are special-category health
data. The age that matters is therefore the age at which a person may consent
to _that processing_ on their own behalf — which member states set individually
under Art. 8, between 13 and 16. Where a country sets it higher, Selftend's
floor rises to match. ☠️ Denmark is the row that proves the rule needs
checking rather than assuming: it moved to 15 in 2024 and this table said 13
until [#1921](https://github.com/Selftend/selftend/issues/1921). See § _Where
each row came from_.

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

⚠️ **Sourced is not the same as still true.** Denmark was an entry, sourced to a
named section of the right act, and the number was wrong anyway because the act
moved after the mapping was written. What an entry now carries is a row in
[age-floor-statute-checks.md](age-floor-statute-checks.md) saying where it came
from and when it was last read — which is the part that can go stale, and the
part the annual check re-reads.

## Where each row came from

Every row now has a provenance record in
[age-floor-statute-checks.md](age-floor-statute-checks.md), and
`test/age-floor-provenance.test.ts` holds the two together: a country in the
table above with no row there, or a row whose stated floor has drifted from the
code, fails `verify`.

The twenty-one rows that were only ever established from secondary summaries —
the research marks them **`(C)`** — were read against the national statute on
2026-09-04 for [#1763](https://github.com/Selftend/selftend/issues/1763), and
Spain was read with them because its own "primary" mark rested on a law firm's
summary. Twenty of those twenty-two confirmed on the spot.

> [!IMPORTANT]
> **Denmark was the exception, and the table above has been changed.** Its age
> of digital consent has been **15** since 1 January 2024 while this table said 13. A primary source contradicting the table is **raised, not silently
> applied** — so it went to the owner as
> [#1921](https://github.com/Selftend/selftend/issues/1921), the decision was to
> follow the statute, and Denmark now sits at 15 here, in `FLOOR_BY_COUNTRY`, and
> in the published policy text in both languages. ⚠️ Counsel has still not seen
> it: the §5 review ([#1771](https://github.com/Selftend/selftend/issues/1771))
> comes before publication, and this correction reaches `dev` ahead of it.

**Hungary is unverified**, not confirmed: the official consolidated repository
could not be reached. It carries 16, which is the GDPR's own default and the
highest floor here, so the exposure is over-protection rather than under —
recorded in the checks document as an open question for counsel.

⚠️ **That is a live exception to the rule, not a repeal of it.** Spec §2 is that
a row is checked against a primary source **before it governs anyone's access**,
and Hungary's row governs access today without having been. With Denmark
corrected, it is the one row that reaches the §5 legal review unfinished, and it
is on [#1771](https://github.com/Selftend/selftend/issues/1771). Not a reason to
relax the rule for the next row.

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

☠️ **On native this is the first screen of a clean install, and it stays there.**
Decided on [#1936](https://github.com/Selftend/selftend/issues/1936) (2026-09-05)
and recorded here rather than only on the ticket, because the finding re-files
itself: a later reader meets a date-of-birth form on a fresh install and reads it
as a defect. The chain is real — a native cold start with no stored session mints
a guest silently (`src/providers/session-provider.tsx`), `app/index.tsx`
redirects straight into `(app)`, and nothing precedes the shared gate slot — but
**the store listing is native's landing.** The app is distributed only through the
App Store and Play, the latest release carries no assets and no sideload path is
documented, and `docs/positioning.md` § _Which surfaces carry it_ lists **both
store listings** among the pre-threshold surfaces that carry the frame sentence.
So a native arrival has read what Selftend is, on the page they installed from;
the web landing is the same read on the web, not something native lacks. And
**the gate is post-threshold on both platforms**: positioning keys the threshold
on _the deliberate act of entry_, on the surface and never on the reader, and
opening the installed app is that act exactly as _Start now_ is on web. A
post-threshold surface is free not to declare the category, so the gate owes no
frame sentence and no orientation line — while any screen placed in front of it
would become a **new pre-threshold surface that does owe one**, which is why none
was added rather than one being designed. ⚠️ **The placement is revisited on
evidence, not on instinct:** the hand-run analytics carry an _"asked, never
attested"_ figure ([#1978](https://github.com/Selftend/selftend/issues/1978)) —
accounts that met this gate and never got past it — and it reopens if that share
is large against the guests minted in the same window, with the number the
owner's to set once a real cohort exists. Testers arriving through TestFlight or
an internal Play track read no listing and are out of scope. Nothing in the gate,
its ordering, its tests or its copy changed.

**Who is asked, and who is never asked again:**

- **Asked: any account that has not already answered** — `age_floor_met` is not
  `true`. Guests included. The verdict is read as `=== true`, never as a
  truthiness check: the column has three states, and `null` means _never asked_,
  which is not `false`.
- **Never asked again: an account that predates the gate _and_ has already been
  through the consent gate.** Both halves, ANDed — created before
  `2026-09-05T00:00:00.000Z`, **and** `policy_version_accepted` is not `null`.
  §7 is explicit that existing users meet the one-time consent prompt **without**
  being re-asked for age or country, and this is the clause that delivers it.
- **An account that predates the gate but has never accepted a policy version is
  still asked.** It has been through neither gate, so it is not who the exemption
  was written for — and that is also what keeps the rule a superset of who was
  asked before it changed: nobody who would have been asked stops being asked.
- `age_floor_met` being `null` is not on its own a reason to ask, and never was.
  It is `null` for the entire pre-gate install base, so gating on it would ask
  everyone.

☠️ **The exemption is read off the account's own creation time, never off
`policy_version_accepted` alone** —
[#2227](https://github.com/Selftend/selftend/issues/2227). That clause used to be
the whole test, on the reasoning that an account with no policy version on record
has not been through the consent gate and must therefore be brand new. A client
already in the field can produce it: shipped 0.17.0 carries the consent wall and
**no age gate at all**, so an account created on it fills that column in, and on
updating to a build with the gate reads as an exempt pre-gate account. Nothing
ever writes the column back to `null`, so the exemption could never lift — a
one-release concession became a permanent bypass that kept recruiting members for
as long as anyone had not updated. "Has accepted a policy" and "has answered the
age question" are different facts, and only the second is what the gate is scoped
on.

⚠️ **The cutoff is the migration instant, not the release date, and the
difference is deliberate.** `AGE_GATE_INTRODUCED_AT` in
`src/components/app/protected-layout.tsx` is `2026-09-05T00:00:00.000Z`, the
version of `supabase/migrations/20260905000000_age_attestation.sql`. The release
that ships the gate comes later, and its date is not knowable from a client. So
**every account created on or after 2026-09-05 is asked for a birth year and a
country the first time it opens a build carrying the gate** — including accounts
created on 0.17.0 in the days between the migration and the release. That cohort
is precisely the one the old test exempted for good, so asking them is the point
rather than a side effect, and **if the release slips the cohort grows**. Erring
early costs a person one birth year and one country; erring late admits somebody
below their country's floor with no attestation on file, which is the harm the
gate exists to prevent.

⚠️ **An absent or unparseable `created_at` counts as _not_ predating**, so the
account is asked. The field is required on Supabase's `User` and is present on
any real session, so this is a fallback rather than a path; it points towards
asking for the same reason.

⚠️ **The gate is client-side, and the column behind it is not a constraint.**
`ProtectedLayout` decides who is asked. `age_floor_met` is a plain nullable
boolean on `user_preferences` — no default, no check constraint, and nothing
server-side that refuses a write from an account which never attested.
Row-Level Security scopes the row to its owner and knows nothing about the floor.
A build without the gate does not apply it, which is what made the 0.17.0 cohort
possible at all. The floor is an attestation enforced by the app the person is
running; deletion on knowledge ([operations-runbook.md](operations-runbook.md))
is the only backstop behind it, and neither of them is age verification.

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

⚠️ That check catches only the _calendrical_ typo. A plausible-but-wrong year is
a real past date and passes it, which is why the deletion below is confirmed
rather than automatic
([#2193](https://github.com/Selftend/selftend/issues/2193)): the second net is
on the destructive step, not on the field.

**A failure writes nothing at all** — not even `age_floor_met = false`. Only a
pass is persisted, through `recordAgeAttestation`, which takes a country and a
verdict and has no parameter a date of birth could travel in.

### An unknown verdict fails closed, in all three of its states

This section used to record a gap: **the gate fell open when the attestation
could not be read.** The verdict lives on the `user_preferences` row, and with no
row in hand the answer — like the policy acceptance beside it — is unknown, yet
the shell rendered anyway. A person below their floor reached the whole app
un-attested and could write thought records and journal entries, which are Art. 9
special-category data. It was deliberate and documented, which is precisely what
made it worth closing rather than inheriting: a fail-open on a statutory gate
should not survive on the strength of a comment.

**Unknown turned out to have three states, and all three are now closed.**
`ProtectedLayout` computes `prefsUnknown` as
`!preferences && (prefsError || prefsLoading || prefsReadAbandoned)` and returns
`src/components/app/preferences-unavailable-screen.tsx` on it instead of falling
through to the app. Nothing below renders: not the shell, not the age gate, not
the consent gate.

- **Errored, with nothing cached** — closed by
  [#2200](https://github.com/Selftend/selftend/issues/2200).
- **Still in flight** — closed by
  [#2229](https://github.com/Selftend/selftend/issues/2229). #2200's test was
  `prefsError && !preferences`, so a request still on the wire carried no error,
  took no early return, and switched off all three gates below through their
  shared `!prefsLoading` conjunct. The full app shell was the fall-through on
  every brand-new account's first launch, for as long as the fetch took — and far
  longer on one that hangs, since the query retries once and passes no
  `AbortSignal`. To a legal gate, "we have not been told yet" and "we were told
  nothing" are the same state.
- **Paused after a failure** — the third state, and the one the 15 s read
  timeout below made reachable from an _online_ cold start. TanStack's
  `fetchStatus: "paused"` is neither loading (`isLoading` is
  `isPending && fetching`) nor errored (a data-less query has its `status` reset
  to pending and its `error` to null the moment a fetch dispatches), so the
  verdict read as **known** with the row unread. The age gate then died on its
  `Boolean(preferences)` conjunct while the consent gate survived — Art. 9
  consent put to somebody whose floor had never been established, which inverts
  the ordering the two gates depend on. Before the timeout a black-holed read
  simply hung and the in-flight half held the screen; now it rejects into the
  retryer, which sleeps a second and then parks the query if focus or the
  network went away in that window (a backgrounded app, a connection that
  dropped). The guard is `isPaused && failureCount > 0`.

**Keyed on `!preferences`, which is what keeps this from becoming a blocking
spinner on every cold start.** A cached or persisted row passes straight through,
and a background refetch failing over one never raises the screen.

**Why failing closed does not re-open [#164](https://github.com/Selftend/selftend/issues/164).**
What #164 forbade was showing a _gate_ on a transient error, because a gate
re-asks somebody who already answered, and nothing in the unknown state tells a
new guest from a ten-month user. The screen that renders now is not a gate: it
asks nothing, records nothing, and its only control re-runs the fetch. An
already-attested user pays a tap; an un-attested one cannot walk past. The
consent gate is covered by the same return, so the two legal gates still make
one call rather than two.

**It is not a lockout, and that is load-bearing.** The errored half always offers
the retry, and TanStack's own retry / refocus refetch closes that state too, so
the person is never waiting on the button alone. The in-flight half offers no
retry on purpose — the fetch it would re-run is already running — and clears when
the row arrives or when the request fails into the other half. Which half is
shown is decided by a **sticky** failure signal (the query's `errorUpdateCount`),
never by the live error flag alone
([#2238](https://github.com/Selftend/selftend/issues/2238)): on a query with no
data, TanStack clears the error and resets the status to pending the instant a
refetch starts, so keying off the live flag rendered the in-flight half — and
took the only control away — at the moment Retry was pressed, and a retried
request that hung left a spinner with nothing to press. Once one read has
failed, the errored half and its Retry stay through every later attempt. Only a
fetch that has never failed gets the in-flight half — including the paused state
above, where nothing is on the wire at all. That one carries no retry either,
because a retry cannot win it: the query resumes on its own the moment focus or
the network comes back, which is the same event a button press would be waiting
on.

☠️ **A second press cancels the running read explicitly, and `refetch()` alone
never did it** ([#2251](https://github.com/Selftend/selftend/issues/2251)). This
paragraph used to say `refetch()` cancels a running request before starting
another because `cancelRefetch` defaults to true. That is true only for a query
that HAS data: `Query#fetch` gates the cancel arm on
`state.data !== undefined`, and this screen's whole population is the
data-less one, so a second press returned the same pending promise and did
nothing — `onFocus` / `onOnline` dedupe the same way, so a recovered connection
did not restart it either. Retry now runs `queryClient.cancelQueries` before the
refetch, and the cancellation reaches the socket because `getUserPreferences`
passes the query's `AbortSignal` through to PostgREST. It also **times out on
its own** after `PREFERENCES_READ_TIMEOUT_MS` (15 s): Android's OkHttp is built
with no timeouts at all and a browser `fetch` has none, so a black-holed request
never errors, and `retry: 1` retries a rejection rather than a hang.

☠️ **And that deadline reports itself.** The two abort causes used to share the
name `AbortError`, and `isReportableError` (`src/lib/sentry.ts`) drops every
error carrying it — so a 15 s ceiling that turned out to be too tight for a real
population (a slow mobile network, a cold connection pool, a corporate proxy)
would have failed on the launch path with no signal of any kind: no Sentry
event, no Play vital, no crash, and no way to correct the number afterwards. A
timeout now throws `PreferencesReadTimeoutError`, deliberately not named
`AbortError`, and reaches Sentry through the query cache's error reporter. A
cancellation the app itself asked for — the Retry, an unmount — still throws
`PreferencesReadAbortedError` and stays filtered, as does an ordinary offline
failure; nothing in the filter's rules changed.

**And it is never a dead end** ([#2228](https://github.com/Selftend/selftend/issues/2228)).
Both halves carry a support card of their own: the `/crisis` link and Find A
Helpline, kept visible and separate rather than folded into the error. This
screen replaces the entire protected tree, and on shipped 0.17.0 the same state
fell through into the app shell, from which crisis guidance was about two taps
away — so blocking here without it would make crisis guidance strictly harder to
reach than the build it replaces. A guest is the case that decides it: guests
have no sign-out, so with no link here they would have no route to crisis
guidance at all while the block holds. Both destinations work without a
preferences row and without an account — `/crisis` is a root route, a sibling of
the `(app)` group rather than a screen inside it, and Find A Helpline is a plain
external URL.

`protected-layout.test.tsx` pins the block on each half — the protected tree out
of reach when the verdict is unknown, and again while it is still on the wire —
plus the retry present and wired, and the three ways the guard could over-fire: a
stale-but-cached row still meets the consent gate, a cached row still passes
through while a refetch is in flight, and a signed-out person still gets the
landing. `preferences-unavailable-screen.test.tsx` pins the crisis card on both
halves and pins the retry to the errored one.

A person whose preferences load passes through exactly as before. An offline
_cold start_ is a different state again and is still untouched: with
`networkMode: "online"` a never-fetched query pauses rather than fetches, and
because it pauses **before it ever runs** its failure count is zero, so the
third state above does not claim it — the consent gate owns that case exactly as
it did before. That zero is the whole reason the guard asks for a failure count
rather than for `isPaused` alone: raising the block screen on an offline cold
start would put a spinner with no control in front of it, which is the blocking
spinner the `!preferences` key exists to avoid. Only a read that started, failed
and then stopped retrying counts as unknown, and it clears itself the moment
focus or connectivity returns.

The second gap recorded here — _"the under-floor block is React state only"_ —
is closed by [#1765](https://github.com/Selftend/selftend/issues/1765), below.

## What happens below the floor

Built in [#1765](https://github.com/Selftend/selftend/issues/1765):
`src/components/app/under-floor-screen.tsx`, driven by
`src/features/auth/use-under-floor-exit.ts` over
`src/features/auth/under-floor-block.ts`.

**The account is deleted, and the capability that deletes it already existed.**
The gate runs after the session exists on **all four** entry paths — guest,
Google, Apple and email/password — so an auth user has been created by the time
the verdict is known, whichever way in was used. The gate mounts below
`ProtectedLayout`'s `if (!session)` branch, so it cannot be reached without a
session, and password sign-up yields one immediately because email confirmation
is off (`enable_confirmations = false`, mirroring `mailer_autoconfirm=true` on
the hosted projects). §3 describes this as an OAuth-specific deletion; it is
not, and the silent guest is what makes it the common case. It goes through
`delete_user_account()`, which is `security definer`, runs as the function
owner, and delegates to `purge_user_account(uuid)` — revoked from `public`,
`anon` **and** `authenticated`, so only the owner and `service_role` can call
it (`20260826000000_account_purge_helper.sql`). The client holds no
service-role key and cannot name a target: the RPC derives one from
`auth.uid()`, so the only account it can erase is the caller's own. An edge
function was **not** added — it would be a second definition of what deletion
removes, which that migration warns against in its own words.

**The deletion is confirmed, never automatic**
([#2193](https://github.com/Selftend/selftend/issues/2193)). It used to run from
a mount effect: one press of the age gate's submit button both produced the
verdict and executed the purge. That press cannot carry consent to a deletion,
because the gate is deliberately COPPA-neutral — it names no age, no range and
no qualifying answer, so nobody pressing it can know it is destructive — and a
mistyped birth year is a real civil date, so it falls straight through the
calendar check into that path. The exit screen now states that the removal is
permanent and offers it as a separate, named control; nothing is deleted until
that control is pressed.

☠️ **And the sentence above that control names the account, never the device**
([#2252](https://github.com/Selftend/selftend/issues/2252)). All four erasure
states — the confirmation, the in-progress line, the confirmation of removal and
the failure — opened _"The account this device created"_ / _"Профилът, създаден
от това устройство"_, written when only a brand-new device-local guest could
reach the screen. Since #2227 the gate reaches any account created at or after
`AGE_GATE_INTRODUCED_AT`, and `age_floor_met` is a server-side column, so the
verdict travels with the account: a registered person meets this screen on a
second phone or on the web, where the device created nothing, and someone who
answers under-floor on one device without confirming meets it again on another.
The erasure is account-scoped — `delete_user_account()` purges `auth.uid()` — so
the wrong subject sat directly above an irreversible action: read literally,
_"the account this device created"_ suggests a throwaway, and the
mistyped-birth-year reader could confirm believing a device-local account was
going, or leave a removal they wanted unmade believing their real account was
untouched. The subject is now the account itself (_"This account is still
here…"_ / _"Този профил все още е тук…"_), which is true for every reader; the
permanence sentence is unchanged. `under-floor-screen.test.tsx` refuses a device
attribution anywhere in the under-floor copy in both locales, beside the
emptiness guard — what it bans is a device standing as the account's **origin**,
never the word _device_, because the block itself really is device-scoped.

**The block does not wait for that press.** The device is blocked on mount,
whether or not the erasure is ever asked for, so closing the app is not a way
past the verdict and the floor is exactly as hard as it was. Only the
irreversible half waits. A person who never confirms is therefore blocked with
an empty account still alive — which is the deliberate trade: an unerased empty
account is recoverable, and an account erased on a typo is not.

**The erasure acts on the account the verdict judged, never on whoever is signed
in** ([#2195](https://github.com/Selftend/selftend/issues/2195)). The flag is
device-scoped and the deletion is account-scoped, and for 24 hours those were
not the same account: `ProtectedLayout` renders the exit screen for **any**
session inside the window — deliberately, so the block survives the sign-out it
causes — and the screen used to hand the exit whoever `useSession` reported. On
a shared phone that made the next person to sign in the one deleted. The verdict
now carries the id of the account it judged, in React state, and
`useUnderFloorExit` erases only when that id is also the signed-in one. The
second half is not belt-and-braces: `delete_user_account()` derives its target
from `auth.uid()` and cannot be told whom to delete, so the id is not a
parameter to the purge — it is the permission to make the call at all. A mount
the block cannot vouch for reports `nothing-to-erase`: it still blocks, it just
no longer destroys.

☠️ **The id lives in memory, not in the flag.** Putting it in storage would have
been the obvious binding and it was rejected: the flag's one stated property is
that it holds an expiry timestamp and nothing a person could be identified by,
and a device-local id naming a deleted account is exactly the field that
property exists to refuse.

**The device flag is written before the deletion is asked for**, and the order
is the guarantee. A crash, a kill or a dead network between the two leaves a
blocked device with a live empty account. The reverse order would leave a
deleted account with no flag — a person walking straight back into the gate.

⚠️ **That crash leaves an empty account behind, and no later launch finishes it
off.** Retrying across launches was what flag-first used to buy, and it is gone
with #2195 for the reason directly above: the flag stores no identity, so a
later launch cannot tell whose account it would be completing the removal of,
and the only safe answer to "I do not know whose this is" is to block and not
destroy. Retry now lives inside the mount that failed, where the verdict is
still in hand — and it needs the token, so a session lost before a failed
deletion succeeds strands the account too. Both cases end the same way: an
empty, stranded row. There is no server-side sweep that closes this in general:
the guest dormancy job (`20260826010000_guest_dormancy_cleanup.sql`) only
touches `auth.users.is_anonymous` rows and only after twelve months, so it
eventually collects a stranded **guest** and never collects a stranded Google,
Apple or email account. Nothing personal is in either — the gate writes nothing
on a failing verdict — so this is an orphaned empty row rather than retained
data, and it is recorded here rather than presented as impossible.

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

  ☠️ Neither consumer treats the flag as authority to delete anything. It
  answers one question — may this device open the app — and the account the
  erasure may act on comes from the verdict, not from the flag (#2195).

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
which is why both account controls are worded about the account ("Remove the
account", "Remove it now") and never about having another go at the questions.

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
