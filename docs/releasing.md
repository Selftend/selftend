# Branching And Releases

This doc defines the two-branch release flow: how everyday changes land, how a release is cut, and the invariants that keep versioning working. It implements the decisions from the [CI/CD release-flow map (#10)](https://github.com/Selftend/selftend/issues/10).

## Branch model

| Branch | Role                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`  | Integration. All feature PRs land here via **squash merge** (one Conventional Commit per PR).                                                                                            |
| `main` | Release / production. Default branch. Only receives the `dev→main` promotion PR, `hotfix/*` PRs, release-please's release PR, and the `main→dev` back-merge counterpart after a release. |

`main` stays the default branch because GitHub runs `on: release`, `schedule`, and `workflow_dispatch` workflows from the default branch, and release-please runs on `main`. New PRs therefore default to `main` in the GitHub UI — retarget them to `dev`.

## Everyday contributor flow

1. Branch off `dev`.
2. Open a PR into `dev` (retarget the base from `main` if GitHub defaulted it).
3. CI must pass (`verify`, `integration`, `e2e`) and the PR needs one approving review (maintainer may bypass the review, never the checks).
4. **Squash-merge.** The squashed commit title must be a Conventional Commit — it is the version and CHANGELOG signal release-please reads later.

## Cutting a release (`dev → main` promotion)

1. Open a PR from `dev` into `main` when ready to release.
2. Arm auto-merge with the **merge-commit** method:

   ```bash
   gh pr merge <n> --auto --merge
   ```

3. Once required checks and review clear, it lands as a merge commit on `main`.
4. release-please reacts to the push: it opens or updates its release PR (version bump + CHANGELOG), the workflow bot-approves it and arms auto-merge, and merging it tags `vX.Y.Z` and publishes a GitHub Release under the `RELEASE_PLEASE_TOKEN` PAT.
5. The pipeline runs: production database migration, then web + edge functions + Android in parallel. **Everything goes live automatically**; Android trails only by Google's review — see [How Android reaches users](#how-android-reaches-users).

**Never squash the promotion PR.** Squashing collapses the per-PR Conventional Commits into one commit and loses the version/CHANGELOG signal. release-please traverses `main`'s full commit graph, so the squash commits carried in by the merge commit are parsed individually; the merge commit's own subject does not need to be conventional. To keep the wrong button unavailable, the repo allows only the two merge methods that are actually used: squash (dev PRs, release PR) and merge commit (promotion and hotfix PRs) — rebase merge is disabled.

## How Android reaches users

The pipeline releases the AAB to the Play **production** track as `inProgress` with a **`rollout` of 0.2** — automatic, but served to 20% of users rather than all of them.

**A merge to `main` goes live automatically once Google's review clears.** There is no human gate on the release itself; nothing needs pressing for it to start reaching users.

The closed testing tracks (`Groups`, `alpha`) receive the same build in the same pipeline run, so testers are never left behind production.

### Getting from 20% to everyone

A capped rollout does **not** climb on its own. The remaining 80% get the build one of two ways, and this is the one piece of the pipeline that still needs a person:

- **Bump the rollout in Play Console** once Sentry and Android vitals look clean — the fastest path, and the one to use when a release is worth watching.
- **Ship the next release**, which supersedes it. If `releaseStatus` is set back to `completed` first, that next release goes to 100% directly.

The cap was introduced deliberately for the first release under this pipeline (72 commits, 12 migrations — the largest since v0.6.1). **The intended end state is `completed`**, per the decision on #371 that there should be no human gate. Flip `eas.json`'s production profile back once a release has been through cleanly, and update `test/android-release-track.test.ts` in the same change — it pins whichever mode is current.

### What this costs, and what to watch

The trade is throughput against blast radius, and the consequences should not be rediscovered mid-incident:

- **A bad build reaches 20% of users** before anyone reacts — capped, not prevented. At `completed` it is 100%.
- **Sentry and Android vitals are the only early warning.** Watch them after a release.
- **Play has no rollback.** You can **halt** a rollout so no _further_ users receive the build, but everyone already updated stays on it. The only real remedy is shipping a higher versionCode forward — see the [Rollback runbook](#rollback-runbook).
- **Review latency still applies**, so Android trails web and the database by however long Google takes. Keep migrations forward-compatible: the currently-installed Android build must keep working against a migrated database. (Verified for the 0.6.1 client across the 12 migrations in the first release — `program_widget_task_status` dropped its three-argument signature, and the four-argument replacement defaults the new parameter, with an integration test per leg that omits it.)

The neighbouring `releaseStatus` values in `eas.json` are `completed` (live to everyone, the intended end state) and `draft` (uploaded, serving nobody, awaiting a human press). `halted` is the kill switch for a rollout already under way, not a release mode.

### How testers stay ahead (closed tracks)

Two mechanisms, floor and ceiling (#374):

- **Floor — every production release mirrors onto `Groups` + `alpha`** in the same pipeline run, so the testing tracks always hold at least the bits users have. This is permanent, not scaffolding.
- **Ceiling — dispatch `Android Play closed-testing release (dev)`** (`android-testing-release.yml`) to build `dev` and release it to `Groups` (mirrored onto `alpha`), putting testers **ahead** of production. Manual dispatch, deliberately: a per-merge trigger would burn ~90-minute builds that mostly cancel each other, and a nightly one pays the same on idle days. Dispatch when `dev` holds something worth testers' attention.

versionCode needs no management: every build draws from one remote counter, so a new dev build always outnumbers the newest production release and Play serves testers the dev build immediately.

**The precondition:** testing builds ship with the **production backend** (testers keep their real accounts), and `dev` may carry migrations production has not run. The workflow's preflight lists every unpromoted migration; if the build's client code depends on one of them, promote first and dispatch after the release. Pointing testing builds at staging (severs testers from their accounts — one package id, one backend per device) and a second package id (a second Play app to operate) were considered and rejected at the current tester scale.

### The migration forward-compatibility rule

Stated once, load-bearing twice (release latency and rollback both depend on it):

> **Every migration in a release must keep the previous app version working.** Expand, don't break: add columns/functions alongside what the live client reads, default new RPC parameters so old signatures still resolve, and remove the old shape only in a _later_ release, once no supported client reads it.

Why: the database migrates **first** and unconditionally, Android trails by Google's review latency, and users trail further by auto-update lag — a halted rollout leaves people on the old client _indefinitely_. The old client talking to the new schema is therefore the normal state of the world after every release, not an edge case. (Precedent: `program_widget_task_status` kept its three-argument path callable, with an integration test per leg, while the four-argument replacement shipped.)

## How iOS reaches users

**It doesn't, automatically — and that is the design.** `deploy-ios` builds the IPA and uploads it to **TestFlight**; nothing reaches the App Store until a human promotes that build in App Store Connect.

This is deliberately unlike Android. There is no iOS equivalent of Play's staged rollout, so there is no percentage to cap — the only available safety valve is the promotion step itself, so we keep it manual. Internal testers get the build with no Beta App Review; external testers need Beta App Review on the first build of each version. TestFlight builds expire **90 days** after upload.

Apple's internal-tester ceiling is 100, but internal testers must be App Store Connect users and an **Individual** enrolment caps App Store Connect at 50 additional users — so on the current enrolment the real ceiling is about **51**, not 100. External testing (up to 10,000 via a public link) is out of scope for now: Beta App Review checks guidelines, and the app offers Google sign-in, which engages **Guideline 4.8** and would require offering a privacy-preserving equivalent such as Sign in with Apple.

Consequence for [the migration forward-compatibility rule](#the-migration-forward-compatibility-rule): iOS is now a **second** trailing client, and a slower one than Android — a build sitting unpromoted in TestFlight means those users stay on the old client indefinitely. The rule doesn't change; it just binds harder.

### Where the build happens

`ios-release.yml` compiles on a GitHub-hosted **`macos-26`** runner with `eas build --local`, then uploads with `eas submit --path` — the same shape as the Android job, which also builds locally rather than on EAS's workers.

This costs nothing. GitHub's docs are explicit that "use of the standard GitHub-hosted runners is free and unlimited on public repositories", and this repo is public. The `$0.062/min` macOS rate that an earlier revision of this pipeline was designed around is **private-repo pricing** and never applied here. Two rules keep it that way:

- **Never a `-large` or `-xlarge` label.** Larger runners are billed even on public repositories.
- **Pin the image; never `macos-latest`.** That alias moved from macOS 15 to macOS 26 during 2026 and will move again, which would change the compiler under a release without a diff. The job additionally checks `xcrun --sdk iphoneos --show-sdk-version` and fails fast below 26, because Apple rejects uploads built against an older SDK — and rejects them _after_ the build, having consumed a build number.

Building locally also sidesteps Expo's free tier entirely: its **15 iOS builds/month**, 1 concurrency and low-priority queue only apply to builds run on EAS's infrastructure, and local builds are not submitted to it. GitHub allows 5 concurrent macOS jobs on the free plan.

One consequence to know: **`eas.json`'s `ios.image`, `node`, `fastlane` and `cocoapods` fields are ignored for local builds.** The runner's toolchain is what ships. Setting them there looks like a pin and does nothing, which is why `ios.image` is absent and the SDK check exists instead.

### Checking iOS without a device

`iOS simulator smoke test` (`ios-simulator-check.yml`, **manual dispatch**) builds the app for the iOS Simulator on a `macos-26` runner, boots a simulator, installs, launches it, and fails if the app dies or leaves a crash report. A simulator build is **unsigned**, so it needs no certificate, no provisioning profile and no Apple account — and the runners are free on this public repo.

It exists because the app shipped on Android and web for months without ever executing on an Apple platform, and the maintainer has no iPhone new enough for TestFlight (the app requires **iOS 16.4**, from the RN 0.86 / Expo SDK 57 podspecs). Without it, the first people to run the app on iOS would be Apple's reviewers.

Dispatch it after any change that could plausibly break startup on iOS — a dependency bump, an SDK upgrade, a config-plugin change — and before an App Store submission.

**What it proves:** the app builds for iOS, installs, launches, stays alive and renders. That covers the whole class of iOS-only startup crashes, the likeliest rejection for an app new to the platform.

**What it does not prove, and must not be read as proving:** Sign in with Apple and push notifications. Both need real hardware and a signed build. A green run narrows what is unknown; **it is not device QA**.

It needs the `production` environment for the app's public `EXPO_PUBLIC_*` config, and fails fast if any of it is missing — otherwise the app would boot to its "Supabase not configured" state and the test would pass without exercising anything. The run uploads a launch screenshot as an artifact, which doubles as a starting point for App Store listing images; note those must be captured at Apple's exact device sizes, so pin the device input rather than accepting the default newest-available iPhone.

### One-time Apple setup (before flipping the switch)

`deploy-ios` no-ops with a notice until the `IOS_RELEASE_ENABLED` variable is `true`, so it cannot redden a release while this is outstanding. All of the following needs payment, Apple 2FA, or an interactive Apple login, so none of it can be automated:

1. **Apple Developer Program**, $99/year — <https://developer.apple.com/programs/enroll/>. **This is the spend and identity decision [`docs/internal-testing.md`](internal-testing.md#ios-testflight-note) defers**, so settle it there first: an Individual enrolment avoids the D-U-N-S requirement but publishes the maintainer's **legal name as the App Store seller**; an organization enrolment shows the organization name and may qualify for Apple's nonprofit fee waiver. On an Individual account only the Account Holder can mint signing credentials.
2. **Register the App ID** at Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App: explicit bundle ID `org.vasilyoshev.selftend`, with the **Push Notifications** capability enabled (the app uses APNs — see `src/lib/push-token.ts`). App Store Connect will not offer an unregistered bundle ID in the next step.
3. **App Store Connect app record** for `org.vasilyoshev.selftend`. Its numeric identifier (App Information → General) becomes the `ASC_APP_ID` variable.

   > Apple labels that number "**Apple ID**", which collides with the term for your account. They are unrelated: the account Apple ID is an **email address** and is a login; this one is a numeric app identifier and is never a login. Entering the number where eas-cli asks for an Apple ID yields `Invalid username and password combination`.

4. **`npx eas-cli credentials --platform ios`**, run once interactively (`npx eas-cli login` first if needed). It needs an Apple ID **email**, password and 2FA. **CI cannot do this step**: eas-cli mints a distribution certificate only in interactive mode and throws `MissingCredentialsNonInteractiveError` otherwise. (Provisioning profiles _can_ regenerate non-interactively once the ASC key is on EAS; the certificate cannot.) Do all three of its menu items:
   - **Build Credentials → All** — distribution certificate + provisioning profile.
   - **App Store Connect: Manage your API Key** → "Set up your project to use an API Key for EAS Submit". When it asks for a role, choose **`APP_MANAGER`**, not the `ADMIN` default: App Manager can upload builds and manage TestFlight, which is all `eas submit` does, while Admin adds user, agreement and finance powers the pipeline never uses. The app record already exists by this point, which is the one thing App Manager cannot create. Escalating later is a few seconds' work; over-privileging a key used by automation on every release is not worth it.
   - **Push Notifications: Manage your Apple Push Notifications Key** — without this, iOS push silently never arrives, even though the client already asks for an iOS token.

   All three store on EAS, so **no `.p8` is ever downloaded or held anywhere.**

5. Set variables `IOS_RELEASE_ENABLED=true`, `ASC_APP_ID`, `APPLE_TEAM_ID` on the `production` environment. `EXPO_TOKEN` already exists for Android, and stays the only secret involved.
6. In TestFlight, create the internal tester group with **Enable automatic distribution** checked, and fill the test information. Builds then land in the group on arrival, EAS uploads included — Apple's carve-out is Xcode **Cloud** builds, not "anything not uploaded by Xcode". **That checkbox cannot be changed after the group is created**, so get it right at creation. Internal testers must be App Store Connect users, and you invite them from the group page.

Note on step 5: `ASC_APP_ID` and `APPLE_TEAM_ID` are GitHub _variables_, not secrets (neither value is sensitive), and they are variables purely so no Apple identifier is committed to this repository. They cannot be referenced from `eas.json` as `"$ASC_APP_ID"` — eas-cli interpolates only `ascApiKeyPath`, `ascApiKeyIssuerId` and `ascApiKeyId`, so a placeholder there reaches validation as a literal string and fails `ascAppId`'s digits-only check, _after_ the build has been spent. The workflow therefore writes both values into `eas.json` with `jq` immediately before submitting.

Two failure modes are already closed in config, both pinned by `test/ios-release-config.test.ts`: `ios.config.usesNonExemptEncryption: false` (absent, a build uploads and then sits as **Missing Compliance**, untestable, and `--non-interactive` only _warns_), and the runner SDK check (Apple has required the iOS 26 SDK for uploads since 2026-04-28).

## Hotfixes

For an urgent production fix, branch `hotfix/*` off `main`, use a `fix:` Conventional Commit, and open a **merge-commit** PR straight into `main` through the normal checks. release-please cuts a patch release from it, and the full release pipeline (migrate → deploys) runs. A back-merge returns the fix and the version bump to `dev` after the release.

## Back-merge (automated)

On every `release: published`, `back-merge.yml` opens a **`main → dev` sync PR** via the PAT. Review it and merge it as a **merge commit** — it carries the version/CHANGELOG bump and any hotfix commits back into `dev`, so `dev` never drifts and the next promotion PR stays conflict-free. Merge conflicts (typically `package.json` / `CHANGELOG.md`) surface on this PR and are resolved there.

## Rollback runbook

Two speeds: mitigate first, then make the fix permanent. The database is
**forward-only** — never roll schema back under a live app.

**0. Detection — what tells you a release is bad:**

- **Sentry** is the alarm: the release-tagged issue alert is live and fires on
  new crash groups from a fresh release. It is the only signal fast enough to
  beat a rollout.
- **Android vitals** (Play Console → Quality) confirm hours-to-days later;
  store reviews trail further. Neither is a first alert.
- After every release, watch Sentry until the rollout is bumped to 100% — the
  bump is the deliberate human act that says "the release looked clean".

**1. Immediate mitigation (minutes):**

- **Web** — redeploy the previous good version to the Cloudflare Worker: either **Cloudflare dash → Workers → `selftend` → Deployments → roll back** to the prior version (instant, no rebuild), or `workflow_dispatch` the `Web production deploy` workflow (`web-deploy.yml`) / re-run `release.yml` on the prior release `tag`.
- **Android** — releases go out as a **staged rollout** (currently 20%, see `eas.json`), so there _is_ something to stop. In order:
  1. **Still in review?** Remove it from review in Play Console before it reaches anyone.
  2. **Already rolling out? Halt the rollout on the production track first.** This is the fastest mitigation and it caps the damage at whoever has already updated — do it before anything else. Halt the closed tracks too if testers are affected.
  3. **Then ship forward.** Play has no un-release for a versionCode: everyone who already updated stays on the bad build until a **higher versionCode** supersedes it.

  Halting also freezes the rollout for the good case — if you halt and then decide the build is fine, you resume or bump it in Play Console rather than re-releasing. Once `releaseStatus` becomes `completed` (see [How Android reaches users](#how-android-reaches-users)), step 2 stops capping anything: the build is already at 100% and halting only stops _new_ installs.

- **Database** — do nothing schema-wise. For genuine data corruption only: restore from the daily `db-backup.yml` backup (accepts up to ~24h data loss unless Supabase PITR is enabled — recommended).

**2. Permanent fix (hours):**

1. `git revert` the offending commit(s) on a branch off `dev` → squash PR into `dev` (normal checks).
2. Promote `dev → main` as usual → release-please cuts a new **patch** release → the pipeline ships it.
3. Keep the bad tag/Release in history — the revert produces a new, higher version; nothing is deleted.

For a production emergency where `dev` carries unrelated unreleased work, use the [hotfix path](#hotfixes) instead of a revert-through-promotion.

## Store metadata drift

Selftend's Apple **age-rating declaration** is mirrored in the repository at [`store/apple-advisory.json`](../store/apple-advisory.json), and `store-metadata-drift.yml` pulls the live values from App Store Connect every Monday and fails if they no longer match.

It exists because the declaration used to live only in a web form: two manual overrides sat on top of a `FREQUENT_OR_INTENSE` medical answer and rated the app **18+ in 173 countries** for an unknown length of time, with no diff to review and nothing in the repository to grep. Corrected 2026-08-14 — the rating is now 13+.

The job needs **no new credentials**: the App Store Connect API key already lives on EAS, so `EXPO_TOKEN` plus the `ASC_APP_ID` / `APPLE_TEAM_ID` variables from step 5 above are all it uses. It is gated on `IOS_RELEASE_ENABLED` exactly as the iOS release is, and **skips with a notice** rather than failing while the Apple setup is incomplete.

It is deliberately **not a required check** — it reads a system a human can legitimately change, so a red run is a question rather than a verdict. [`store/README.md`](../store/README.md) explains how to decide which side is wrong; the rules that _are_ a merge gate (no manual override, medical never `FREQUENT_OR_INTENSE`) run in `verify` via `test/store-advisory-invariants.test.ts`.

⚠️ **Never run `eas metadata:push` from this repository.** `store.config.json` is gitignored precisely so a partial metadata file cannot be pushed at an app under review.

## Invariants

1. Never squash the `dev→main` promotion PR or a `hotfix/*` PR — merge commits only.
2. The tag and GitHub Release are always created by the PAT (`RELEASE_PLEASE_TOKEN`), never `GITHUB_TOKEN` — `GITHUB_TOKEN`-authored events do not trigger `on: release` workflows, so deploys would silently not run.
3. The maintainer may bypass the review requirement, never the required checks.
