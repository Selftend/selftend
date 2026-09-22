# Pinning a fixed R8, the 25% floor, and what the Play card reads after Expo SDK 58

Research for [Is a fixed R8 part of this change, can it be pinned from here, and what does the card read after SDK 58 if we do nothing?](https://github.com/Selftend/selftend/issues/2696), under map [R8 optimisation passes](https://github.com/Selftend/selftend/issues/2673).

Builds on [#2681](https://github.com/Selftend/selftend/issues/2681) (the `r8.json` read out of the shipped `v0.23.0` AAB) and [#2678](https://github.com/Selftend/selftend/issues/2678) (SDK 58 already swaps the ProGuard file).

**Everything below was checked on 2026-09-22.** Google's vitals `code-optimization` page carries `Last updated 2026-09-21 UTC`, so this area is moving weekly — re-read it before acting on a number or a date.

☠️ **Nothing here was built and nothing here was run on a device.** No `expo prebuild`, no Gradle invocation, no AAB. Every claim below is a quotation from a primary source, a read of a file on disk, or is labelled an inference.

## Item 3 — the 25% floor is **per category**. Confirmed from Google's own page

This is the item the map said could de-escalate everything. **It does not.** The per-category reading the map carries is correct, and the table on Google's page settles it in a way the prose alone cannot.

The prose sentence is genuinely ambiguous read on its own — [Play Console technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799), verbatim:

> From February 2027, apps and games on Google Play will need to meet minimum optimization requirements. You will need to achieve a minimum of 25% optimization, obfuscation and shrinking for any app uploads to Play Console. We understand not every app or game makes heavy use of DEX code, and so this requirement will only be enforced where you have non-negligible DEX sizes. You can view your DEX size, as well as your optimization percentages for each app bundle you upload on the app bundle explorer within Play Console.

The table immediately under it does not leave it ambiguous. Three rows, one per category, each carrying its own `25%`, in two columns (Games, Apps):

|                       | Games                       | Apps                       |
| --------------------- | --------------------------- | -------------------------- |
| **Code Optimization** | Games with > 50 MB DEX code | Apps with > 10 MB DEX code |
| Obfuscation           | 25%                         | 25%                        |
| Optimization          | 25%                         | 25%                        |
| Shrinking             | 25%                         | 25%                        |

Three separate rows with three separate figures is not how an aggregate is published, and the page's own follow-up sentence uses the plural — _"You can use any tool, such as R8 or another app shrinker to achieve the minimum 25% **thresholds**."_ There is no aggregate score anywhere on the page, and the app bundle explorer the sentence points at reports the three categories separately (this project's own reading, #2335: `Obfuscation 93%`, `Optimisation -`, `Shrinking -`).

**So: optimisation at 0% fails on its own, regardless of obfuscation ≈91% and shrinking ≈91%.** Finding A's severity stands. Ticket 7's calculus does not change back.

**The stated consequence**, also verbatim, from the same page's FAQ ("Are these requirements optional?"):

> All of the requirements posted in this page are not optional. Not meeting a requirement can affect an app's visibility and publishing capabilities on Google Play.

Note the shape of it: _"can affect"_, and _"visibility and publishing capabilities"_ — not a stated hard upload rejection. It is a discretionary consequence with a date, which is more than a suggestion and less than a wall. ⚠️ Google does not publish a mechanism, a warning period, or an appeal path for the optimisation category. That is unknown, not absent.

**The DEX floor applies to this app, twice over.** Play's page says _"Apps with > 10 MB DEX code"_; [Android vitals — DEX code optimization](https://developer.android.com/google/play/vitals/code-optimization) gives the measurement rule: _"Apps: Bundle contains at least 10 MB of DEX code measured as uncompressed size"_, with the command `unzip -l <yourapp>.aab | grep -E '\.dex$' | awk '{sum+=$1} END {print sum}'`. This project's last locally measured `bundleRelease` (`docs/releasing.md`, 2026-09-16, optimised-shrinking build) carries **20,177,600 B of uncompressed DEX across 3 files** — 2× the floor. There is no version of this in which the requirement does not apply.

One more sentence from the same vitals page that bears on every other item here:

> For apps built with the latest patch of AGP version 8.10 or higher, these percentages are pulled from the included `r8.json` file. For lower versions of AGP or where the `r8.json` file isn't included, the percentages are calculated from the `mapping.txt` file if included, or using DEX heuristics if the mapping file isn't available.

## Item 1 — R8 **can** be pinned independently of AGP, and a config plugin **can** express it

### The mechanism is a classpath addition, not a dependency substitution

⚠️ **The ticket body's premise is wrong on this point.** It says _"the documented mechanism is a dependency substitution in `settings.gradle` / the root `build.gradle`"_. It is not a substitution. Both primary sources describe **adding `com.android.tools:r8:<version>` to a buildscript classpath**, and letting Gradle's newest-wins conflict resolution displace the version AGP drags in transitively.

[R8's own README](https://r8.googlesource.com/r8/+/refs/heads/main/README.md), § _Replacing R8 in Android Gradle plugin_, verbatim:

> Android Gradle plugin (AGP) ships with R8 embedded (as part of the `builder.jar` from `com.android.tools.build:builder:<agp version>` on https://maven.google.com).
>
> To override the embedded version with a prebuilt R8 stable or `-dev` version, merge the following into the top level `settings.gradle` or `settings.gradle.kts`:
>
> ```
> pluginManagement {
>     buildscript {
>         repositories {
>             google()
>             mavenCentral()
>         }
>         dependencies {
>             classpath("com.android.tools:r8:<version>")
>         }
>     }
> }
> ```

Google says the same thing on the Android developer site, and — decisively for this project — **scopes it to exactly our AGP range**. [Use R8 Configuration Analyzer](https://developer.android.com/topic/performance/app-optimization/r8-configuration-analyzer), § _For AGP 9.2 and earlier_:

> For AGP 9.2 and earlier, update your local copy of R8 to the latest version by adding it as a classpath dependency to your project's `settings.gradle` or `settings.gradle.kts` file:
>
> ```
> pluginManagement {
>   repositories {
>     google()
>     mavenCentral()
>   }
>   buildscript {
>     dependencies {
>       // Update to a more recent R8 version.
>       classpath("com.android.tools:r8:9.4.14")
>     }
>   }
> }
> ```
>
> This uses the latest version of R8 including the latest configuration analyzer, and can just be done temporarily when analyzing your R8 configuration.

AGP 8.12.0 is comfortably inside _"9.2 and earlier"_. **So yes: pinning R8 independently of AGP is a supported, documented operation on this toolchain.**

☠️ **On compatibility, Google's own example is the strongest evidence available and it is a striking one.** The snippet pins **R8 9.4.14** under an AGP of **9.2 or earlier** — a major-version-newer R8 under an older AGP, published by the team that owns both. Against that, moving 8.12.14 → a later 8.12.x patch is far more conservative than what Google itself documents. That is not a guarantee (Google's snippet is framed as a temporary analysis aid, not a shipping configuration), but it removes "a newer R8 with an older AGP is inherently unsafe" as a blocking objection.

### ⚠️ One wrinkle nobody has checked, and it is Expo-shaped

`pluginManagement` does not have a `buildscript` member. Gradle's [`PluginManagementSpec`](https://docs.gradle.org/current/javadoc/org/gradle/plugin/management/PluginManagementSpec.html) API (Gradle 9.7.1) is exactly `repositories`, `getRepositories`, `resolutionStrategy`, `getResolutionStrategy`, `plugins`, `getPlugins`, `includeBuild` ×2. No `buildscript`.

What the snippet therefore does, in the Groovy DSL, is resolve `buildscript { }` **owner-first to the enclosing settings script**, i.e. to [`Settings.getBuildscript()`](https://docs.gradle.org/current/javadoc/org/gradle/api/initialization/Settings.html) — _"the build script handler for settings … manage the classpath used to compile and execute the settings script"_ (since Gradle 4.4). The R8 jar lands on the **settings script's** buildscript classpath, not on `pluginManagement`'s.

That matters here because of how the Expo template applies AGP. From `node_modules/expo/template.tgz` → `package/android/build.gradle`, verbatim and complete at the top:

```groovy
buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}
```

and `package/android/app/build.gradle:1` is `apply plugin: "com.android.application"`. **AGP is on the root project's buildscript classpath, applied the legacy way — not through the plugins DSL and not through `pluginManagement`.**

Google states no precondition about how AGP is applied, and the settings buildscript classloader is the parent of project buildscript classloaders, so the override is expected to reach AGP's R8 anyway. ⚠️ **That last step is reconstruction, not documentation, and it was not tested** — no Gradle run was made here. **If the settings-script route does not take on this layout, the fallback is one line in the root `android/build.gradle` `buildscript { dependencies { … } }` block shown above**, which is unambiguously the classpath AGP's `builder.jar` is resolved on, and whose `repositories` already include `google()` and `mavenCentral()`. Either way the lever exists; which of the two to use is a question a single local `bundleRelease` answers by reading `r8.json`'s `version` field, and it must be answered that way before anything ships.

### Can a config plugin express it? **Yes — the mod exists and is already installed**

The ticket says the existing mods _"reach `gradle.properties` and `app/build.gradle` only"_. That is true of **this project's** mods and false as a statement about what is available.

- This project's mods, `app.config.ts:2`: `import { withAndroidManifest, withGradleProperties, type ConfigPlugin } from "expo/config-plugins"` — two mods, `withDevelopmentCleartextTraffic` and `withReleaseGradleJvmArgs`. Correct as far as it goes.
- `expo/config-plugins` is a one-line re-export of `@expo/config-plugins` (`node_modules/expo/config-plugins.js`: `module.exports = require('@expo/config-plugins');`).
- The installed `@expo/config-plugins@57.0.5` exports, from `build/index.d.ts:26`: `withAndroidManifest, withStringsXml, withAndroidColors, withAndroidColorsNight, withAndroidStyles, withMainActivity, withMainApplication, withProjectBuildGradle, withAppBuildGradle, **withSettingsGradle**, withGradleProperties`. `withSettingsGradle` is defined at `build/plugins/android-plugins.js:185` and its base mod reads and writes `Paths.getSettingsGradleFilePath(projectRoot)` (`build/plugins/withAndroidBaseMods.js:417`).

**So both candidate targets — `android/settings.gradle` and `android/build.gradle` — are reachable from a config plugin today, with no new dependency.**

### ☠️ But the seam is worse than #2678's, and that is the real cost

[#2678](https://github.com/Selftend/selftend/issues/2678) chose an **anchor-free** seam for the ProGuard swap: append `apply from:` at EOF, which cannot silently no-op. **No such seam exists for an R8 pin.** Both targets need an insertion at the _head_ of a file, inside or before an existing block:

- `android/settings.gradle` opens, verbatim from the template, with `pluginManagement {` on line 1 containing two `providers.exec` + `includeBuild` pairs. Gradle requires `pluginManagement` to be the first block — [Working with Plugins](https://docs.gradle.org/current/userguide/plugins_intermediate.html): _"The `pluginManagement{}` block can be used in a `settings.gradle(.kts)` file, where it must be the first block in the file"_ — so a second one cannot simply be appended, and nothing can be placed above it either. The plugin must inject a `buildscript { … }` **into** the existing block. ✅ The one consolation is that the anchor is the file's own first line, `pluginManagement {`, which is about as stable as an anchor gets.
- `android/build.gradle`'s `buildscript { dependencies { … } }` is the first statement in the file; an EOF append does not join it.

The failure mode of a missed anchor is a **silent no-op** — exactly the shape #2678 ranked second-best and Sentry's own mods in this repo exhibit (`warnOnce` + return unchanged). It is recoverable with the same discipline #2678 named: compare before/after and `throw` when the string did not change, per the `perawallet` prior art. But it is a strictly more fragile change than the ProGuard swap, in a file neither this project nor `expo-build-properties` has ever touched, and it is a **second** permanent patch to a generated tree.

⚠️ And unlike the ProGuard swap, this one has **no upstream removal trigger**. #2678 established that SDK 58 retires the ProGuard patch for us. Nothing retires an R8 pin: it must be actively re-checked at every SDK bump, and a stale pin silently holds R8 _back_ once the SDK's own AGP ships a newer one.

## Item 2 — the trap holds. A pin alone converts an unreadable card into a failing one

The chain, link by link, with what each rests on:

1. **Today the pass does not run.** `isOptimizationsEnabled: false` in the shipped `v0.23.0` AAB's `r8.json` (#2681, read from the artefact). Cause: the template's `getDefaultProguardFile("proguard-android.txt")`, which AGP generates with `-dontoptimize`; `-dontoptimize` is unconditional and cannot be undone by appending rules (#2678, from R8's `ProguardConfiguration.isOptimizing()` and AGP 8.12.0's `ProguardFiles.createProguardFile`). **Verified, twice, from artefacts.**
2. **Therefore `noOptimizationPercentage` is truly 100.00** — nothing is optimisation-allowed — and R8 8.12.14 prints it as `-65.72` through the 32-bit overflow (#2681, reproduced numerically). **Verified.**
3. **Play discards the whole `stats` block today** because R8 8.12.14 < 8.12.19 and R8's own parser nulls it (#2681, from `R8BuildMetadataImpl`), so Play falls back to `mapping.txt`, which knows obfuscation and nothing else. That is why Optimisation and Shrinking read `-` while Obfuscation reads a number. **Verified, and corroborated by the 93% ≠ 90.98% discrepancy.**
4. **A fixed R8, with no other change, removes only step 3.** `stats` survives, `noOptimizationPercentage` resolves to a clean `100.00`, and the card prints **Optimisation 0%**. ⚠️ The `100 − noXPercentage` transform is #2681's reconstruction, not documented by Google — but it is the only reading that also explains the `noShrinkingPercentage: 100.0` → `Shrinking (0%)` observation in [onyx-intl/OnyxAndroidDemo#141](https://github.com/onyx-intl/OnyxAndroidDemo/issues/141).
5. **0% is below 25%, per category, on an app 2× over the DEX floor** — established above from Google's page, not from the map's summary of it.

**The chain holds. The ruling stands: a fixed R8 and the ProGuard swap land together, or neither does.** A pin on its own has no upside at all — it does not make the app smaller, faster or safer; its only effect is to let Play read a number that is currently hidden, and that number is a failing one.

⚠️ **The converse is not automatic either, and no ticket on this map has said so.** The swap makes the pass _run_; it does not guarantee the _percentage_ clears 25%. `noOptimizationPercentage` measures the share of items R8 was not allowed to optimise, which is driven by this project's keep rules — `-keep class expo.modules.notifications.** {*;}` and friends. The most defensible estimate available is by analogy with the same AAB's sibling figures, `noObfuscationPercentage: 9.02` and `noShrinkingPercentage: 8.97` (≈91% each), since largely the same keep rules drive all three; that would land optimisation far above 25%. ☠️ **That is an inference and nothing more.** The number is knowable exactly, from one local `bundleRelease` and one `unzip -p`, before anything ships — and it should be read rather than assumed, because the whole case for the change rests on it.

## Item 4 — ☠️ **No. A fixed R8 is not "just the arithmetic."** The answer is no, and the ticket's suspicion was right

The 8.12 release line's full log between `8.12.14` and `8.12.30` was retrieved from `https://r8.googlesource.com/r8/+log/refs/tags/8.12.14..refs/tags/8.12.30?format=JSON&n=200` — **43 commits, `"next": null`, i.e. the complete range, not a truncated page.**

**First, what was published.** ⚠️ **R8 is not on Maven Central at all** — `https://repo1.maven.org/maven2/com/android/tools/r8/` returns 404. It is published to Google's Maven. From `https://dl.google.com/dl/android/maven2/com/android/tools/r8/maven-metadata.xml`, the **entire** published 8.12 line is **`8.12.14`, `8.12.22`, `8.12.28`, `8.12.30`** — four builds. `8.12.19` itself was never published; `8.12.22` is the lowest published build that contains the fix, which is what #2681 said. (`8.12.31` is tagged in git but not published.) The 8.13 line is `8.13.6, .17, .19, .21, .22, .23`; **there is no 8.14, 8.15 or 8.16 at all** — the line jumps 8.13 → 9.0.

**The stats fix is exactly one commit**, `cd1e2397eb`, "Fix overflow in R8 stats metadata (b/436805211)", first tagged **8.12.19**. Its patch touches two files, `R8StatsMetadataImpl.java` and one `assert` hook in `ApplicationWriter.java`, and the substance is replacing `(float) (count * 100 * 100) / itemsCount` with a divide-first form plus a zero guard. **Nothing outside the metadata package; zero effect on compiled output.** That part of the story is exactly as #2681 told it.

**But it does not travel alone.** Getting to the lowest published build that contains it, `8.12.22`, also brings, each with a tracker id and a paired "Reproduce…" test commit:

| Tag     | Change                                                                               | Area                                                       |
| ------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 8.12.15 | Strip compilation metadata from build metadata (b/433551594)                         | metadata API — _removes_ `R8CompilationMetadata`           |
| 8.12.16 | Account for default interface methods in subclasses in bridge hoisting (b/369040938) | **bridge hoisting**                                        |
| 8.12.17 | Fix race in horizontal merging leading to nondeterministic art profile (b/434861604) | **horizontal class merging**, baseline-profile determinism |
| 8.12.18 | Fix class merging bug with min API<N and default library methods (b/435466316)       | **class merging**                                          |
| 8.12.20 | Fix `ArrayIndexOutOfBoundsException` in `EnqueuerMockitoAnalysis` (b/437005995)      | crash fix, Enqueuer                                        |
| 8.12.21 | Fix error when exception value used directly in invoke/range (b/438933684)           | codegen crash fix                                          |
| 8.12.22 | Don't outline `<clinit>` for `android.graphics.SurfaceTexture` (b/441137561)         | **outlining**                                              |

Going further, to `8.12.30`, adds **enum unboxing** (b/446814391, a `VerifyError` fix), **DEX code-object deduplication disabled for `invoke-super` code** (b/445349082 — size-affecting), **dead-store elimination** (b/445967247), Kotlin `$$forInline` handling (b/446714233), an API-evolution outlining fix (b/461737070), and a Kotlin-metadata-jvm bump to 2.2.10.

**The qualifier that matters, though:** every one of those is a **correctness repair that makes R8 do less, or do it right**. Across all 43 commits there is **no new optimisation, no new pass, no default flipped on, and no change to keep-rule parsing, interpretation or repackaging**. Inlining is touched only by two commits that delete already-dead bookkeeping (diffs read: `PrunedItems.fullyInlinedMethods` and `compressInliningPaths()`, both unused) — no inlining decision changes. That is consistent with R8's release-branch model, which is enforced mechanically rather than by prose: `tools/cherry-pick.py` is the only sanctioned way onto a release branch, and `tools/check-cherry-picks.py` is a CI check that errors on any Change-Id present on an older release branch but absent from `main` or a newer one.

**So the honest framing: the delta is not zero-risk-by-construction, but it is the lowest-risk kind of non-zero.** ☠️ **It is nonetheless a second behavioural change riding alongside the ProGuard swap, and the device test would be covering it without anyone having said so.** Saying so is this item's whole point. And it compounds the first change in the worst possible way: the changes with teeth here — bridge hoisting, horizontal merging, class merging, outlining, enum unboxing — are _exactly_ the passes that `-dontoptimize` currently prevents from running at all. Until the swap lands they are inert; the moment both land, every one of them becomes live for the first time, at a version this project has never built with.

### ☠️ And there is a route that gets the fix with no pin at all

Read out of the jars directly (`com/android/tools/r8/Version.class` inside the AGP builder artefact):

- `com.android.tools.build:builder:8.12.0` embeds R8 **8.12.14** — independently confirming what #2681 read out of the AAB.
- `com.android.tools.build:builder:8.12.3` — the highest published AGP 8.12.x — embeds R8 **8.12.22**.

**Google already shipped the fixed R8 to the 8.12 line.** An AGP 8.12.0 → 8.12.3 bump gets R8 8.12.22 with no `pluginManagement` override, no settings-file patch and no permanent pin to re-check at every SDK upgrade. ⚠️ It is not free either: AGP comes from the Expo/RN template, so bumping it is its own config-plugin patch to the root `build.gradle` (where the template writes a **versionless** `classpath('com.android.tools.build:gradle')`, meaning the version is supplied elsewhere in the Expo/RN version catalog and would have to be traced before anyone attempts this). It is listed as a real alternative to a pin, not as a recommendation.

⚠️ **How AGP's version actually reaches this build, since the alternative above turns on it.** The template's root `build.gradle` asks for `classpath('com.android.tools.build:gradle')` with **no version**; the version comes from React Native's Gradle version catalog, applied by `expoAutolinking.useExpoVersionCatalog()` in `android/settings.gradle`. Read locally: `node_modules/react-native/gradle/libs.versions.toml:9` → `agp = "8.12.0"`, at `react-native@0.86.0`. So "bump AGP" means overriding a _version catalog entry owned by React Native_, which is a materially bigger intervention than adding a classpath line — and confirms the map's premise that the AGP version is the SDK's to bring.

Published AGP for reference (`https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/maven-metadata.xml`): the 8.12 line is `8.12.0, 8.12.1, 8.12.2, 8.12.3`; the 8.13 line is `8.13.0, 8.13.1, 8.13.2`.

## The affected-version table, re-verified — and one thing worth knowing about where it lives

#2681 quoted `R8BuildMetadataImpl.canHaveOverflowInStatsMetadata`. ⚠️ **That method does not exist on the `8.12` release branch** — it was added to `main` _after_ the branch cut, so looking for it at tag `8.12.30` finds nothing, which is a trap worth recording. It is on `main`, at `src/main/java/com/android/tools/r8/metadata/impl/R8BuildMetadataImpl.java`, exactly as #2681 quoted it, and the full switch is:

| R8 line              | Nulls `stats` when         | Unaffected from                           |
| -------------------- | -------------------------- | ----------------------------------------- |
| 8.10                 | `patch < 33`               | 8.10.33                                   |
| 8.11                 | `patch < 23`               | 8.11.23                                   |
| **8.12**             | **`patch < 19`**           | **8.12.19** (lowest _published_: 8.12.22) |
| 8.13                 | `patch < 4`                | 8.13.4 (lowest published: 8.13.6)         |
| 8.x, other minors    | `minor < 10`               | — metadata did not exist before 8.10      |
| 9.x                  | `minor == 0 && patch == 0` | everything from 9.0.1 upward              |
| anything unparseable | `true`, "conservatively"   | —                                         |

with, at line 87, `this.statsMetadata = canHaveOverflowInStatsMetadata(version) ? null : statsMetadata;`.

**Read forward, that table is the single most useful fact on this ticket: every R8 line this project could plausibly land on next is already past its fix patch.** 8.13.6+, and every 9.x except the single build 9.0.0, return the `stats` block intact.

## ⚠️ One ambiguity in Google's wording that nobody has resolved, and it cuts both ways

Play's rule is _"For apps built with **the latest patch of** AGP version 8.10 or higher, these percentages are pulled from the included `r8.json` file."_ Two readings:

- **(a) loose** — "an AGP from 8.10 onward, at a patch level that emits the metadata". This is the reading #2681 takes, and under it the discriminator is whether `stats` survived R8's own workaround.
- **(b) literal** — "the newest published patch of your AGP line". Under (b) this project **never** qualifies: it is on AGP 8.12.0 while 8.12.3 exists, so pinning R8 through `settings.gradle` might leave Play still on the `mapping.txt` fallback and the card still dashed.

The evidence favours (a), for two reasons. R8 nulls the `stats` block _itself_, so under an affected R8 the field is simply not in the file and Play has nothing to read regardless of what it checks. And [onyx-intl/OnyxAndroidDemo#141](https://github.com/onyx-intl/OnyxAndroidDemo/issues/141) shows Play printing `Shrinking (0%)` from `noShrinkingPercentage: 100.0` on AGP **8.13.0** — not the latest patch of its line at any point, since 8.13.1 and 8.13.2 both exist.

☠️ **But it is not settled, and it has a practical consequence: an R8 pin might not move the card at all.** That is a second reason a pin should never be taken on its own, and a reason the runbook's `r8.json` check cannot substitute for one look at the real card after the next production upload.

## Item 5 — the do-nothing baseline. ☠️ **The card comes out fine, and that is not the headline**

### ⚠️ First, a correction: **Expo SDK 58 has not shipped.** It is in preview

Read from the npm registry on 2026-09-22:

- `expo` dist-tags: **`latest` = `57.0.24`**, `sdk-57` = `57.0.24`, **`next` = `58.0.0-preview.4`**. Every `58.` version of the `expo` package is a canary or a preview; there is no `expo@58.0.4`.
- `expo-template-bare-minimum` dist-tags: `latest` = `57.0.26`, **`sdk-58` = `next` = `58.0.4`**, published 2026-09-21. `58.0.0` landed 2026-09-10.

So the two packages are versioned out of step, and **#2678's "SDK 58.0.4" is `expo-template-bare-minimum@58.0.4`** — a real, published, non-prerelease template. #2678's finding is intact; the label on it was ambiguous. What is _not_ true is that SDK 58 has arrived. **Its arrival date is unknown and was not found — no GA, no release post, no changelog entry.**

Everything below is therefore a **pre-release** chain and can still move.

### The chain, each link read out of a published artefact

| Link                        | Value                               | Read from                                                                                  |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| SDK 58 template             | `expo-template-bare-minimum@58.0.4` | npm dist-tag `sdk-58`                                                                      |
| → its `expo` pin            | `~58.0.0-preview.4`                 | that tarball's `package/package.json`                                                      |
| → its `react-native` pin    | **`0.88.0-rc.1`**                   | same file                                                                                  |
| → AGP                       | **`9.2.1`**                         | `react-native-0.88.0-rc.1.tgz` → `package/gradle/libs.versions.toml:9`, `agp = "9.2.1"`    |
| → R8                        | **`9.2.14`**                        | `builder-9.2.1.jar` → `r8-version.properties` → `version.version=9.2.14`                   |
| → affected by the overflow? | **No**                              | `canHaveOverflowInStatsMetadata`: major 9 is affected only when `minor == 0 && patch == 0` |

⚠️ **The POM route does not work and should not be repeated.** `com.android.tools.build:builder`'s POM and Gradle module metadata declare **no** `com.android.tools:r8` dependency at any version checked (8.12.0, 9.2.1, and several older). R8 is fused into `builder.jar`, which carries `r8-version.properties` at its root — that file is the read. The same method confirms the map's own premise: `builder-8.12.0.jar` → `version.version=8.12.14`. For reference, `builder-8.13.2.jar` → **`8.13.19`**, also past its 8.13.4 fix.

Expo pins no AGP of its own: the SDK 58 template's root `android/build.gradle` still writes a versionless `classpath('com.android.tools.build:gradle')`, and `expoAutolinking.useExpoVersionCatalog()` reads **React Native's** `gradle/libs.versions.toml` as its base, overriding only `buildTools`, `minSdk`, `compileSdk`, `targetSdk` and `kotlin` — never `agp`.

And the template's `app/build.gradle:119`, read from that same tarball, verbatim:

```groovy
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
```

### ☠️ So: what does the card read after the SDK 58 upgrade if this project does nothing?

**Both halves of the change arrive together, by accident.** SDK 58 brings the ProGuard swap _and_ an unaffected R8, in the same upgrade.

1. `isOptimizationsEnabled` flips to **`true`** — the optimisation pass runs for the first time.
2. R8 9.2.14 keeps the `stats` block, so Play reads `r8.json` rather than falling back to `mapping.txt`.
3. **All three percentages become real numbers**, including the two that read `-` today.
4. The optimisation figure is `100 − noOptimizationPercentage`, driven by this project's keep rules. By analogy with the same AAB's `noObfuscationPercentage: 9.02` and `noShrinkingPercentage: 8.97`, the expectation is a high figure, comfortably clear of 25%. ☠️ **That step is an inference, not a measurement, and it is the one number the whole map turns on.**

**So the honest answer to the ticket's last question is: the card comes out fine, on its own, with no action from this project — provided SDK 58 lands before February 2027.** The Feb-2027 exposure Finding A raised is not a thing this project must act on to survive; it is a thing that resolves itself on an upgrade that was going to happen anyway. ☠️ **The map should stop treating the deadline as a forcing function. It is not one.**

**Two things that do not resolve themselves, and they are what is left of the case:**

- ⚠️ **If SDK 58 has _not_ landed by February 2027, the card is still dashed** — AGP 8.12.0 / R8 8.12.14, `mapping.txt` fallback, `Optimisation -` and `Shrinking -`. **What Play does with an _unreadable_ metric against a floor is undocumented and was not found.** It is not obviously compliant and not obviously failing. That is a real, unresolved exposure, and its size is entirely a function of an Expo release date nobody here controls.
- ☠️ **The do-nothing path delivers the riskiest change on this map with no device test, buried in the largest upgrade the project has faced.** Quantified, SDK 57 → 58 is: React Native **0.86.0 → 0.88.0-rc.1**, AGP **8.12.0 → 9.2.1** (a major), Kotlin **2.1.20 → 2.2.0**, `compileSdk` **36 → 37**, Gradle wrapper **9.4.1**, _plus_ the ProGuard swap, _plus_ — from Google's own AGP feature table — **class repackaging on by default at AGP 9.1** (this project's `isRepackageClassesEnabled` is `false` today) and optimised resource shrinking on by default at AGP 9.0. Reflection-dependent breakage introduced in that set will be attributed to React Native 0.88, and the one change in it that a device test was designed for will have ridden in unexamined.

**That is Finding B, sharpened: the argument for taking this deliberately was never the deadline. It is that the alternative is meeting it blind, inside a five-variable upgrade.** Ticket 7 should be argued on that and not on Play's card.

## The five answers, in one place

1. **Can R8 be pinned independently of AGP, and from a config plugin?** **Yes to both.** Google documents the classpath override for "AGP 9.2 and earlier", which covers AGP 8.12.0, and `@expo/config-plugins@57.0.5` already exports `withSettingsGradle` and `withProjectBuildGradle`. ⚠️ The seam is anchor-dependent — there is no EOF-append equivalent of #2678's — and the pin has **no upstream removal trigger**, so it must be re-checked at every SDK bump. ⚠️ Untested against Expo's `apply plugin` layout; if the settings route does not take, the fallback is the root `build.gradle` buildscript block.
2. **Must a pin land with the swap?** **Yes. Confirmed.** A pin alone resolves `noOptimizationPercentage` to a clean 100.00, prints **Optimisation 0%**, and fails a floor the app is 2× over on DEX. It has no other effect at all. Together or neither.
3. **Is the 25% floor per category?** **Per category. Confirmed from Google's page**, whose table carries three rows — Obfuscation, Optimization, Shrinking — each with its own 25%, and whose follow-up sentence says "thresholds", plural. There is no aggregate score anywhere on the page. Finding A is not de-escalated. The consequence is _"can affect an app's visibility and publishing capabilities on Google Play"_ — discretionary, dated, and explicitly _"not optional"_.
4. **Does the fixed R8 change behaviour beyond arithmetic?** **Yes.** The stats fix itself is one commit touching only the metadata package, but the lowest _published_ build containing it (8.12.22) also brings correctness fixes to bridge hoisting, horizontal class merging, class merging and outlining; 8.12.30 adds enum unboxing and DEX code-object deduplication. No new optimisation, no new pass, no keep-rule change — every delta is R8 doing less, or doing it right. ☠️ But those are exactly the passes `-dontoptimize` suppresses today, so both changes would go live together, at a version never built here.
5. **What does the card read after SDK 58 if this project does nothing?** ☠️ **A real, and very probably passing, optimisation number.** SDK 58's template already carries `proguard-android-optimize.txt`, and its AGP 9.2.1 ships R8 9.2.14, which is **not** affected by the overflow — so the pass runs _and_ Play can read the metadata. **The February-2027 exposure resolves itself on an upgrade that was happening anyway.** What does not resolve itself is the risk: the change arrives untested, inside RN 0.86→0.88 + AGP 8.12→9.2 + Kotlin 2.1.20→2.2.0 + compileSdk 36→37 + repackaging-on-by-default. And if SDK 58 slips past February 2027, the card stays dashed and Play's treatment of an unreadable metric is undocumented.

## Premises corrected on this ticket

- ☠️ **"Expo SDK 58" has not shipped.** `expo@latest` is `57.0.24`; `expo@next` is `58.0.0-preview.4`. The `58.0.4` in #2678 and in this ticket's body is **`expo-template-bare-minimum@58.0.4`**, which is real, published and non-prerelease. #2678's finding stands; its label did not.
- ⚠️ **The R8 override is a classpath addition, not a "dependency substitution"** (ticket body). Both R8's README and Google's docs describe adding `classpath("com.android.tools:r8:<version>")` and letting conflict resolution prefer the newer one.
- ⚠️ **`pluginManagement` has no `buildscript` member.** Gradle's `PluginManagementSpec` is `repositories`/`resolutionStrategy`/`plugins`/`includeBuild` only. In the Groovy DSL the nested `buildscript { }` resolves owner-first to the _settings script's_ own `ScriptHandler` — which is also why Google nests it there rather than placing it above, since `pluginManagement` must be the first block in a settings file.
- ⚠️ **"The existing mods reach `gradle.properties` and `app/build.gradle` only"** is true of this project's two mods and false as a statement about the available API. `withSettingsGradle` and `withProjectBuildGradle` are both exported by the installed `@expo/config-plugins`.
- ⚠️ **`R8BuildMetadataImpl.canHaveOverflowInStatsMetadata` is on `main`, not on the `8.12` release branch** (added after the branch cut), and its path is `metadata/`**`impl`**`/`. Looking for it at tag `8.12.30`, or directly under `metadata/`, finds nothing — which is not evidence it does not exist. #2681's quotation is accurate, re-read here in full.
- ⚠️ **`8.12.19` was never published.** The fix is first _tagged_ there; the lowest _published_ build carrying it is `8.12.22`. And R8 is not on Maven Central at all — it is on Google's Maven.
- ⚠️ **AGP's embedded R8 version cannot be read from a POM.** `com.android.tools.build:builder` declares no `r8` dependency. Read `r8-version.properties` from inside `builder-<agp>.jar`.

## Not verified, and deliberately so

- **Nothing was built.** No `expo prebuild`, no Gradle run, no AAB produced or inspected on this ticket. Every artefact read here is a published tarball, jar or web page.
- **Nothing was run on a device.** The device gate is untouched, and nothing here may be read as evidence the change works.
- **That the settings-file override actually reaches AGP's R8 on Expo's `apply plugin` layout.** Documented by Google without a precondition, expected to work through classloader parenting, **untested**. One local `bundleRelease` plus `unzip -p … r8.json` settles it by reading the `version` field.
- **What the optimisation percentage would actually be after the swap.** Inferred by analogy from the sibling figures; knowable exactly from one local build; not measured.
- **Play's `100 − noXPercentage` transform**, carried forward from #2681 as reconstruction, not documentation.
- **Which reading of "the latest patch of AGP version 8.10 or higher" Play implements.** Evidence favours the loose one; not settled.
- **How Play treats a category with no readable value against the February-2027 floor.** Not documented anywhere found.
- **When Expo SDK 58 reaches GA.** No date found, and none guessed.
- **Whether AGP 9.2.1 imposes anything else on this project** beyond the 9.0/9.1 defaults quoted from Google's AGP feature table. Not audited.
