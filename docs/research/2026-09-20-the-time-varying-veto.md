# The time-varying veto: true, user-facing, and not yet available

Research for [#2621](https://github.com/Selftend/selftend/issues/2621), part of map
[#2596](https://github.com/Selftend/selftend/issues/2596). Measured 2026-09-20 against
`origin/dev` (`625868e7`), `origin/main` (`aed79a24`) and the live releases API — **all 32
releases**, not the 26-release frozen corpus, which stops at v0.17.0 and contains none of
the releases this ticket is about.

**The question.** What does the drafter do with a change that is true, user-facing and not
yet available to anyone — and does that make [#2599](https://github.com/Selftend/selftend/issues/2599)'s
veto a thing that expires?

**The answer, in one line.** ☠️ **No — and the question dissolves, because this is not a
veto at all.** A change withheld from every reader has no true sentence to veto:
[#1877](https://github.com/Selftend/selftend/issues/1877) rule 1 makes the sentence
unwritable, and #2599 already fixed what happens when no sentence exists — **spares**. The
drafter needs no new state, no deferred store and no sweep. The news is not lost, it is
**relocated**: the lift is itself a change with its own PR, so it is announced at the
release that makes it true, by [#2603](https://github.com/Selftend/selftend/issues/2603)'s
ordinary route D. The entire mechanism is **one clause in the lift recipes** — the lift
must ship as a changelog-bearing type and carry the field.

---

## 0. Premise audit

| Premise | Verdict |
| --- | --- |
| "a change that is … **not yet available to anyone**" is the distinguishing property | ☠️ **Too weak to be a test — it is true of every release.** #1877 measured v0.17.0: web lands at **+2 min**, the Android AAB is **not submitted until +28 min**, and `eas.json` has **no iOS submit profile at all** (`ios-release.yml:38`: "Where this lands: TestFlight, not the App Store"). The drafter fires at **+0**. So *nothing* is available to *anyone* when the thread is drafted, on 32 releases out of 32. #1877 rules 1, 2 and 7 exist precisely to make that harmless. A rule keyed on "not yet available" would veto the entire changelog. |
| "Two live instances" | ☠️ **Three gate families, nine gated things, and the ticket names two.** The missed one is `WITHHELD_STEP_TOOL_IDS` (`src/features/routines/step-tool-rollout.ts`) — **six DBT step tool ids withheld from writing since v0.18.0** ([#2203](https://github.com/Selftend/selftend/issues/2203)). It appears in **no** section of `docs/releasing.md` and has **no** tracking issue. See § 1. |
| v0.21.0's `general` reminder reaches nobody | ✅ **Verified.** `HELD_OUT_REMINDER_TARGETS = ["dbt", "general"]` on `origin/dev`; `web-reminders.ts:218` partitions it out of the cron; `notification-target-row.tsx:127` switches the row off. [#2494](https://github.com/Selftend/selftend/issues/2494) is open, `ready-for-human`. |
| v0.22.0's modules case is the **same** case | ☠️ **It is not, and conflating them is what makes the problem look like one needing a mechanism.** `shouldShowModules(appEnvName, isDev, platform)` returns `true` for every non-iOS platform unconditionally. CBT, ACT and DBT are **reachable right now** by every Android and web user, labelled beta. That is *partial* availability, which #1877 rule 2 already vetoes **permanently** ("The post asserts no per-platform availability"). It is not time-varying; it is a standing rule that was already closed. |
| #2599's veto might be made to expire | ☠️ **Refused at source, and the repo has already paid for learning this.** `docs/positioning.md:446`: *"A ban row leaves this table when its **reason** dies, never when its **violations** run out. … ⚠️ This is the **opposite** object from a suppression list, which is a permission to violate and must expire."* And `:468` records a **22-entry suppression list rejected** because *"a list that size silently becomes permanent."* Putting a time-bounded fact into the veto imports exactly the object that document says is its opposite. |

---

## 1. The measurement: how many such changes there actually are

### 1.1 Over the changelog — 3 bullets in 632

All 32 release bodies, every `* ` bullet, scanned for the hold-out vocabulary
(`withhold|withheld|held out|hold-out|hidden on|ships hidden|not ready yet|until the
native|rollout lands|behind a build gate|dark launch`):

```
tight hold-out bullets: 4 / 632
  v0.22.0  **modules:**   CBT, ACT and DBT hidden on iOS, shipped as beta on Android and web
  v0.21.0  **reminders:** the general reminder target, held out - registry, client, edge and copy
  v0.18.0  **cbt:**       the recovery-plan hint stops naming the punishment it withholds   <- false positive (copy)
  v0.18.0  **routines:**  withhold DBT step ids from writing until the native rollout lands
```

**3 real bullets out of 632 (0.47%), in 3 of 32 releases (9.4%).** A wider sweep on
`gate|gated|hidden|not yet|disabled|staged|dormant|…` returns 37 bullets; **34 of them are
lint gates, copy gates, age gates, seam gates and wash gates** — the word "gate" is this
repo's ordinary vocabulary for a merge-time guard, not for a hold-out.

### 1.2 Over the repo — three gate families, and no feature-flag system at all

| # | Gate | Shipped | Withheld from | Things held | Lift tracked by |
| --- | --- | --- | --- | --- | --- |
| **G1** | `HELD_OUT_REMINDER_TARGETS` (`src/features/notifications/reminder-rollout.ts`) | `dbt` v0.18.0, `general` v0.21.0 | **everyone** | 2 targets | `releasing.md` § *Post-release*; **`general` only** → [#2494](https://github.com/Selftend/selftend/issues/2494). ☠️ `dbt` has **no issue**. |
| **G2** | `WITHHELD_STEP_TOOL_IDS` (`src/features/routines/step-tool-rollout.ts`) | v0.18.0 | **everyone** (writing; reads stay permissive) | 6 tool ids | ☠️ **nothing.** Not in `releasing.md`, no issue. Only the docblock and `step-tool-rollout.test.ts`. |
| **G3** | `module-visibility.ts` — `shouldShowModules` | v0.22.0 | **iOS only** | 3 modules | `releasing.md` § 286 describes it; **no issue**. |
| **G3b** | `module-visibility.ts` — `modulesAreBeta()` | v0.22.0 | nobody (it is a **label**, not a gate) | 3 modules | **no issue**. Its own docblock: *"the day beta is lifted is not the day the iOS gate opens"* — two independent future acts. |

☠️ **There is no feature-flag infrastructure in this repo.** `src/lib/env.ts` carries no
flag key of any kind — every entry is a URL, an address or a key. `EXPO_PUBLIC_APP_ENV`
(`appEnv.appEnvName`) is the only build discriminator, and it has exactly **one** consumer
that gates anything: `module-visibility.ts`. (`sentry.ts:6` reads the raw env var too, but
only as an environment *tag*; its actual gate is `shouldEnableSentry(dsn, isDev)`.) So
"feature flags" is not a third population to count; it is empty.

### 1.3 ☠️ Zero lifts have ever happened

Every commit touching `reminder-rollout.ts`, diffed for list membership:

```
3589bef2 / 5c72eabb  fix(reminders): stop offering a reminder the cron holds out   + "dbt"
77b78f04             docs(research): …                                            + "dbt"   (rebase artefact)
831b5add / b4f7d5cc  feat(reminders): the general reminder target, held out        + "general"
```

**Only additions. Never a removal, in the whole history of the file.** `WITHHELD_STEP_TOOL_IDS`
has never shrunk either. `docs/releasing.md:40` already names this as the known failure
mode, in its own words:

> *"Nothing lifts it automatically, and nothing goes red while it stays held out — which is
> exactly how a hold-out outlives its reason."*

Ages as of 2026-09-20: G1 `dbt` and G2 **10 days** (v0.18.0, 2026-09-09), G1 `general`
**3 days** (v0.21.0), G3/G3b **2 days** (v0.22.0). Young — but unlifted is unlifted, and
the structural reason is iOS: `releasing.md` § *How iOS reaches users* — *"It doesn't,
automatically — and that is the design"*, and #1877 measured the App Store live at
**0.15.0 while GitHub was on 0.17.0, 16 days open**. Every G1 and G2 lift is gated on a
**manual App Store Connect promotion** that no pipeline performs.

**So the honest answer to "how many" is: three, ever — and the mechanism should be
correspondingly small.** A generalised deferred-announcement machine for a three-instance
problem is the wrong answer, and § 5 shows it is also the *dangerous* one.

---

## 2. The distinction the ticket is missing: availability lag vs existence gap

The ticket's two instances behave differently because they are two different objects.

| | **Availability lag** (every release) | **Existence gap** (G1, G2) | **Partial availability** (G3) |
| --- | --- | --- | --- |
| Is the change in the product? | ✅ yes | ☠️ **no** | ✅ yes, for some platforms |
| What closes the gap? | **time alone** — Play review, an ASC promotion | ☠️ **another merge.** Time closes nothing. | another merge |
| Is a third-person time-invariant sentence true? | ✅ yes, and stays true | ☠️ **no. False for every reader, forever, until the lift.** | ⚠️ true for some readers — which is what #1877 rule 2 forbids asserting |
| Already ruled? | ✅ #1877 rules 1, 2, 7 | — (this ticket) | ✅ #1877 rule 2, **permanently** |

✅ **This is the whole finding.** "Not yet available" is not one problem. The universal
case is already solved by time-invariance. The partial case is already forbidden by a
closed rule that does not expire. **The only residue is the existence gap — and it is not
a veto problem, it is a truth problem.**

Under #1877 rule 1 a sentence must be time-invariant; under rule 7 it must not address the
reader's installed app. *"Selftend can send one gentle daily reminder"* is false for every
reader on every platform today and will remain false until someone edits an array. There is
nothing to veto. **There is no sentence.**

And #2599 already ruled what the drafter does with a change that has no sentence:

> *"No sentence demotes to **spares**."* … *"denying would invert it, and would make
> forgetting a sentence silently delete news."*

✅ **So the existing rule, unamended, produces the correct behaviour.** The author of the
hold-out PR is the person who wrote the gate in the same diff; they know better than anyone
that no true sentence exists; they leave #2603's optional field empty; the bullet lands in
spares in front of a human. **Zero new machinery.**

---

## 3. The five options, priced

| | Option | Cost | Verdict |
| --- | --- | --- | --- |
| **1** | ✅ **No deferral. The lift PR writes its own sentence, at the release that makes it true.** | **One clause** added to the two lift recipes (`releasing.md` § *Post-release*, and G2's docblock which is currently the only place G2's recipe exists). No storage, no join, no sweep, no drafter change. | ✅ **Chosen** |
| **2** | Defer the sentence in a repo-side store, replayed at the lift release | A new file, a **cross-release** join key, a staleness problem with no deadline, and a sweep. ☠️ It re-imports the exact defect #2603 § 1 rejected candidate 3 for — *"a file has no absent rows"* — and `positioning.md:468`'s *"a list that size silently becomes permanent."* ⚠️ And a store of pending announcements waiting for a trigger is the embryo of a scheduled post: see § 5. | ☠️ **Rejected** |
| **3** | The lift PR carries a **pointer** (`Lifts #2491`); the drafter follows one hop to the build PR's sentence | Strictly dominated by 1. The same person, at the same moment, in the same field, types `Lifts #2491` instead of the sentence — then pays an extra API hop, a second failure mode, and gets a sentence written before the gate existed. | ☠️ **Rejected** |
| **4** | Announce at the build release **with a qualifier** ("coming once the build is live") | ☠️ Refused three times over by a closed ruling: #1877 **rule 1** bans any clause whose truth changes with the clock, **rule 2** bans per-platform availability, **rule 7** bans addressing the reader's installed app. Not this map's to reopen. | ☠️ **Rejected** |
| **5** | Never announce; accept the loss | Free, but loses real news — one gentle daily reminder the person opts into is genuinely user-facing. And it is **dominated by option 1, which is also free.** | ☠️ **Rejected** |

### ☠️ The one real failure mode option 1 must close

`picker.mjs`'s `SECTION_KINDS` has exactly three entries — `Features` → `feat`,
`Bug Fixes` → `fix`, `Performance Improvements` → `perf`. Everything else parses with
`kind: null` and is ineligible. And `release-please-config.json` carries no
`changelog-sections` key, so the defaults apply.

**Therefore a lift merged as `chore(reminders): lift the general hold-out` produces no
changelog bullet, no `#N` for route D to join on, and the news vanishes permanently.** The
existing recipe (`releasing.md:44-48`) says *"The lift is one edit plus its tests, in one
change"* and **names no commit type**. Measured: **zero lifts have ever happened**, so
there is no convention to inherit — the first one sets it, and a maintenance-flavoured
change invites `chore:`.

**The amendment, in full:**

> The lift ships as **`feat:`** (or `fix:` where the hold-out was itself a defect guard) —
> never `chore:` — and its PR description carries the user-facing sentence. The lift is the
> release at which the sentence becomes true, and it is the only release that can carry it.

That is the entire mechanism this ticket produces. It is one clause, in the place the
recipe already lives.

---

## 4. Where a deferred sentence would live — and why nothing needs to

The ticket is right that #2603's route has a storage problem: a PR description is *"written
once and never revisited"*, and route D joins on the **current release's** bullet `#N`, so
nothing the drafter reads at release *n+k* can see release *n*'s PR body.

✅ **Option 1 makes the storage problem disappear rather than solving it.** There is nothing
to store, because the sentence is never written early. The build PR writes no sentence
(there is no true one); the lift PR writes the sentence (there now is one). Every sentence
the drafter ever reads belongs to the release it is drafting. **The invariant #2603 relies
on — one release, one join, one PR body — is preserved exactly.**

⚠️ **The cost, stated honestly:** the sentence is thought twice and written once, and the
writer is not the best-informed person. The author who builds the gate has the diff on
screen; the author who lifts it has a three-line diff and must reconstruct what the feature
is. Measured against the alternative, this is cheap: the lift recipe already requires
opening `reminder-rollout.ts`, whose comments name the feature, the issue and the spec
section (`docs/reminders.md` § 3.4); and #2603 measured the median inter-release gap at
**1.06 days**, so "reconstruct later" is not the multi-week problem the framing assumes.
The alternative costs a permanent cross-release store to save one person one lookup.

---

## 5. If the gate never lifts

☠️ **Nothing sweeps it, and under option 1 nothing needs to — because nothing is stored.**
An unlifted gate produces no orphaned sentence, no stale record and no expiring state
anywhere in the drafter. The bullet that announced the hold-out went to spares at the build
release and was read by a human; that is the end of it.

**The hold outliving its reason is a real defect. It is not the drafter's defect.** Measured
today, the sweep that is supposed to catch it is leaking:

| Pending reveal | Named in `releasing.md`? | Open issue? |
| --- | --- | --- |
| G1 `general` reminder | ✅ | ✅ [#2494](https://github.com/Selftend/selftend/issues/2494) |
| G1 `dbt` reminder | ✅ | ☠️ **none** |
| G2 six DBT step tool ids | ☠️ **no** | ☠️ **none** |
| G3 iOS module gate | ✅ (§ 286) | ☠️ **none** |
| G3b beta mark | ✅ (§ 286) | ☠️ **none** |

**1 of 5 tracked.** `docs/releasing.md:40` predicted this in advance and the prediction has
already come true for four of the five.

⚠️ **Guardrail, and it decides the shape of any fix.** A sweep that *announces* on a timer
is forbidden: `AGENTS.md` refuses non-use-triggered contact and
[ADR-0004](../adr/0004-retention-by-return-not-engagement.md) refuses engineering the
wanting — *"nothing on any channel is triggered by non-use"* — and the map's own *Out of
scope* already rules the in-app variant dead (`registry.test.ts` refuses the `announce`,
`releaseNote` and `productUpdate` stems). **A deferred sentence is a record, not a scheduled
post**, and option 2's store is the one design on this page that could quietly become the
latter: a queue of written copy, each entry waiting for a trigger, with a mechanism that
fires them. ✅ Option 1 cannot become that, because it holds nothing.

**What a safe sweep looks like, if one is wanted:** a **test**, not a schedule. A test that
fails when an entry in `HELD_OUT_REMINDER_TARGETS` or `WITHHELD_STEP_TOOL_IDS` does not name
an **open** lift issue is a merge-time guard, not contact — the same shape as the copy gate
and the `verify` spelling guard this repo already runs. It makes the hold visible without
making anything arrive. ⚠️ That is a **new ticket outside this map**, not part of the
source-of-copy rule.

---

## 6. One mechanism with the veto, or two?

☠️ **Separate — and this is not a mechanism at all, which is the stronger answer.** Three
reasons, any one sufficient:

1. **The veto is keyed on scope; a hold-out is not a scope.** #2599's veto moves
   `analytics`, `measurement` and `sentry` under `DENIED_SCOPES`. The hold-out bullets carry
   `reminders`, `routines` and `modules` — the scopes that **must stay announceable**, since
   they are where the product's real news lives. There is no scope to add.
2. **The veto exists to work without the author's cooperation; this case has the author's
   full cooperation.** #2599: *"its whole harm case is the author who writes a good sentence
   for something that must not be said"* — the v0.3.0 Sentry pick, from an author who did
   not know the line was a hazard. Here the author **wrote the gate in the same diff**. The
   information is maximally present at exactly the moment #2603 asks for the sentence.
3. ☠️ **A time-bounded entry is a different object from a ban, and `positioning.md` says so
   in terms.** `:446` — a ban leaves when its *reason* dies, and *"this is the **opposite**
   object from a suppression list, which is a permission to violate and must expire."* An
   expiring veto entry **is** a suppression list. `:468` records the 22-entry one this
   project rejected, *"because a list that size silently becomes permanent."* Adding an
   expiring tier to the veto would put both objects in one table and lose the distinction
   the document was written to keep.

**They do not share a home. The veto's home is a repo-side constant the drafter reads. This
case's home is the empty optional field in a PR description — which is to say, no home at
all.**

---

## What this hands the spec ticket ([#2609](https://github.com/Selftend/selftend/issues/2609))

1. ✅ **No new drafter state, no new tier, no deferred store, no sweep.** #2599's
   *absence ⇒ spares* and #1877 rule 1 already produce the right behaviour for a change
   withheld from every reader.
2. ☠️ **The veto does not gain an expiring tier.** `positioning.md:446` makes an expiring
   entry a *suppression list* — the declared opposite object.
3. ✅ **The lift is the announcement.** The release that opens the gate carries the sentence,
   by the ordinary route D join. No cross-release storage is introduced.
4. ☠️ **The one clause the ADR must carry:** *a lift ships as `feat:` (or `fix:`), never
   `chore:`, and its PR description carries the user-facing sentence.* Without it the news is
   permanently invisible, because `SECTION_KINDS` admits only `feat` / `fix` / `perf` and the
   first lift in this repo's history sets the convention.
5. **Amendment targets:** `docs/releasing.md` § *Post-release: lift held-out reminder
   targets* (steps 1-3 gain the clause); `src/features/routines/step-tool-rollout.ts`'s
   docblock, which is currently the **only** written recipe for G2; and `AGENTS.md`'s
   sentence instruction from #2603, which should say that a change reaching nobody carries
   no sentence.
6. ⚠️ **G3 needs nothing from this ticket.** The iOS module gate is *partial* availability,
   already vetoed permanently by #1877 rule 2. When the gate opens, that is a change with its
   own PR and its own sentence — the same answer, arrived at by a rule that closed months ago.

## Newly visible, outside this map

- ☠️ **`WITHHELD_STEP_TOOL_IDS` is an undocumented, untracked hold-out.** Six DBT step tool
  ids, withheld since v0.18.0, absent from `docs/releasing.md`'s post-release checklist and
  from the issue tracker. Its lift additionally requires a **database migration** (the CHECK
  constraint in `supabase/migrations/20260912000000_routine_step_tool_allowlist.sql`), so it
  is the most expensive of the five pending reveals and the least visible.
- ⚠️ **Four of five pending reveals have no tracking issue** (§ 5). A merge-time test binding
  each hold-out entry to an open issue is the safe shape; a schedule is not.
