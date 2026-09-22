# Reading Play's optimisation percentage locally: `r8.json`, and the R8 patch that makes Play ignore it

Research for [Can the optimisation percentage be read from the AAB locally, or only from Play?](https://github.com/Selftend/selftend/issues/2681), under map [R8 optimisation passes — from the prebuild template's `-dontoptimize` to a decided change and an owner runbook](https://github.com/Selftend/selftend/issues/2673).

**Checked 2026-09-22.** Versions below are what this repo ships today; the AGP version comes from the Expo SDK template, not from `app.config.ts`, so re-check after an SDK bump.

## The answer in four lines

1. **`r8.json` is in the AAB.** It is present in a bundle this project shipped, at `BUNDLE-METADATA/com.android.tools/r8.json`, and it carries an optimisation figure. The "the metadata may be absent on AGP 8.12" branch of the ticket is **false**.
2. **Everything on Play's card is locally readable** — every R8-configuration row, and all three percentages — with one `unzip -p` that Google itself documents.
3. ☠️ **But Play is not reading this project's percentages, and the optimisation change will not move the card.** AGP 8.12.0 compiles with **R8 8.12.14**, which sits inside a known R8 arithmetic bug fixed in **8.12.19**. R8's own metadata reader **discards the entire `stats` block** for versions in that range, and Play's documented data source is `r8.json` only "for apps built with the _latest patch_ of AGP version 8.10 or higher". Play falls back to `mapping.txt`, which can estimate obfuscation and knows nothing about shrinking or optimisation. **That is both dashes, explained.**
4. **The cheapest local proof the pass ran** is `options.isOptimizationsEnabled` in that same file. It reads `false` today.

## What was actually inspected

☠️ **This is an artefact finding, not a reasoned one.** A real production AAB was downloaded and unzipped.

|          |                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Artifact | `selftend-android-aab-30`, run [35338732174](https://github.com/Selftend/selftend/actions/runs/35338732174) — "Release pipeline", `v0.23.0`, 2026-09-18 |
| File     | `build-1789731986677.aab`, 94,915,092 B, 1,412 entries                                                                                                  |
| AGP      | `androidGradlePluginVersion=8.12.0` — read from `BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties`                                |
| R8       | `8.12.14` — read from `r8.json` `version`, and corroborated by `# compiler_version: 8.12.14` in `proguard.map`                                          |

**Not** inspected: an AAB from **0.19.0**, the release whose card reading is recorded in [#2335](https://github.com/Selftend/selftend/issues/2335). Its artifact expired 2026-07-27. The three retained AABs (0.21.0, 0.22.0, 0.23.0) all post-date [#2522](https://github.com/Selftend/selftend/pull/2522).

Release AABs stay downloadable for roughly a fortnight — every July artifact reads `expired: true`. Anyone repeating this has about that long after a release.

## Finding 1 — the file is there, and AGP 8.12 clears the documented floor

The map, [#2593](https://github.com/Selftend/selftend/issues/2593) and [#2335](https://github.com/Selftend/selftend/issues/2335) all carry the same hedge: _"the dashes may be a metrics-reporting artifact of the R8 version rather than a verdict on this configuration."_

**The hedge was right in substance and wrong in mechanism.** The metadata is not missing:

```
BUNDLE-METADATA/com.android.tools/r8.json          1786 bytes
```

Note the path — **`com.android.tools/r8.json`**, not the `com.android.tools.r8/r8.json` the ticket guessed.

> To inspect the post-optimization metadata embedded in your app bundle (for AGP version 8.10 or higher), extract the `r8.json` file:
>
> ```
> unzip -p <yourapp>.aab BUNDLE-METADATA/com.android.tools/r8.json
> ```

— [DEX code optimization](https://developer.android.com/topic/performance/vitals/code-optimization)

The AGP release notes for 8.8, 8.10, 8.12 and 9.0 **do not mention `r8.json`, `BUNDLE-METADATA` or build metadata at all**; the only version statements Google makes are the prose on the performance pages. AGP writes the entry from `PackageBundleTask`:

```kotlin
parameters.r8Metadata.orNull?.let { r8Metadata ->
  command.addMetadataFile("com.android.tools", "r8.json", r8Metadata.asFile.toPath())
}
```

## Finding 2 — what the file contains

From the shipped `v0.23.0` AAB, verbatim (reformatted; the file is one line):

```json
{
  "options": {
    "hasObfuscationDictionary": false,
    "hasClassObfuscationDictionary": false,
    "hasPackageObfuscationDictionary": false,
    "keepAttributes": {
      "isAnnotationDefaultKept": true,
      "isEnclosingMethodKept": true,
      "isExceptionsKept": false,
      "isInnerClassesKept": true,
      "isLocalVariableTableKept": false,
      "isLocalVariableTypeTableKept": false,
      "isMethodParametersKept": false,
      "isPermittedSubclassesKept": false,
      "isRuntimeInvisibleAnnotationsKept": false,
      "isRuntimeInvisibleParameterAnnotationsKept": false,
      "isRuntimeInvisibleTypeAnnotationsKept": false,
      "isRuntimeVisibleAnnotationsKept": true,
      "isRuntimeVisibleParameterAnnotationsKept": true,
      "isRuntimeVisibleTypeAnnotationsKept": true,
      "isSignatureKept": true,
      "isSourceDebugExtensionKept": false,
      "isSourceDirKept": false,
      "isSourceFileKept": true,
      "isStackMapTableKept": false
    },
    "isAccessModificationEnabled": false,
    "isFlattenPackageHierarchyEnabled": false,
    "isObfuscationEnabled": true,
    "isOptimizationsEnabled": false,
    "isProGuardCompatibilityModeEnabled": false,
    "isProtoLiteOptimizationEnabled": false,
    "isRepackageClassesEnabled": false,
    "isShrinkingEnabled": true,
    "apiModeling": {},
    "minApiLevel": "24",
    "isDebugModeEnabled": false
  },
  "baselineProfileRewriting": {},
  "compilation": { "buildTimeNs": 328647829771, "numberOfThreads": 4 },
  "dexFiles": [
    { "checksum": "1249a009…", "startup": false },
    { "checksum": "8df6e13e…", "startup": false },
    { "checksum": "c52844e8…", "startup": false }
  ],
  "stats": {
    "noObfuscationPercentage": 9.02,
    "noOptimizationPercentage": -65.72,
    "noShrinkingPercentage": 8.97
  },
  "featureSplits": { "featureSplits": [{ "dexFiles": [] }], "isolatedSplits": false },
  "resourceOptimization": { "isOptimizedShrinkingEnabled": true },
  "version": "8.12.14"
}
```

Every row the bundle explorer shows has a counterpart here:

| Bundle explorer, 0.19.0 reading ([#2335](https://github.com/Selftend/selftend/issues/2335)) | `r8.json` field                                    | `v0.23.0`                                                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Full mode ✅                                                                                | `options.isProGuardCompatibilityModeEnabled`       | `false` (compat off = full mode on)                                                      |
| Resource shrinking ✅                                                                       | `options.isShrinkingEnabled`                       | `true`                                                                                   |
| Resource shrinking optimised ⊖                                                              | `resourceOptimization.isOptimizedShrinkingEnabled` | `true` — flipped by [#2522](https://github.com/Selftend/selftend/pull/2522) since 0.19.0 |
| Repackage classes ⊖                                                                         | `options.isRepackageClassesEnabled`                | `false`                                                                                  |
| Obfuscation percentage 93%                                                                  | `stats.noObfuscationPercentage`                    | `9.02`                                                                                   |
| **Optimisation percentage `-`**                                                             | `stats.noOptimizationPercentage`                   | **`-65.72`**                                                                             |
| **Shrinking percentage `-`**                                                                | `stats.noShrinkingPercentage`                      | `8.97`                                                                                   |

## Finding 3 — the shipped artefact says the optimisation pass does not run

```
"isOptimizationsEnabled": false
```

Until now this was a three-link inference: the template writes `proguardFiles getDefaultProguardFile("proguard-android.txt")` → that file ships `-dontoptimize` → the pass never runs. Sound, but every link read from somewhere other than the artefact.

**This is R8 8.12.14 saying it, about the bundle that shipped as `v0.23.0`.** The chain in R8's source is direct, with no gaps:

`-dontoptimize` → `configurationConsumer.disableOptimization(…)` (`ProguardConfigurationParser`) → `isOptimizing() { return dontOptimizeRules.isEmpty(); }` (`ProguardConfiguration`) → `InternalOptions.isOptimizing()` → `this.isOptimizationsEnabled = options.isOptimizing()` (`R8OptionsMetadataImpl`).

Strictly the field records that the optimisation pass was **permitted**, not an after-the-fact observation that it did work. For the purpose this ticket asks about — distinguishing "optimisation ran" from "optimisation was a silent no-op" — that is the right reading, and it is the only one available without two builds.

Google's own position on the file that causes it:

> Support for `getDefaultProguardFile("proguard-android.txt")` has been dropped, because it includes `-dontoptimize`, which should be avoided. Instead, use `"proguard-android-optimize.txt"`.

— [Enable app optimization](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)

## Finding 4 — `-65.72` is a 32-bit integer overflow of a true 100.00%

Not a sentinel, not "garbage". A specific, named, fixed bug.

R8 computes each figure by walking every `DexProgramClass` and every one of its program members, counting the items each transformation is **not allowed** to touch:

```java
itemsCount++;
noObfuscationCount  += BooleanUtils.intValue(!keepInfo.isMinificationAllowed(options));
noOptimizationCount += BooleanUtils.intValue(!keepInfo.isOptimizationAllowed(options));
noShrinkingCount    += BooleanUtils.intValue(!keepInfo.isShrinkingAllowed(options));
```

So `noXPercentage` is _the share of classes + methods + fields pinned against transformation X_. **Lower is better**, and it is the complement of the score Play displays.

At **tag 8.12.14** — the exact compiler that built the shipped AAB — the conversion to a percentage is:

```java
float toPercentageWithTwoDecimals(int count) {
  // Multiply by 100 twice to get percentage with two decimals.
  float number = (float) (count * 100 * 100) / itemsCount;
  return (float) Math.round(number) / 100;
}
```

`count * 100 * 100` is **`int` arithmetic**, and the cast to `float` happens _after_ the wrap. It overflows once `count > 214,748`.

With `-dontoptimize` in force, `KeepInfo.isOptimizationAllowed` short-circuits on the global flag and returns `false` for **every** item, so `noOptimizationCount == itemsCount` and the true figure is exactly **100.00%** — comfortably past the overflow threshold for an app this size.

**Reproduced, not assumed.** Emulating Java's `int` wrap and `float` rounding: a true 100.00% prints as exactly `-65.72` when `itemsCount` falls in **259,163 – 259,177**. At `itemsCount = 259,170`, the other two counts land at ~23,377 and ~23,248 — both far below 214,748, so `9.02` and `8.97` come out clean. **Every number in this project's `stats` block is self-consistent with a single overflow in the optimisation counter.**

At **tag 8.12.19** the same method reads:

```java
float toPercentageWithTwoDecimals(int count) {
  if (itemsCount == 0) { return 0f; }
  float fraction = (float) count / itemsCount;
  float percentage = fraction * 100;
  return (float) Math.round(percentage * 100) / 100;
}
```

## Finding 5 — ☠️ the decisive one: Play throws the whole `stats` block away

R8 knows which of its own releases are affected, and names them:

```java
this.statsMetadata = canHaveOverflowInStatsMetadata(version) ? null : statsMetadata;

public static boolean canHaveOverflowInStatsMetadata(String version) {
  …
  case 8:
    switch (semanticVersion.getMinor()) {
      case 10: return semanticVersion.getPatch() < 33;  // Fixed in 8.10.33.
      case 11: return semanticVersion.getPatch() < 23;  // Fixed in 8.11.23.
      case 12: return semanticVersion.getPatch() < 19;  // Fixed in 8.12.19.
      case 13: return semanticVersion.getPatch() < 4;   // Fixed in 8.13.4.
      …
```

**R8 8.12.14 < 8.12.19 ⇒ affected.**

And the official reader applies that workaround on the way _in_, not only on the way out — `R8BuildMetadata.fromJson` deserialises, then rebuilds through the same constructor precisely so the nulling happens:

```java
if (canHaveOverflowInStatsMetadata(buildMetadata.getVersion())) {
  // Recreate the build metadata using the constructor to apply workaround.
  return new R8BuildMetadataImpl(…);
}
```

So any consumer parsing this project's `r8.json` with R8's own API gets **`stats == null`** — _all three_ percentages gone, not just the broken one.

Now read Play's documented data source with that in hand:

> **For apps built with the latest patch of AGP version 8.10 or higher, these percentages are pulled from the included `r8.json` file.**
>
> **For lower versions of AGP or where the `r8.json` file isn't included, the percentages are calculated from the `mapping.txt` file if included, or using DEX heuristics if the mapping file isn't available.**

— [DEX code optimization in Android vitals](https://developer.android.com/google/play/vitals/code-optimization)

"The **latest patch** of AGP 8.10 or higher" is not decoration. AGP 8.12.0 ships R8 8.12.14; the first published R8 in that line with the fix is **8.12.22**. This project is outside the `r8.json` case.

**That explains the card completely, including the part nothing else explained:**

| Card row             | Why                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Obfuscation **93%**  | From the `mapping.txt` fallback. A mapping file records which names were renamed, so obfuscation is recoverable. |
| Optimisation **`-`** | `mapping.txt` carries no information about what was optimised. No fallback exists.                               |
| Shrinking **`-`**    | `mapping.txt` carries no information about what was shrunk. No fallback exists.                                  |

And the discrepancy is itself the proof: if Play were reading this project's `stats`, obfuscation would show `100 − 9.02 = 90.98 ≈ 91%`. It shows **93%**. Play is computing it some other way, exactly as the fallback clause says.

The `100 − noXPercentage` mapping is independently corroborated where it _does_ apply. [onyx-intl/OnyxAndroidDemo#141](https://github.com/onyx-intl/OnyxAndroidDemo/issues/141) reports an app on **AGP 8.13.0 / R8 8.13.6** — and `8.13.6 ≥ 8.13.4`, so _not_ affected — whose `r8.json` reads `"isShrinkingEnabled": false` / `"noShrinkingPercentage": 100.0`, and whose Play Console says **"Shrinking (0%)"**. Unaffected R8 ⇒ Play reads `stats` ⇒ `100 − 100.0 = 0%`. Affected R8 ⇒ Play falls back ⇒ dashes. Both halves of the rule have a witness.

☠️ **So: swapping `proguard-android.txt` for `proguard-android-optimize.txt` cannot make _Optimisation percentage_ show a number.** It would flip `isOptimizationsEnabled` to `true` and replace `-65.72` with a real figure **inside the AAB** — and Play would still discard the block and still print a dash. The change cannot clear the card on this toolchain, however well it works. That is not a reason it is a bad change; it is a reason **no ticket on this map may justify it by the card**, which is what the map already said, now with a mechanism instead of a suspicion.

## Finding 6 — ⚠️ the dash is currently protecting this app, and that is worth knowing before anything is changed

Follow the same rule forward instead of backward.

The moment Play _can_ read this project's `stats` — a fixed R8, arriving on its own or with an Expo SDK bump that brings AGP 9.x — `noOptimizationPercentage` resolves to a clean `100.00`, and the card shows **Optimisation 0%**.

Against [Play Console technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799):

> From February 2027, apps and games on Google Play will need to meet minimum optimization requirements. You will need to achieve a minimum of 25% optimization, obfuscation and shrinking for any app uploads to Play Console.

Enforced for apps with **more than 10 MB of uncompressed DEX**. This app carries **20.2 MB**. Obfuscation ≈ 91% and Shrinking ≈ 91% clear the bar; **Optimisation at 0% does not.**

⚠️ **This qualifies the map's "no deadline, no policy consequence" premise rather than overturning it.** The consequence is real but latent: it is invisible today only because a broken counter is hiding the number, and it surfaces when the toolchain moves. It is out of scope for this map to re-open [#1707](https://github.com/Selftend/selftend/issues/1707)'s discharged obligation, and this document does not — but [#2685](https://github.com/Selftend/selftend/issues/2685) should rule knowing that the "do nothing" path is not obviously free, and that AGP 9.0 both _reveals_ the 0% and _forbids_ the file that causes it, in the same release.

☠️ **A corollary that matters operationally: pinning a fixed R8 on its own would be actively harmful.** It would make Play read a `stats` block whose optimisation figure is 0%, turning an unreadable card into a failing one, with no other benefit. **If R8 is ever pinned forward, the ProGuard-file swap has to land in the same change, or neither should.**

## Finding 7 — the lever, if the card is ever worth chasing

R8 can be moved without moving AGP. Google documents it on the analyzer page, for AGP 9.2 and earlier:

```gradle
pluginManagement {
    repositories { google(); mavenCentral() }
    buildscript {
        dependencies {
            classpath("com.android.tools:r8:…")
        }
    }
}
```

Published R8 versions in the relevant lines, read from `maven.google.com`'s group index on 2026-09-22: `8.12.14`, **`8.12.22`**, `8.12.28`, `8.12.30`, then `8.13.6`, `8.13.17`–`8.13.23`. **`8.12.22` is the first published build past the `8.12.19` fix**, and the nearest one to what AGP 8.12.0 already uses.

Cost, stated honestly: this replaces the compiler that produces the shipped DEX, it needs a third `settings.gradle` patch in a file `expo prebuild` regenerates (so a second fragile template patch alongside the `app/build.gradle` one [#2678](https://github.com/Selftend/selftend/issues/2678) is designing), and per Finding 6 it must not ship alone. It is **an option to record, not a recommendation**.

## Finding 8 — local instruments for "did the optimisation pass run", ranked

### 1. `r8.json` → `options.isOptimizationsEnabled` — the answer

```bash
unzip -p <app>.aab BUNDLE-METADATA/com.android.tools/r8.json \
  | python -c "import sys,json; d=json.load(sys.stdin); print(d['options'], d['stats'], d['version'])"
```

Run against the shipped `v0.23.0` AAB this prints `isOptimizationsEnabled = False`, `isRepackageClassesEnabled = False`, `stats = {'noObfuscationPercentage': 9.02, 'noOptimizationPercentage': -65.72, 'noShrinkingPercentage': 8.97}`, `r8 version = 8.12.14`. **Tested, not proposed.**

- **Cost**: one `unzip -p` on a build the runbook already produces. No extra build, no extra tool, no dependency.
- **Ambiguity**: none. It is a boolean the compiler wrote about its own configuration, traced to `-dontoptimize` through four source links in Finding 3.
- **It answers three other map questions for free**: `isRepackageClassesEnabled` settles the _Repackage classes ⊖_ row, `isAccessModificationEnabled` and `isFlattenPackageHierarchyEnabled` cover the rest of that family, and `version` tells you whether Play will trust the `stats` at all.
- ☠️ **One constraint the runbook must respect**: `r8.json` lives in the **AAB**. The check needs a `bundleRelease` — what the existing local proof build already runs — and **not** the EAS `preview` build, whose internal distribution yields an APK with no `BUNDLE-METADATA/` at all. The device test and this check are two artefacts from two builds; neither substitutes for the other.

### 2. R8 Configuration Analyzer — right tool, wrong version, different question

> To use the R8 Configuration Analyzer, you need AGP version 9.3.0 or R8 version 9.3.7-dev or higher.

This repo is on AGP 8.12.0. And Google is explicit that it measures something else:

> The scores returned by the R8 Configuration Analyzer reflect the initial evaluation of the keep rules before optimizations. To get the post-optimization values, inspect the `r8.json` file.

It answers _"how much of the codebase are the keep rules leaving available?"_ — the right instrument for [#2679](https://github.com/Selftend/selftend/issues/2679)-style keep-rule work, the wrong one for "did the pass run". Record it as arriving with AGP 9.3, i.e. with a future Expo SDK.

### 3. `mapping.txt` shape — real signal, but only as a delta

`BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` is in the AAB (71,302,044 B, 732,184 lines in `v0.23.0`). Its header is honest and silent on the point:

```
# compiler: R8
# compiler_version: 8.12.14
# min_api: 24
# {"id":"com.android.tools.r8.mapping","version":"2.2"}
```

Inlining and outlining leave traces (`com.android.tools.r8.synthesized`, rewritten frames), so counting them across a before/after pair does distinguish the two states — at the cost of **two builds and a comparison**, to say what instrument 1 says from one build in one command. Corroboration, not the check.

### 4. `-printconfiguration` dump, DEX method-count deltas — neighbouring questions

`-printconfiguration` (reachable via `extraProguardRules`) dumps the **merged configuration**, so it would show `-dontoptimize` surviving the merge. That is a proof about _configuration_, which is exactly the thing this ticket asks to distinguish from _behaviour_. Useful for [#2678](https://github.com/Selftend/selftend/issues/2678)'s "does the swap reach `proguardFiles` at all"; not for this. DEX method-count deltas need two builds, a tool, and a judgement call about what delta counts — strictly worse than instrument 1 on every axis.

## The two answers

### (a) Can we predict Play's card locally?

**Yes — completely, and the prediction is that the card will not move.**

- ✅ **Every R8-configuration row** (_Full mode_, _Resource shrinking_, _Resource shrinking optimised_, _Repackage classes_) is read directly out of `options` and `resourceOptimization`. Not predicted — the same values Play reads.
- ✅ **Whether the percentages can appear at all** is decided by `r8.json`'s `version` against R8's published fix table. `8.12.14` is affected, so Play discards the block; the dashes are determined before any ProGuard rule is considered.
- ✅ **What the figures would be if Play could read them** is arithmetic on `stats` — with `-dontoptimize` in force, Optimisation resolves to **0%**.
- ⚠️ **The exact printed number**, in the case where Play _does_ read the block, rests on the `100 − noXPercentage` transform. Google publishes neither that arithmetic nor any definition of the dash. The transform is supported by Google's own wording of the equivalent analyzer score and by the Onyx witness in Finding 5, and it is **inference**.

**The map's "ship to production and hope" loop is closed.** It is replaced by: build locally, read one JSON field, know before merging. What the local read establishes here is a negative — this change cannot clear the card — and that is worth strictly more than a production release would have been, because it is knowable now, costs no version code, and is not a guess.

### (b) What is the cheapest local proof the optimisation pass actually ran?

**`options.isOptimizationsEnabled` in `BUNDLE-METADATA/com.android.tools/r8.json`, read with the command Google documents.**

One `unzip -p` against the AAB the local proof build already produces. It is currently `false`, it flips to `true` if and only if the swap took effect, and it is traced to `-dontoptimize` through four links of R8 source. Nothing considered is cheaper and nothing else is unambiguous.

Read `stats.noOptimizationPercentage` and `version` in the same command: the boolean says the pass was enabled, the percentage says what Play would show, and the version says whether Play will look.

## What this changes for the map

- ☠️ **[#2685](https://github.com/Selftend/selftend/issues/2685) must strike "the payoff _may_ be unobservable" and replace it with "the card payoff _is_ zero on this toolchain, for a reason that has nothing to do with the change."** The reason is R8 8.12.14's overflow, not `-dontoptimize`, and no ProGuard configuration can fix it. Whatever case remains for the change is a case about **bytes, startup and memory**, plus the sequencing argument — never about the card.
- ⚠️ **#2685 also gains a consideration it did not have** (Finding 6): the "do nothing" path is not free. When a fixed R8 arrives, Optimisation resolves to **0%** against a **25%** Feb-2027 floor on a **20.2 MB** DEX app. AGP 9.0 reveals that number and forbids the file that causes it in the same release — so the two arrive together, but the SDK bump becomes the moment of maximum concentrated risk, which is precisely #2685's case-_for_ argument, now evidenced.
- **The runbook ([#2686](https://github.com/Selftend/selftend/issues/2686)) gains a pass/fail line needing no judgement**: after the local `bundleRelease`, `isOptimizationsEnabled` must read `true`. If it reads `false`, the config plugin silently no-oped and nothing downstream is worth running — the fail-loud contract [#2678](https://github.com/Selftend/selftend/issues/2678) is designing, available free from the artefact. Add that it must be a `bundleRelease`, not the `preview` APK.
- **[#2688](https://github.com/Selftend/selftend/issues/2688) is no longer load-bearing, and should say so.** Its reading can no longer settle anything this map needs; the dashes are explained and will persist. Keep it as confirmation, and attach the prediction: _Obfuscation a number, Optimisation and Shrinking still `-`, unchanged by [#2522](https://github.com/Selftend/selftend/pull/2522)_. If Shrinking now shows a number, Finding 5 is wrong and should be revisited.
- **`docs/releasing.md` § "Android app optimisation (R8)" carries a paragraph that is now wrong in its mechanism.** The ⚠️ "Two gaps left open" paragraph guesses the dashes _"may be a metrics-reporting artifact of the R8 version"_ — correct, but the artifact is a **32-bit overflow in R8 8.12.14's stats arithmetic that makes Play discard the block**, not the metadata being absent. That correction belongs with whichever ticket next edits the doc; this research branch does not touch it.

## Limits

- **Play's side is not open source.** That Play parses `r8.json` through R8's own `fromJson` — and therefore inherits the stats-nulling — is **inference**. What is documented is the fallback rule ("latest patch"), and what is verified is that R8's own reader nulls the block for 8.12.14. The inference is what joins them, and it is the only reading that also explains 93% ≠ 90.98% and the Shrinking dash.
- **The `100 − noXPercentage` transform is undocumented.** Supported by Google's definition of the analyzer's equivalent score and by one independent field report; not stated on any Google page.
- **No Google page defines what a dash means.** Every statement here about the dash is reconstruction.
- **The 0.19.0 AAB no longer exists**, so the recorded card reading could not be compared against its own metadata. The comparison is against `v0.23.0`, a later build of the same configuration plus [#2522](https://github.com/Selftend/selftend/pull/2522).
- **Nothing here says the optimisation change is safe, works, or should be taken.** It says what its effect on the card would be, and that the effect is measurable locally. The device gate is untouched and remains the owner's.

## Sources

- [DEX code optimization](https://developer.android.com/topic/performance/vitals/code-optimization) — the `unzip -p` command, the path, the AGP 8.10 floor, the analyzer-vs-`r8.json` note.
- [DEX code optimization in Android vitals](https://developer.android.com/google/play/vitals/code-optimization) — the "latest patch of AGP 8.10 or higher" data-source rule and the `mapping.txt` / DEX-heuristics fallback.
- [Use R8 Configuration Analyzer](https://developer.android.com/topic/performance/app-optimization/r8-configuration-analyzer) — score definitions, the AGP 9.3.0 / R8 9.3.7-dev requirement, and the `settings.gradle` route for replacing R8 on AGP 9.2 and earlier.
- [Enable app optimization](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization) — `proguard-android.txt` dropped because it includes `-dontoptimize`.
- [Play Console technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799) — the Feb-2027 25% floors and the 10 MB DEX scope.
- R8 source: [`R8BuildMetadataImpl`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/metadata/impl/R8BuildMetadataImpl.java) (`canHaveOverflowInStatsMetadata`, stats-nulling), [`R8BuildMetadata.fromJson`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/metadata/R8BuildMetadata.java), [`R8StatsMetadataImpl` @ 8.12.14](https://r8.googlesource.com/r8/+/refs/tags/8.12.14/src/main/java/com/android/tools/r8/metadata/impl/R8StatsMetadataImpl.java) (the overflow), [`R8StatsMetadataImpl` @ 8.12.19](https://r8.googlesource.com/r8/+/refs/tags/8.12.19/src/main/java/com/android/tools/r8/metadata/impl/R8StatsMetadataImpl.java) (the fix).
- AGP source: [`PackageBundleTask.kt`](https://android.googlesource.com/platform/tools/base/+/refs/heads/mirror-goog-studio-main/build-system/gradle-core/src/main/java/com/android/build/gradle/internal/tasks/PackageBundleTask.kt) — where the entry is written.
- Published R8 versions: `https://maven.google.com/com/android/tools/group-index.xml`, read 2026-09-22.
- [onyx-intl/OnyxAndroidDemo#141](https://github.com/onyx-intl/OnyxAndroidDemo/issues/141) — independent witness on unaffected R8 8.13.6.
- The `v0.23.0` AAB from run [35338732174](https://github.com/Selftend/selftend/actions/runs/35338732174), unzipped 2026-09-22.
- [#2335](https://github.com/Selftend/selftend/issues/2335) — the 0.19.0 bundle explorer reading compared against.
