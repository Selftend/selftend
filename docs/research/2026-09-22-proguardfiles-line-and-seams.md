# The SDK 57 `proguardFiles` line, and what can reach it without a regex

Research for [What does the SDK 57 template actually write on the proguardFiles line, and is there any seam that reaches it without a regex?](https://github.com/Selftend/selftend/issues/2678), under map [#2673](https://github.com/Selftend/selftend/issues/2673).

**All facts checked 2026-09-22** against published artefacts, not against a local `android/` directory (this repo has none — `android/` is gitignored and absent). Where a claim was reasoned rather than executed, it says so.

## Three premises this document corrects

1. **"The template is not in `node_modules`."** It is. `expo prebuild` resolves the template from **`node_modules/expo/template.tgz`** and only falls back to downloading `expo-template-bare-minimum@sdk-<major>` if that local read throws. Source: `node_modules/expo/node_modules/@expo/cli/build/src/prebuild/resolveLocalTemplate.js`, whose inlined source map reads:

   > `// The default is to use 'expo/template.tgz' which exists in all published versions of it`
   > `templatePath = resolveFrom(projectRoot, 'expo/template.tgz');`

   and `resolveTemplate.js`, where the npm download is only reached from the `catch` around `resolveLocalTemplateAsync`. So the file being patched is knowable offline, and is pinned to the installed `expo` version — not to whatever `sdk-57` points at on npm today. Locally: `expo@57.0.7` ships `template.tgz` containing `expo-template-bare-minimum@57.0.9`.

2. **"`proguardFiles … ` at line 122."** In the template the line is **119**, not 122. The 122 observation is still correct _for this project's prebuilt output_ — see [Finding 4](#finding-4--the-line-number-is-a-property-of-this-projects-plugin-set-not-of-the-template), which reconciles the two numbers exactly. The conclusion is that a line number is not a fact about the template at all and must never be an anchor.

3. **"`-dontoptimize` unconditionally wins" was taken on assertion.** It is now confirmed from R8's own parser, and additionally from a comment Google ships inside the generated file. See [Finding 3](#finding-3--dontoptimize-is-unconditional-confirmed-from-r8-source).

## Finding 1 — the exact line, verbatim

From `expo-template-bare-minimum`, `android/app/build.gradle`, line 119, with lines 112–122 for context. Double quotes, four levels of indentation (12 spaces), no trailing comma, no line continuation:

```groovy
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
```

Note the quoting is **mixed within the block**: `findProperty('…')` uses single quotes, `getDefaultProguardFile("…")` and `"proguard-rules.pro"` use double quotes. A regex must therefore not assume one style, and — more usefully — must not assume the _neighbouring_ lines at all.

The enclosing structure is `android { … buildTypes { release { … } } }`, starting at `android {` on line 84 and `buildTypes {` on line 108. `minifyEnabled` is fed by `def enableMinifyInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()` at line 69 — i.e. outside the `android` block.

How this was obtained: `npm pack expo-template-bare-minimum@<version>` into a temp directory and `tar xzf`, plus the same for `node_modules/expo/template.tgz`.

## Finding 2 — stability across SDK 54 → 58

The whole file, not just the line, is **byte-identical across SDK 55, 56 and 57**, including the earliest and latest patch of each. MD5 of `android/app/build.gradle`:

| Template version | Tag                          | MD5 of `android/app/build.gradle`  | `getDefaultProguardFile(...)` argument         |
| ---------------- | ---------------------------- | ---------------------------------- | ---------------------------------------------- |
| 54.0.53          | `sdk-54` head                | `39f675d4b1355dd6601f5fad3f8466fd` | `proguard-android.txt` (line 119)              |
| 55.0.0           | first `sdk-55`               | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 55.0.43          | `sdk-55` head                | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 56.0.0           | first `sdk-56`               | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 56.0.36          | `sdk-56` head                | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 57.0.0           | first `sdk-57`               | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 57.0.9           | **bundled in `expo@57.0.7`** | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 57.0.26          | `sdk-57` head / `latest`     | `881611acfbeded34426bf47b08720472` | `proguard-android.txt` (line 119)              |
| 58.0.4           | `sdk-58` / `next`            | `c931213ead32bf8b7f062be6760ba448` | **`proguard-android-optimize.txt`** (line 119) |

SDK 54 differs from 55–57 somewhere in the file, but the `proguardFiles` line is identical there too and also on line 119.

**SDK 57 → 58 is a one-line diff, and it is exactly this line:**

```diff
-            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
+            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
```

Upstream cause: [expo/expo#46852 "[expo][Android] Use `proguard-android-optimize.txt`"](https://github.com/expo/expo/pull/46852), merged into `main` on **2026-06-15** (verified via `gh api repos/expo/expo/pulls/46852`: `merged: true`, `base: main`). It was **not** back-ported to the `sdk-57` line — every published `sdk-57` template through 57.0.26 still says `proguard-android.txt`.

**Stability verdict.** The anchor text has not moved in four majors (54 → 57) and every patch within them, so a regex on the `getDefaultProguardFile("proguard-android.txt")` argument is low-risk _today_. But the line is not "stable" in the reassuring sense: **it is already scheduled to change**, and the change upstream is precisely the substitution the plugin would be performing. The fragility to design for is therefore not "the template drifted unpredictably" but a known, dated event — the SDK 58 upgrade, at which point a plugin that hard-fails on no-match would fail the build the day the upgrade lands, and a plugin that silently no-ops would be invisible dead code. Both need the idempotency branch described in [Finding 6](#finding-6--prior-art).

## Finding 3 — `-dontoptimize` is unconditional (confirmed from R8 source)

This was the map's load-bearing assumption. It holds, and the evidence is stronger than expected.

### 3a. The two default files differ by one directive

AGP does not ship `proguard-android.txt` as a file. It **generates** it at build time from three resources plus an inline string. Decompiled from the exact AGP the build uses — `com.android.tools.build:gradle:8.12.0` (pinned by `node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml`, `agp = "8.12.0"`), class `com/android/build/gradle/ProguardFiles.class`, method `createProguardFile` — the composition is:

| Generated file                  | Enum constant   | Body                                                                                             |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `proguard-android.txt`          | `DONT_OPTIMIZE` | `proguard-header.txt` + an inline comment + **`-dontoptimize`** + `proguard-common.txt`          |
| `proguard-android-optimize.txt` | `OPTIMIZE`      | `proguard-header.txt` + an inline comment + `proguard-optimizations.txt` + `proguard-common.txt` |

`proguard-optimizations.txt`, extracted from that same jar, is one line: `-allowaccessmodification`. `proguard-common.txt` is shared and contains **no** `-dontoptimize`. So the entire functional difference between the two default files in AGP 8.12.0 is:

> `-dontoptimize` ⟷ `-allowaccessmodification`

(Historic `-optimizations` / `-optimizationpasses` lines are gone from the optimize file in this AGP version.)

### 3b. Google says "swap, don't add" in the file itself

The inline comment AGP writes immediately above `-dontoptimize` (verbatim from the `ldc` constant in `createProguardFile`):

> ```
> # Optimization is turned off by default. Dex does not like code run
> # through the ProGuard optimize steps (and performs some
> # of these optimizations on its own).
> # Note that if you want to enable optimization, you cannot just
> # include optimization flags in your own project configuration file;
> # instead you will need to point to the
> # "proguard-android-optimize.txt" file instead of this one from your
> # project.properties file.
> -dontoptimize
> ```

That is Google stating the map's conclusion directly: adding the optimize file alongside does not work; the default file has to be pointed elsewhere.

### 3c. R8 makes it order-independent and irreversible

R8 concatenates every configuration it is given and parses them into one configuration. From `com/android/tools/r8/shaking/ProguardConfigurationParser.java` (`main`, fetched from `r8.googlesource.com`):

```java
} else if (acceptString("dontoptimize")) {
  configurationConsumer.disableOptimization(this, getPosition(optionStart));
}
```

and from `ProguardConfiguration.java`:

```java
public void disableOptimization(ProguardConfigurationSourceParser parser, Position position) {
  dontOptimizeRules.add(new DontOptimizeRule(parser.getOrigin(), position));
}
...
public boolean isOptimizing() {
  return dontOptimizeRules.isEmpty();
}
```

`isOptimizing()` is `dontOptimizeRules.isEmpty()`. One `-dontoptimize` anywhere in any file puts a rule in that list, and **nothing removes it** — there is no `-optimize` counter-directive in the grammar. Order of files is irrelevant. R8 additionally treats `-optimizationpasses` and `-optimizations` as _ignored_ options (`getIgnoredOptionsSingleArg()` / `getIgnoredOptionsWithInfo()` both list them), so there is no way to re-enable optimization from a rules file either.

**Conclusion: a swap is mandatory. Appending `proguard-android-optimize.txt` alongside `proguard-android.txt` provably does nothing but add `-allowaccessmodification` while optimization stays off.** Confirmed, not assumed.

### 3d. …and appending is what the template's own call does

Decompiled from AGP 8.12.0, `com/android/build/gradle/internal/dsl/BuildType`:

- `proguardFile(Object)` → `getProguardFiles().add(dslServices.file(o))` — **appends**.
- `proguardFiles(Object...)` → loops, calling `proguardFile` per element — **appends**.
- `setProguardFiles(Iterable)` → `getProguardFiles().clear()` then `proguardFiles(array)` — **replaces**.

So the template's Groovy `proguardFiles a, b` is the appending overload. A second `proguardFiles` call from anywhere adds to the list; only `setProguardFiles` (or Groovy's `proguardFiles = [...]`, which routes to the setter) clears it. This is what makes seam B below viable and seam C below useless.

## Finding 4 — the line number is a property of this project's plugin set, not of the template

The template says 119. This project's prebuilt file says 122, and the three extra lines are attributable exactly:

`@sentry/react-native`'s Expo plugin (installed, and enabled in `app.config.ts` with `experimental_android.enableAndroidGradlePlugin: true`) makes two `withAppBuildGradle` edits, both of which _prepend_:

1. `plugin/build/withSentryAndroidGradlePlugin.js`: `contents = \`${sentryPlugin}\n${contents}\``where`sentryPlugin`is`apply plugin: "io.sentry.android.gradle"` → **+1 line**.
2. `plugin/build/withSentryAndroid.js`, `modifyAppBuildGradle`: replaces `/^android {/m` with `` `${applyFrom}${disableUploadOverride}\n\n${match}` `` → **+2 lines** (the `apply from: new File(…, "sentry.gradle.kts")` line and a blank line), because `disableUploadOverride` is empty when `disableAutoUpload` is falsy — and it is falsy here, since `app.config.ts` does not pass `disableAutoUpload`.

119 + 1 + 2 = **122**. If `disableAutoUpload` were ever set, it becomes 123.

For the arithmetic to be exact, nothing else installed may insert a line above 119. That was checked exhaustively: `grep -rl withAppBuildGradle node_modules` returns **eight** files, and all of them are accounted for.

| Caller                                                    | Effect on this project's `app/build.gradle`                                                                                                                                                                        | Shifts line 119? |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `@sentry/react-native` `withSentryAndroidGradlePlugin.js` | prepends `apply plugin: "io.sentry.android.gradle"`                                                                                                                                                                | **yes, +1**      |
| `@sentry/react-native` `withSentryAndroid.js`             | inserts `apply from: … sentry.gradle.kts` + blank line before `^android {`                                                                                                                                         | **yes, +2**      |
| `@expo/config-plugins` `GoogleServices.js`                | active (`android.googleServicesFile` is set in `app.config.ts`), but the edit is `appBuildGradle + "\napply plugin: '…'"` — an **append at EOF**                                                                   | no               |
| `@expo/config-plugins` `Package.js`, `Version.js`         | in-place substitution of `namespace` / `applicationId` / `versionCode` / `versionName`                                                                                                                             | no               |
| `expo-localization` `withExpoLocalization.js`             | would add `resourceConfigurations += […]` inside `defaultConfig` (above 119), but the whole branch is gated on `supportedLocales`, which `app.config.ts` does not pass — the plugin is registered as a bare string | no (inactive)    |
| `expo-build-properties` `android.js`                      | precompiled-headers mod, gated on `android.usePrecompiledHeaders` / `EXPO_USE_ANDROID_PRECOMPILED_HEADERS=1`, neither set                                                                                          | no (inactive)    |
| `@expo/config-plugins` `index.js`                         | re-export                                                                                                                                                                                                          | n/a              |

So 122 is exact today and is the sum of one third-party plugin's two prepends. That reconciles #2593's number without either source being wrong, and it makes the design point concretely: the offset moves when an unrelated plugin's options change — enabling `supportedLocales`, or Sentry's `disableAutoUpload`, each moves it again. **A line number is never a valid anchor here.** Note also that Sentry's own mods fail _soft_ — `warnOnce` and return the unmodified contents — which is the failure mode this map is trying not to repeat.

One incidental result of that sweep: `GoogleServices.js` is a **third** first-party precedent for the append-at-EOF shape that seam 1 relies on, alongside `EasBuild.js` and Sentry's `apply from:` — and it is the purest example, a bare string concatenation with no anchor at all.

## Finding 5 — enumerated seams, ranked

The question was whether anything reaches `proguardFiles` or the release build type without editing the generated file. Answer: **no seam avoids touching `android/app/build.gradle` entirely, but one avoids the anchor regex.** What the template offers was checked exhaustively — `grep` for `apply from`, `ext`, `findProperty` across `android/app/build.gradle`, `android/build.gradle`, `android/gradle.properties` and `android/settings.gradle` in the 57.0.26 template:

- **No `apply from:` hook** anywhere in `android/app/build.gradle`. The only extension points in the file are `findProperty(...)` reads and `rootProject.ext.*` reads for SDK versions.
- **No Gradle property controls the ProGuard file.** The `findProperty` keys present are `android.enableBundleCompression`, `android.enableMinifyInReleaseBuilds`, `android.enableShrinkResourcesInReleaseBuilds`, `android.enablePngCrunchInReleaseBuilds`, `reactNativeReleaseLevel`, `expo.useLegacyPackaging`, `android.packagingOptions.*`, `expo.gif.enabled`, `expo.webp.enabled`, `expo.webp.animated`. None names a proguard file. `android/gradle.properties` contains no `proguard`/`minify`/`shrink` key at all.
- **No `ext` block the template reads for this.** `rootProject.ext` is read only for `ndkVersion`, `buildToolsVersion`, `compileSdkVersion`, `minSdkVersion`, `targetSdkVersion`, all set by the `expo-root-project` plugin.
- **`@expo/config-plugins` has no structured model for `build.gradle`.** `withGradleProperties` parses `gradle.properties` into typed entries and `withAndroidManifest` into XML, but `withAppBuildGradle` hands over `modResults.contents` as a raw string. There is no Gradle AST to edit.

### Ranked

**1. Append an `apply from:` line and put the change in a plugin-owned `.gradle` file (recommended).**

A `withDangerousMod` writes `android/app/selftend-r8.gradle`; a `withAppBuildGradle` appends `apply from: "./selftend-r8.gradle"` to the **end** of the file (a plain `contents + line`, guarded by `contents.includes(...)` for idempotency — no anchor, no `replace`, nothing to miss). The script re-opens the extension after the `android { }` block has been evaluated and calls the _replacing_ overload:

```groovy
android {
  buildTypes {
    release {
      setProguardFiles([getDefaultProguardFile("proguard-android-optimize.txt"), file("proguard-rules.pro")])
    }
  }
}
```

Why it ranks first: the only thing that can fail is the append, and an append cannot silently no-op. If Expo ever restructures the file, this keeps working; if `setProguardFiles` ever moves, **Gradle fails loudly** at configuration time rather than the build quietly shipping an unoptimized AAB. Precedent for the shape is first-party: `@expo/config-plugins`' own `android/EasBuild.js` does exactly this, writing `android/app/eas-build.gradle` and appending `apply from: "./eas-build.gradle"` with `hasApplyLine()` as its idempotency guard, and `@sentry/react-native` applies `sentry.gradle.kts` the same way.

Caveats, stated honestly: **this was not executed.** There is no `android/` directory here and no Gradle run was performed. It rests on two verified facts (`setProguardFiles` clears the list, per AGP 8.12.0 bytecode; the EAS/Sentry apply-from pattern is real and first-party) plus one reasoned step — that `getDefaultProguardFile` resolves inside an `android { }` block in an applied script. That last step is standard AGP usage but is **unverified here**. It also still writes into a generated file; it just removes the anchor.

**2. Regex-substitute the `getDefaultProguardFile(...)` argument (the presumed approach).**

Viable, low-risk today given Finding 2, and it has good prior art (Finding 6). Its whole design burden is the failure contract: it must throw when the substitution matches nothing, and must distinguish "text moved" from "SDK 58 already says `optimize`". Ranked below seam 1 only because its failure mode is a silent no-op unless explicitly coded against, and because #2593's 122-vs-119 confusion is itself evidence of how easily the anchor gets mis-specified.

**3. Vendor the template.** `expo prebuild --template <tarball>`, or EAS's `build.<profile>.prebuildCommand`, pointed at a fork of `expo-template-bare-minimum` with the line already changed. Genuinely regex-free. Rejected: it forks the entire template for a one-line change and has to be re-forked every SDK bump — strictly more maintenance than seam 2's regex, for the same one line.

**4. Drop CNG and commit `android/`.** Regex-free and permanent. Rejected: it gives up prebuild for the whole project to change one line.

**5. `expo-build-properties`. Not available.** Checked at the current `sdk-57` head, **57.0.21** (not 57.0.16 — npm `dist-tags` now shows `sdk-57: 57.0.21`, `latest: 57.0.21`), and also at **58.0.4**. Neither package's built output contains any reference to `getDefaultProguardFile`, `proguard-android`, or a `proguardFiles` option. Its android surface is `enableMinifyInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds` / `enablePngCrunchInReleaseBuilds` (all written as `gradle.properties` keys via `createBuildGradlePropsConfigPlugin`), plus `extraProguardRules`, which only **appends text to `android/app/proguard-rules.pro`** and by Finding 3 cannot undo `-dontoptimize`. `enableProguardInReleaseBuilds` survives as a deprecated alias of `enableMinifyInReleaseBuilds`. A parallel search of the `expo/expo` CHANGELOG, open PRs and open issues for a landing `proguardFiles` option found none. **Nothing is landing that changes ticket 5's answer** — instead the fix landed in the _template_ (PR #46852) and ships with SDK 58.

**6. Append `proguardFiles getDefaultProguardFile("proguard-android-optimize.txt")` instead of swapping. Does not work.** Confirmed by Finding 3: appending is what the DSL call does, both files get concatenated, and `-dontoptimize` from the first still zeroes `isOptimizing()`.

## Finding 6 — prior art

Three real config plugins that patch this exact line. All three fetched directly (HTTP 200 verified on the raw URLs for the two repo files).

1. **[`perawallet/pera-react-native`, `apps/mobile/plugins/withAndroidR8Optimization.js`](https://github.com/perawallet/pera-react-native/blob/main/apps/mobile/plugins/withAndroidR8Optimization.js)** (Apache-2.0) — the closest match: it performs precisely this swap, for precisely this reason ("The RN template picks `proguard-android.txt`, which sets `-dontoptimize`"), and pairs it with `android.enableNewResourceShrinker.preciseShrinking`. Its drift handling is the strongest of the three:

   ```js
   // Idempotent: prebuild re-runs mods, and the second pass must be a no-op.
   if (buildGradle.includes(OPTIMIZED_PROGUARD_FILE)) {
     return buildGradle;
   }
   // Scoped to the getDefaultProguardFile() argument — a bare filename replace
   // would also rewrite a mention in a comment or a keep rule.
   const patched = buildGradle.replace(
     new RegExp(`(getDefaultProguardFile\\(\\s*["'])${DEFAULT_PROGUARD_FILE}(["']\\s*\\))`),
     `$1${OPTIMIZED_PROGUARD_FILE}$2`,
   );
   if (patched === buildGradle) {
     throw new Error(
       '[withAndroidR8Optimization] could not find getDefaultProguardFile("proguard-android.txt") to patch',
     );
   }
   ```

   Three separate guards: a `language !== 'groovy'` throw, a substring idempotency check that _also_ happens to make SDK 58 a clean no-op, and a `patched === buildGradle` comparison that converts a missed regex into a thrown error. Note its regex is quote-agnostic and whitespace-tolerant inside the call, and deliberately scoped to the `getDefaultProguardFile(...)` argument rather than the bare filename. Note also we must not copy this file; the pattern is an idea, and this repo's policy on borrowed code applies.

2. **[`isilher/expo-detox-config-plugin`, `src/withProguardGradle.ts`](https://github.com/isilher/expo-detox-config-plugin/blob/main/src/withProguardGradle.ts)** — anchors on the full line `/proguardFiles getDefaultProguardFile\("proguard-android.txt"\),\s?"proguard-rules.pro"/` to insert rules after it. It has an idempotency guard but **no post-replace check**, so a missed match silently returns the file unchanged. This is the anti-pattern: on SDK 58 it would quietly stop working. (Descendant of the original `expo/config-plugins` detox plugin, whose path is now 404 — that package was removed upstream.)

3. **[gist `esinanturan/3e510444c602796694dee5943470c742`](https://gist.github.com/esinanturan/3e510444c602796694dee5943470c742)** — same full-line anchor, but tests the anchor _before_ replacing and throws `"Cannot add to maven gradle because the proguard regex could not find the entrypoint row"` if absent.

No npm package dedicated to this exists; a registry search for "expo proguard plugin" returned nothing relevant.

## What this means for the map

- Ticket 5's fail-loud contract should price the regex as **low-risk-until-SDK-58, then guaranteed-to-not-match**. The idempotency branch is not optional politeness; it is the SDK 58 upgrade path, and without it the upgrade breaks the build on day one.
- If the swap is done at all, **seam 1 (append + `apply from` + `setProguardFiles`) deserves a look before seam 2**, because its failure is a Gradle error rather than a silent no-op — which is what the whole fail-loud design is trying to buy. Its one unverified step should be checked with an actual `expo prebuild` + release build before it is chosen.
- **The plugin is temporary either way.** SDK 58 ships the swap in the template. Whatever lands should carry a note naming SDK 58 as its removal trigger.
- Not researched here, and worth flagging: turning optimization on raises the chance of a reflection-only path being stripped. The Pera plugin's own comment says a release smoke test belongs with the change, and that missing `-keep` rules should come from R8's `missing_rules.txt` rather than pre-emptive over-keeping.

## Method and reproducibility

- Templates: `npm pack expo-template-bare-minimum@<v>` for 54.0.53, 55.0.0, 55.0.43, 56.0.0, 56.0.36, 57.0.0, 57.0.26, 58.0.4, plus `node_modules/expo/template.tgz`; compared with `md5sum` and `diff -u`.
- AGP: `com.android.tools.build:gradle:8.12.0` from the local Gradle cache; `unzip` for the `com/android/build/gradle/proguard-*.txt` resources and `javap -p -c -constants` for `ProguardFiles`, `ProguardFiles$ProguardFile` and `internal/dsl/BuildType`.
- R8: `ProguardConfigurationParser.java` and `ProguardConfiguration.java` from `https://r8.googlesource.com/r8/+/refs/heads/main/...?format=TEXT`, base64-decoded.
- Package versions read from the npm registry (`dist-tags`) and from `node_modules` on 2026-09-22.
- **Not done:** no `expo prebuild` was run, no Gradle build was run, and no APK/AAB was inspected. Every claim about what the _build_ does is derived from source and bytecode, not from an executed build.
