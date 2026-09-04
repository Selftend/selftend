# DPIA and minors' data-protection assessment

The combined Data Protection Impact Assessment (GDPR Art. 35) and minors'
data-protection assessment (Connecticut C.G.S. §§ 42-529 et seq., Colorado SB
24-041) that [spec #227](https://github.com/Selftend/selftend/issues/227) §4
requires before Selftend admits anyone under 18. Written for
[#1768](https://github.com/Selftend/selftend/issues/1768).

**Assessed: 2026-09-04**, against `dev` at `49c4b758` — the commit at which the
13+ per-country floor, the age gate, the under-floor exit, the separate Art. 9
consent, the published policy text and the delete-on-knowledge procedure are all
in the tree. It is deliberately written after the build rather than before it,
because §4 asks for a description of the real data flow and a prediction would
have been wrong twice over: the gate ended up covering four entry paths rather
than two, and the deletion capability it needed turned out to already exist.

It is written to be read by someone who has not seen the code. Every claim about
behaviour names the file that implements it, so a reviewer can check rather than
trust.

> [!NOTE]
> This is the assessment, not the sign-off. The owner's legal review
> ([#1771](https://github.com/Selftend/selftend/issues/1771), spec §5) reads it
> alongside the published text before either goes live.

## Why this exists, and what it replaces

A DPIA screening on 2026-05-12 concluded that a full DPIA was not required, and
that conclusion was right for the product it described: an 18-and-over app, at
testing scale, with no children among its data subjects. The reasons are still
recorded in the operations runbook under
[DPIA Screening](operations-runbook.md#dpia-screening), which is now marked as
superseded rather than deleted — a screening that was overtaken is part of the
accountability record.

Three things moved it:

- **Children are now data subjects.** The floor is 13, or a country's higher
  floor ([age-floor.md](age-floor.md)). Under Art. 35(1) and the WP248 criteria
  the Article 29 Working Party set out, two criteria are enough to expect a
  DPIA, and this processing meets two of them squarely: _data of a highly
  personal nature_ (special-category health content) and _vulnerable data
  subjects_, for which WP248 names children as the example.
- **The lawful basis moved with it.** The entries are special-category data
  processed on Art. 9(2)(a) explicit consent, which is what sets the floor
  country by country in the first place.
- **Two US states require an assessment of their own** for an online service
  offered to minors, and neither has a revenue or headcount threshold that a
  small non-profit falls below. Writing two documents about one data flow would
  have produced two accounts of it, so this is one document with a section for
  the second framework (§6).

**No Data Protection Officer is designated.** Art. 37(1)(c) requires one where
core activities consist of _large-scale_ processing of special categories. The
processing here is core but not large scale: the Play listing reported **26
installs** on 2026-09-03, alongside an unpromoted web app and an iOS build that
is not yet released. That is a threshold that can be crossed quietly, so it is
listed in §8 as a trigger to re-read this document rather than treated as
settled.

**Data subjects were not consulted** (Art. 35(9): "where appropriate"). There is
no user body to consult at this scale, and no way to ask one that would not
itself collect data about who answered. The closest substitute in the record is
the module-by-module [child-safety content review](child-safety-review.md),
which read every user-visible string in the app against a 13-year-old reader.

## Scope, method and limits

**In scope:** everything the app stores or transmits about a person, with the
age gate and the Art. 9 consent capture described in full because they are the
new processing; the risks that processing creates for a 13- to 17-year-old; and
the measures already in place against them.

**Out of scope, and owned elsewhere:** the module-by-module content review
([#1770](https://github.com/Selftend/selftend/issues/1770),
[child-safety-review.md](child-safety-review.md)); the operational procedure for
an under-floor account discovered later
([#1769](https://github.com/Selftend/selftend/issues/1769), runbook
§ [Delete On Knowledge](operations-runbook.md#delete-on-knowledge-under-floor-accounts));
the Google Play declarations and the store listing (#1771); and Washington's My
Health My Data Act and Nevada SB 370, which are age-independent, apply today,
and are tracked as separate work (spec §10). Connecticut's own age-independent
consumer-health-data provisions **are** covered, in §6, because they sit inside
the Connecticut framework this assessment has to read anyway — the line is which
statute needs its own analysis, not which one mentions age.

**The limits of the method, stated rather than implied.** This assessment reads
the code and the documents; it did not run a penetration test, it did not audit
Supabase, and it takes the processors' own DPAs at their word. Where an
assertion rests on the behaviour of a writer rather than on a constraint the
database enforces, it says so — §5 turns on exactly that distinction.

## 1. The processing, described (Art. 35(7)(a))

### What Selftend is

A free, non-profit CBT programme with a set of everyday tools around it —
thought records, mood entries, a journal, gratitude, grounding, breathing,
meditation, sleep, habits and routines. Nothing a person writes is visible to
anyone else: there is no feed, no messaging, no profile, no sharing. There are
no advertisements, no subscriptions, no analytics SDK, no tracking pixels, no
behavioral profiling tools, and no AI feature in the product. It runs on iOS,
Android and the web from one Expo codebase, with Supabase as the backend.

The controller is Selftend, operated by Vasil Yoshev; the contact for data
matters is privacy@selftend.org, and for security security@selftend.org.

### Who the data subjects are

People aged 13 and over, or their country's higher floor — 14, 15 or 16 across
much of the EEA. The floor is never below 13 anywhere, and there is no
parental-consent path and no age verification: where a law would require one,
the floor rises instead. The population therefore includes children, and the
whole of this assessment follows from that sentence.

### How a person arrives, and what the app asks

There are **four entry paths**: email and password, Google, Apple, and a silent
guest account minted with `signInAnonymously` from the landing page's _Start
now_. The guest path is the primary one, and it matters here because a guest
writes the same special-category entries a registered user does while giving no
email and no name at all.

All four converge on one gate slot in `src/components/app/protected-layout.tsx`,
in front of the app shell. Two screens stand in that slot, in this order:

1. **The age gate** (`src/components/app/age-gate.tsx`, decided by
   `src/features/auth/age-attestation.ts`). It asks for a date of birth in three
   empty fields — day, month, year, no calendar and no default year — and a
   country of residence chosen from a type-to-find list of 250 entries — ISO
   3166-1 alpha-2's 249 currently assigned codes, plus the user-assigned `XK`
   for Kosovo. **Nothing before or during the questions names an age, a range, or a
   qualifying answer**, which is the neutrality the FTC's COPPA guidance asks of
   an age screen, and the opposite of a form that tells you which answer opens
   the door. `age-gate.test.tsx` asserts that absence against the strings in
   both locales.
2. **The consent gate** (`src/components/app/consent-gate.tsx`). Two separate
   unticked controls, neither pre-selected: acceptance of the terms and privacy
   policy, and — separately worded and separately performed — explicit consent
   to Selftend processing the self-help entries the person chooses to save. Both
   must be given before the gate opens. The withdrawal path (delete the account,
   or write to privacy@selftend.org) is stated beside the control. One submit
   writes four fields at one moment (`recordPolicyConsent`):
   `privacy_policy_accepted_at`, `terms_accepted_at`, `policy_version_accepted`,
   and — as its own fact rather than one implied by the others —
   `health_data_consent_at`.

The two controls used to be one tick. Art. 9(2)(a) wants a separate affirmative
act for special-category processing, and no amount of care in a single sentence
makes one tick into two acts, so
[#1766](https://github.com/Selftend/selftend/issues/1766) split them.

**Who is asked.** Only an account that has never been through the consent gate —
which is every brand-new account, guests included, at exactly the moment the
gate runs, and no existing account ever. Accounts predating the gate are not
re-asked for an age or a country; they meet the new consent step through the
policy-version bump instead.

### What the date of birth becomes

The date is compared once against the floor for the declared country
(`FLOOR_BY_COUNTRY` in `src/features/auth/age-floor.ts`) and **discarded**. It is
never stored, never logged, never transmitted.

That is a property of the code rather than a promise about it. The verdict type
`AttestationOutcome` has no field a date could travel in, and
`recordAgeAttestation` takes a country and writes a verdict — the date of birth
is not a parameter it could pass on.

**On a pass**, three columns on `user_preferences` are written, and nothing else:

| Column                 | Value                         | Why it is kept                                                           |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `age_floor_met`        | `true`                        | So the question is asked once rather than at every launch                |
| `age_attested_country` | Upper-case ISO 3166-1 alpha-2 | The floor varies by country; the answer is meaningless without which one |
| `age_attested_at`      | Timestamp                     | Evidence of when the act was performed, for the accountability record    |

All three are nullable with no default, and `null` means **never asked** — a
third state, not a synonym for failure. A `not null default false` would have
asserted that every account predating the gate had failed its floor.

**On a failure**, nothing at all is written — not even `age_floor_met = false`.
An account already exists by then on every path — the gate renders inside the
signed-in half of `ProtectedLayout`, below the branch that shows the auth
landing to a visitor with no session — and it is deleted immediately through the
self-service `delete_user_account()` RPC, which delegates to
`purge_user_account(uuid)`: the person's avatar objects, then every per-table
row, then the `auth.users` row. A
device-local flag, `selftend:age-floor:blocked-until`
(`src/features/auth/under-floor-block.ts`), holds a single expiry timestamp for
24 hours so the next launch does not silently mint a fresh guest and re-open the
gate a second later. The flag stores one number: no age, no country, no
identifier, nothing a person could be recognised from. The exit screen is calm
and non-shaming, and carries the two links that work without an account —
`/crisis` and Find A Helpline. It reports the erasure rather than asserting it:
it says the account has been removed only in the state where the deletion
actually landed, says so plainly when it failed and offers a retry, and says
nothing at all when there was no account to remove — which is what a returning
blocked device looks like.

### What is stored, for everyone

| Data                                                                                   | Held where                    | Notes                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email, auth metadata                                                                   | Supabase Auth, `profiles`     | Registered accounts only. A guest account has no email                                                                                                                                                                                                                                                     |
| Self-help entries (thought records, mood, journal, gratitude, sleep, habits, routines) | Supabase, per-user tables     | Encrypted at rest at field level with pgcrypto; the key is in Supabase Vault, outside the database                                                                                                                                                                                                         |
| Preferences, including the three attestation columns and `health_data_consent_at`      | `user_preferences`            | One row per user, scoped by Row-Level Security                                                                                                                                                                                                                                                             |
| Optional avatar image                                                                  | Private `profile-pics` bucket | Optional; removed by the purge helper                                                                                                                                                                                                                                                                      |
| Web push subscription record                                                           | Supabase                      | Only after an explicit opt-in and a browser permission                                                                                                                                                                                                                                                     |
| Auth event logs                                                                        | Supabase                      | Security and abuse prevention                                                                                                                                                                                                                                                                              |
| Crash and error reports                                                                | Sentry                        | `sendDefaultPii: false`, plus `scrubEvent` / `scrubBreadcrumb` in `src/lib/sentry.ts`: the email and the device name go, console breadcrumbs are dropped whole, and a navigation breadcrumb loses its query string (an http breadcrumb keeps its own — a PostgREST filter, carrying no health value today) |
| Cookie preference (web)                                                                | Browser `localStorage`        | Not written to the server                                                                                                                                                                                                                                                                                  |

**No date of birth. No age. No location beyond the self-declared country. No
device identifier, no advertising identifier, no contact list, no biometric
data, no government ID.**

**The person's own records are exported to them on request**, through the JSON
export in Settings (`export_user_data()`), the three attestation columns among
it — a country someone typed and the timestamp of their own act are plainly
their data. Three rows above are outside that export and it is worth saying
which: the auth event logs and the Sentry crash reports are operational records
rather than user-held ones, and the cookie preference never leaves the browser
it was set in. What else the export withholds, and the narrow grounds on which
anything may be, is the rule in `supabase/README.md`.

### Who else sees it

Supabase (database, auth, storage), Cloudflare (static web hosting), Sentry
(crash reporting), Google and Apple where a person chooses those sign-in paths,
Expo for build tooling only, and the browser's own push service if web reminders
are switched on. Each is a processor under a DPA; transfers to the USA rely on
Standard Contractual Clauses. The full list, with links, is the processor table
in [policies.md](policies.md).

**Nothing is sold, shared for advertising, or disclosed to anyone else.** There
is no recipient category beyond the processors above.

### How long it is kept

For the life of the account. Deletion is self-service in Settings and immediate
in live systems; backups made before it are deleted within 90 days. A dormant
guest account is collected after twelve months by
`20260826010000_guest_dormancy_cleanup.sql`. An under-floor attempt retains
nothing at all.

## 2. Necessity and proportionality (Art. 35(7)(b))

**Lawful basis.** Contract (Art. 6(1)(b)) for the account and the service;
explicit consent (Art. 9(2)(a)) for the self-help content, captured as its own
act and recorded in `health_data_consent_at`; consent (Art. 6(1)(a)) for
reminders; legitimate interest (Art. 6(1)(f)) for auth-event logging. The age
attestation itself is processed to meet the age condition the Art. 9 consent
depends on — the app has to know which floor applies before it can rely on a
14-year-old's consent in Bulgaria or a 16-year-old's in Germany.

**Why this is the least data that answers the question.** The question the gate
asks is binary: does this person clear the floor where they live. The honest
minimum answer is a boolean, a country and a timestamp — which is exactly what is
kept. The date of birth would have been the more useful field to store, and it is
the one deliberately thrown away, because a stored birth date is a permanent,
exportable, breachable fact about a child that answers nothing the boolean does
not.

**Alternatives considered and refused:**

- **Age verification** (document check, credit reference, third-party
  age-assurance vendor). Refused: it would collect far more sensitive data about
  every user — including an identity document from a 13-year-old — and route it
  through a new processor, in order to raise the reliability of one boolean.
  Spec §10 rules the whole category out.
- **Age estimation** from a selfie or from behaviour. Refused for the same
  reason and one more: it is biometric or profiling processing, and the product
  does neither.
- **A parental-consent path** for people below their country's floor. Refused:
  it requires collecting and verifying an adult's identity and their
  relationship to a child, which is more data about more people. **The floor
  rises instead** — the country's own consent age becomes the eligibility age.
- **The Play Age Signals API**, which would return an age band from Google. Not
  integrated: it is not mandated for the audience Selftend declares, and it
  would introduce a per-user age band supplied by a third party where the app
  currently holds a self-declared verdict. It stays on the annual watch list.
- **Storing a minor flag.** Refused; §5 is the whole argument.

**Proportionality of the under-floor deletion.** Deleting an account is
irreversible, so two things guard the path to it. An impossible date ("31
February") is caught by the calendar check _before_ the floor is measured and
shown as a correctable field error rather than an exit. And the account being
deleted is one that has never been through the consent gate, so in the ordinary
case it holds nothing yet. The exception is an account that reached the shell
during the fail-open window in R7 below; that combination is the one way a typo
could cost someone content, and it is recorded rather than argued away.

## 3. Risks to rights and freedoms (Art. 35(7)(c))

Likelihood and severity are judged **low / medium / high** for a 13- to
17-year-old data subject specifically, before the controls in the fourth column
and after them in the fifth.

| #   | Risk                                                                                                              | Likelihood | Severity | Controls in place                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Residual |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R1  | A breach exposes a teenager's mental-health reflections                                                           | Low        | High     | Field-level pgcrypto encryption with the key in Vault, outside the database; Row-Level Security scoping every row to its owner; TLS; CSP and HSTS on web; SecureStore for mobile credentials; no service-role key in any client bundle                                                                                                                                                                                                                                                                   | Low      |
| R2  | Someone below their floor gets in by mis-stating a date                                                           | Medium     | Medium   | Attestation is not verification and is never claimed to be. The mitigation is that the product is built to be safe for a 13-year-old regardless of who is in it (§5), plus delete-on-knowledge when a report arrives                                                                                                                                                                                                                                                                                     | Medium   |
| R3  | Someone above their floor is wrongly excluded and loses an account                                                | Low        | Medium   | The calendar is checked before the floor, with a correctable error; the device block expires in 24 hours and is not rewritten on every launch; nothing about the person is retained to hold against them                                                                                                                                                                                                                                                                                                 | Low      |
| R4  | The age answer itself becomes a profile, or a permanent label                                                     | Low        | Medium   | Three columns, no date of birth, no minor flag, no age band; the answer is exported to the person and deleted with their account                                                                                                                                                                                                                                                                                                                                                                         | Low      |
| R5  | The exit screen distresses a young person who has just been turned away                                           | Medium     | Medium   | Calm, non-shaming copy that states what happened and why; `/crisis` and Find A Helpline reachable without an account; no lecture, and no appeal that could only be settled by collecting more data                                                                                                                                                                                                                                                                                                       | Low      |
| R6  | Engagement mechanics extend or compel a minor's use                                                               | Low        | High     | Principle 12 _Fulfilling, And Done_ and [ADR-0004](adr/0004-retention-by-return-not-engagement.md): nothing counts days or run-lengths, no levels or badges, nothing varies by date or visit, no contact triggered by non-use, reminders opt-in and off by default. `test/practice-copy.test.ts` holds the copy half of that line as a merge gate — it bans copy that prescribes a return or names a run to keep, and does not police the mechanics, which rest on the principle and the reviewer bullet | Low      |
| R7  | The gate fails open on a preferences error and a person reaches the shell un-attested                             | Low        | Medium   | Recorded rather than hidden, in [age-floor.md](age-floor.md). Failing closed would block every user whose first fetch of a cold start failed, with nothing in that state to tell a new guest from a long-standing user; the consent gate makes the identical call for the identical reason                                                                                                                                                                                                               | Medium   |
| R8  | A guest account belonging to an under-floor person cannot be found when someone reports it                        | Medium     | Medium   | The runbook says so plainly and gives the only real answer — Settings → Delete account on the device holding the session — rather than implying a lookup exists; the dormancy job collects the row after twelve months                                                                                                                                                                                                                                                                                   | Medium   |
| R9  | The content itself harms a young reader (medical implication, treatment framing, crisis material presented badly) | Low        | High     | The module-by-module [child-safety content review](child-safety-review.md) across all 20 namespaces in both languages; crisis guidance kept on its own page with its own vocabulary; the wellness-not-diagnosis boundary in principle 6                                                                                                                                                                                                                                                                  | Low      |
| R10 | Data reaches a third country without adequate safeguards                                                          | Low        | Medium   | SCCs and processor DPAs; a transfer impact assessment in the runbook; the processor list is short and each entry has a stated role                                                                                                                                                                                                                                                                                                                                                                       | Low      |
| R11 | A support conversation collects an age dossier while enforcing the age floor                                      | Low        | Medium   | The runbook forbids asking for a date of birth or a document, forbids reading someone's records to age them, and forbids recording an age in the request log                                                                                                                                                                                                                                                                                                                                             | Low      |
| R12 | A deletion is aimed at someone by a stranger, as harassment                                                       | Low        | High     | The three-way credibility rule in the runbook: the account holder acts; a parent or guardian with a plausible connection triggers one message to the holder first; a reporter with no plausible connection is refused                                                                                                                                                                                                                                                                                    | Low      |

Three residual mediums — R2, R7 and R8 — are carried deliberately, and §7 says
why.

## 4. Measures (Art. 35(7)(d))

Most of the mitigation was built before this document, which is the point of
writing it afterwards. Collected in one place:

- **Data minimisation at the boundary.** The date of birth has no column, no
  parameter, and no field on the verdict type. The under-floor block stores one
  integer. The country is the coarsest location datum that answers the question.
- **Encryption and access control.** Field-level encryption of user-entered
  content with the key held outside the database; Row-Level Security on every
  table; no client-side service-role key; a purge helper revoked from `public`,
  `anon` and `authenticated`, so only the server can name a target.
- **Consent that is a real act.** Two unticked controls, separately worded, both
  required, no pre-selection and no dark pattern; the withdrawal path stated
  beside the control; the consent recorded with a timestamp and exported to the
  person. Existing accounts were **not** backfilled from the old bundled
  checkbox — a backfill would have asserted precisely the consent the split
  exists to obtain.
- **Universal protective defaults.** §5 and §6 enumerate them.
- **Rights that work without asking us.** Export and deletion are both
  self-service in Settings; rectification is ordinary in-app editing.
- **A procedure for knowledge that arrives from outside.** The runbook's
  delete-on-knowledge steps, including the credibility rule and the standing ban
  on collecting proof of age.
- **Recurring review.** A child-safety checklist line in the PR template that
  fires on every new module or engagement-adjacent feature, and an annual
  legal-landscape check every September that updates this document.

## 5. The no-minor-flag decision

**The decision:** nothing stored distinguishes a minor from an adult. There is
no minor flag, no age band, no birth year, and no derived "is a teenager"
column. Decided in wayfinder map
[#216](https://github.com/Selftend/selftend/issues/216), settled in spec #227
§4, and confirmed by the owner on 2026-09-03 when the build was authorised.

**What the database actually holds.** `age_floor_met` is only ever written
`true`: an under-floor verdict writes nothing, because the account it would be
written against is deleted on the spot. So the column holds `true` or `null`,
and **no query finds a minor** — or anyone's age at all, because the column
records that a floor was cleared, never which floor or by how much. ⚠️ That is
writer behaviour, not a schema fact. The column is an unconstrained nullable
boolean and a future write of `false` would not be rejected; what the schema
guarantees is only that `null` means _never asked_ rather than _failed_.

**Why not store the flag.** A minor flag looks like the responsible option — it
is what a system would need in order to switch on extra protections for the
people who need them. Four things argue against it here:

1. **It re-creates the record the gate exists to discard.** Throwing away a date
   of birth and then storing a derived label saying the person is a child keeps
   the sensitive part and loses only the precision.
2. **It is a label that outlives its truth.** A flag written at 14 is wrong at
   19 unless something re-asks, and re-asking means collecting the age again,
   every year, from everyone.
3. **To be useful it would have to travel.** A flag that changes behaviour has
   to be readable by the code that changes behaviour, and eventually by the
   processors that code talks to — so a fact about a child spreads further than
   the entries it was meant to protect.
4. **It would create a second, quieter product mode**, which necessarily means
   the default mode is the less protective one. That is the wrong way round for
   a product whose guardrails were written to be safe for anyone.

**What is done instead: the floor of protection.** Every protection a minors'
regime would demand for a known minor is applied to every user unconditionally.
This is the model the Irish Data Protection Commission sets out in
_Fundamentals for a Child-Oriented Approach to Data Processing_: where a service
cannot reliably tell which of its users are children, it applies the
child-appropriate standard to all of them rather than guessing.

**The argument does not rest on the app lacking knowledge, and that is
deliberate.** Both US regimes in §6 attach to a controller that "actually knows
or willfully disregards" that a consumer is a minor. A service that admits
13-year-olds by design and then argues it does not know it has any is exactly
the posture the phrase _willfully disregards_ was drafted for. So this
assessment does not make that argument. The duties are satisfied for everyone,
which makes the knowledge question moot: it does not matter whether a given user
is a known minor when the answer is the same either way.

**The cost of the decision, stated.** Delete-on-knowledge cannot be automated —
there is no query that finds an under-floor account, so knowledge arrives from
outside or not at all. That is not a side effect to be regretted; it is the
direct consequence of not building the surveillance that would make the report
unnecessary, and the runbook procedure exists because of it.

## 6. Connecticut and Colorado: the minors' assessment

### Which US laws are treated as attaching

Grounded in the research done for the map
([`docs/research/2026-07-24-us-teen-legal-obligations.md`](https://github.com/Selftend/selftend/blob/research/us-teen-obligations/docs/research/2026-07-24-us-teen-legal-obligations.md)
on branch `research/us-teen-obligations`, sources checked 2026-07-24; the moving
items re-checked 2026-09-04 for the runbook's annual check).

- **COPPA** reaches under-13s only, and the floor is never below 13. What COPPA
  asks of a general-audience service is the neutral age screen described in §1
  and deletion on actual knowledge — both built.
- **Connecticut** (C.G.S. §§ 42-529 et seq., in force since 2024-10-01, amended
  by SB 1295 effective 2026-07-01) and **Colorado** (CPA as amended by SB 24-041,
  effective 2025-10-01, minors' rules adopted 2025-10-08) impose duties for known
  minors under 18 **without the threshold tests** their base acts use.
  ⚠️ Whether Connecticut's non-profit exemption reaches its separately codified
  minors' provisions is not settled in the sources reviewed. **Both are treated
  as attaching**, which is the conservative reading and costs nothing, because
  everything they require is already true.
- **The California AADC, the Maryland Kids Code, Nebraska's design code, the
  VCDPA, Maryland MODPA and the CCPA** are each limited to a for-profit business,
  or to revenue and volume thresholds a small non-profit does not meet. Recorded
  so the next reader knows they were considered rather than missed.
- **The Texas SCOPE Act and the social-media minor laws** define their subject as
  a service that connects users, hosts profiles, or shows one user's content to
  another. Selftend does none of those, so they do not reach it by definition.
- **The app-store accountability acts** (TX, UT, LA, AL) put age verification and
  parental consent on the stores, and leave developers to keep age ratings
  accurate, consume the store's signals, and notify the store of significant
  changes. Whether they reach a free non-profit app is a parked counsel question
  (spec §9) and an annual watch item.
- **Vermont's AADC** takes effect 2027-01-01 with rulemaking still live, and its
  revenue-based coverage test makes a free non-profit likely out of scope —
  untested, so it is on the annual list.

### The duties, against the defaults that meet them

Every row is satisfied **for every user**, not for a flagged subset. That is the
structural claim of §5, in table form.

| Duty                                                                           | Source                                               | How Selftend meets it, universally                                                                                                                                                                                          | Where to check                                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reasonable care to avoid a heightened risk of harm, including **mental** harm  | CT § 42-529a; CT SB 1295; CO SB 24-041               | The wellness-not-diagnosis boundary; no diagnosis, treatment claim, or therapist substitute; crisis guidance kept separate and reachable without an account; a content review run specifically against a 13-year-old reader | [child-safety-review.md](child-safety-review.md), principles 6 and 11                                  |
| A written data-protection assessment for a service offered to minors           | CT §§ 42-529 et seq.; CO SB 24-041                   | This document                                                                                                                                                                                                               | This file                                                                                              |
| No targeted advertising to a minor (categorical in CT since 2026-07-01)        | CT SB 1295; CO SB 24-041                             | No advertising of any kind, no ad SDK, no ad network, no advertising identifier. Ad-based monetisation is a standing product refusal, not a setting                                                                         | [product-principles.md](product-principles.md) principles 1 and 10, [analytics.md](analytics.md)       |
| No sale of a minor's data (categorical in CT)                                  | CT SB 1295; CO SB 24-041                             | Nothing is sold or shared. Every recipient is a processor under a DPA, listed by name and role                                                                                                                              | [policies.md](policies.md) processor table                                                             |
| No profiling with legal or similarly significant effects                       | CT § 42-529a; CO SB 24-041                           | No automated decision-making anywhere in the product; Art. 22 does not apply either                                                                                                                                         | [gdpr-compliance.md](gdpr-compliance.md)                                                               |
| No system design feature used to significantly increase, sustain or extend use | CT § 42-529a (strengthened by SB 1295); CO SB 24-041 | Nothing counts days or run-lengths; no levels, badges or scores; nothing varies by date or visit; completion copy states the record and stops; no contact is triggered by non-use                                           | Principle 12, [ADR-0004](adr/0004-retention-by-return-not-engagement.md), `test/practice-copy.test.ts` |
| Notifications and engagement contact only on an explicit opt-in                | The same duty, applied to reminders                  | Reminders are off by default, opt in per channel, and switch off in Settings; nothing is sent because someone stopped using the app                                                                                         | Principle 5, [architecture.md](architecture.md)                                                        |
| No processing beyond what is reasonably necessary, and no retention beyond it  | CT § 42-529a                                         | The data table in §1 is the whole of it; a new field requires feature-level justification before it is added                                                                                                                | [data-privacy-model.md](data-privacy-model.md)                                                         |
| No collection of precise geolocation                                           | CT § 42-529a; CO SB 24-041                           | None is collected. The only location datum in the system is a self-declared country of residence                                                                                                                            | §1 of this document                                                                                    |
| Safeguards against unsolicited adult-to-minor contact                          | CT § 42-529a                                         | Moot by construction: there is no messaging, no feed, no profile, and no way for one user to see another                                                                                                                    | [architecture.md](architecture.md)                                                                     |
| Consent flows free of dark patterns                                            | CT § 42-529a; CO SB 24-041                           | Two unticked controls, neither pre-selected, both required, worded apart; the update offer is an offer rather than a nag                                                                                                    | `consent-gate.tsx`, [ADR-0003](adr/0003-update-offer-is-a-modal.md)                                    |
| A minor's own consent (13+) where consent is the basis                         | CT § 42-529a; CO SB 24-041                           | The Art. 9 consent is the person's own act, and the floor is set precisely so that the person giving it is old enough to give it in their country                                                                           | §1, [age-floor.md](age-floor.md)                                                                       |

### Connecticut consumer health data

Connecticut's consumer-health-data provisions (SB 3 §§ 1-6, effective
2023-10-01) apply to **all persons, including non-profits**, and are independent
of age. They prohibit selling consumer health data without consent, require
employees and contractors handling it to be bound to confidentiality, and ban
geofencing around mental-health facilities. Selftend sells nothing, geofences
nothing, and has no location capability to geofence with. The confidentiality
duty is a live obligation on anyone who ever gains access to production data,
and the runbook's standing rule — user records are read only to fulfil a
verified privacy request, investigate a security incident, or satisfy a legal
obligation — is where it is written down.

## 7. Residual risk and conclusion

**Three residual risks are carried deliberately**, and none of them is high:

- **R2, a false attestation.** Unresolvable without age verification, which spec
  §10 refuses on data-minimisation grounds. The mitigation is not a better gate;
  it is that the product is built to be safe for a 13-year-old whether or not the
  gate was answered honestly, and that a report from outside leads to deletion.
- **R7, the gate failing open on a preferences error.** The alternative — a
  closed gate — would lock out every user whose first fetch failed on a cold
  start, with nothing in that state to tell a new guest from a long-standing
  user. The legal consent gate beside it makes the same call, so the age gate is
  no weaker than the gate it stands in front of.
- **R8, an unreachable guest account.** The consequence of an entry path that
  asks for nothing. Answering it would mean identifying guests — costing every
  guest their anonymity to make a rare report actionable.

**Conclusion: the residual risk is not high**, and no prior consultation with a
supervisory authority under Art. 36(1) is required. The processing is small in
scale, voluntary, initiated by the person, confined to their own records, sold
to nobody, shown to nobody, and reversible in one tap from Settings. The
special-category content is real and is treated as such: encrypted with a key
held outside the database, consented to as its own act, and deletable by the
person who wrote it.

The load-bearing sentence of the whole assessment is §5's: **the protections do
not depend on knowing who is a child.** A control that only fires for a flagged
minority fails exactly where the flag is wrong, and the flag would be wrong
often here, because the app deliberately declines to learn anyone's age. A
default that is safe for everyone has no such failure mode.

## 8. When this must be re-read

Not on a calendar alone. Any of these re-opens it:

- **The annual legal-landscape check**, every September — the six areas in the
  runbook's
  § [Annual Legal-Landscape Check (minors)](operations-runbook.md#annual-legal-landscape-check-minors),
  first due September 2027. Colorado's cure period for minors' violations ends
  **2026-12-31**, which is sooner than that cadence and is flagged there.
- **A new module, or any engagement-adjacent feature** — the PR-template
  checklist line fires the child-safety review, and a finding that touches data
  rather than copy lands here.
- **Anything that would change a row in §1's data table**: a new field, a new
  processor, a new transfer mechanism, a new entry path.
- **Any of the things §5 refuses**: a minor flag, an age band from a store
  signal, age estimation, a parental-consent path, or storing a date of birth.
- **Scale.** Art. 37(1)(c)'s "large scale" is the threshold that turns a
  designated DPO from unnecessary into required, and Art. 35(3)(b) uses the same
  phrase. Neither has a number attached, which is precisely why it needs
  re-reading rather than a trigger.
- **Analytics, research use, AI, community or sharing features, or any
  practitioner in the loop.** Each would change the answer in §2 rather than add
  a row to it.
