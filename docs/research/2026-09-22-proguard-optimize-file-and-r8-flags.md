# `proguard-android-optimize.txt` under AGP 8.12, and which R8 flags still work

Date: 2026-09-22 · Map: #2673 · Ticket: #2679

Everything below was read out of the **shipped artefacts** — the AGP 8.12.0 plugin
jar from the local Gradle cache, the AGP 9.0.0/9.1.0 jars from Google's Maven
mirror, and R8's own source on `r8.googlesource.com` at the `8.12` branch (the R8
line AGP 8.12 uses). No blog post, Stack Overflow answer or secondary write-up
supports any claim here. Where a primary source could not be reached, it says so.

## Headline

Three of the ticket's five premises turned out to be wrong, and two of them
change what the swap is for.

1. **The `-optimizations` line the ticket asks about is not in AGP 8.12's file.**
   Google deleted it between AGP 8.2.1 and 8.3.0. The AGP 8.12 file's entire
   optimisation payload is one line: `-allowaccessmodification`.
2. **R8 ignores `-optimizations` anyway** — parsed, info-logged, discarded. So the
   question of whether `!class/merging/*` protected anything is moot twice over:
   the line is gone _and_ it never did anything.
3. **The swap does not touch repackaging** under AGP 8.12. R8 8.12 has no
   "repackage by default" mode at all; Play's _Repackage classes_ ⊖ row stays a
   separate opt-in. (That changes at AGP 9.1, not 9.0.)
4. **#2593's "the optimisation pass genuinely never runs" is too strong.** Under
   `-dontoptimize` R8 still rewrites string switches, still runs the inliner for
   synthetic lambda accessors, and still horizontally merges its own synthetics.
   What `-dontoptimize` switches off is the _interprocedural_ work.
5. **AGP 9.0 makes the old file a hard build error**, not a warning and not a
   silent substitution — quoted from the 9.0.0 jar's own bytecode below.

---

## 1. The two files, side by side

### How to reproduce

AGP does not ship `proguard-android.txt` or `proguard-android-optimize.txt` as
files at all. The plugin jar carries **three fragments** —
`com/android/build/gradle/proguard-header.txt`, `proguard-optimizations.txt` and
`proguard-common.txt` — and `com.android.build.gradle.ProguardFiles.createProguardFile(name, out)`
assembles the named file at build time into
`build/intermediates/default_proguard_files/global/`. That is why the file is not
findable in the SDK and not in this repo.

The files below were produced by calling that method directly, on AGP 8.12.0:

```java
// Gen.java — compile and run against gradle-8.12.0.jar + guava
ProguardFiles.createProguardFile("proguard-android.txt", new File(out, "proguard-android.txt"));
ProguardFiles.createProguardFile("proguard-android-optimize.txt", new File(out, "proguard-android-optimize.txt"));
```

```
javac  -cp ~/.gradle/caches/modules-2/files-2.1/com.android.tools.build/gradle/8.12.0/*/gradle-8.12.0.jar;<guava>  -d . Gen.java
java   -cp <same>;.  Gen out
```

SHA-256 of the AGP 8.12.0 outputs:

| file                            | sha256                                                             | lines |
| ------------------------------- | ------------------------------------------------------------------ | ----- |
| `proguard-android.txt`          | `6899658cca7f4c0cebef026667e72451c8e2fbe1dcbedb18ba5981c83aeb2c6a` | 95    |
| `proguard-android-optimize.txt` | `0c2037f6eca949ee82dad4ade741ad1e3fcb7a5d98e4b31d08be89b26cf0d7d0` | 89    |
| `proguard-defaults.txt`         | `e09dc4a89fd86978ece647e7a1add0b67ca972a452ed1d12a6c64831249d90a6` | 89    |

### The complete diff

This is the whole of it. Nothing else differs.

```diff
--- proguard-android.txt
+++ proguard-android-optimize.txt
@@ -5,15 +5,9 @@
 # the plugin and unpacked at build-time. The files in $ANDROID_HOME are no longer maintained and
 # will be ignored by new version of the Android plugin for Gradle.

-# Optimization is turned off by default. Dex does not like code run
-# through the ProGuard optimize steps (and performs some
-# of these optimizations on its own).
-# Note that if you want to enable optimization, you cannot just
-# include optimization flags in your own project configuration file;
-# instead you will need to point to the
-# "proguard-android-optimize.txt" file instead of this one from your
-# project.properties file.
--dontoptimize
+# Optimizations: If you don't want to optimize, use the proguard-android.txt configuration file
+# instead of this one, which turns off the optimization flags.
+-allowaccessmodification

 # Preserve some attributes that may be required for reflection.
 -keepattributes AnnotationDefault,
```

**Confirmed:** `-dontoptimize` is present in `proguard-android.txt` and absent
from `proguard-android-optimize.txt`.

**Everything else that differs:** exactly one directive, `-allowaccessmodification`,
added; plus the comment block. The 84 shared lines (the `-keepattributes` set, the
licensing-service keeps, the native-method / View-setter / Activity-onClick /
enum / Parcelable / `@JavascriptInterface` keeps, the `android.support` and
`androidx` `-dontwarn`/`-dontnote`s, the `@Keep` annotation handling) are byte-identical,
because both come from the same `proguard-common.txt`.

There is a **third** default file, `proguard-defaults.txt`
(`ProguardFiles.ProguardFile.NO_ACTIONS`), which differs from the optimize file
only in its comment — same `-allowaccessmodification`, same common block. Not
relevant to the swap, recorded so nobody rediscovers it.

### Where the `-optimizations` line went

The ticket quotes a historical
`-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*`
line. It is real, and it is gone. Reading
`com/android/build/gradle/proguard-optimizations.txt` straight out of each
plugin jar:

| AGP        | `proguard-optimizations.txt`                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| 7.2.1      | comment + `-optimizations !code/…,!field/*,!class/merging/*` + `-optimizationpasses 5` + `-allowaccessmodification` |
| 7.3.1      | same                                                                                                                |
| 8.2.1      | same                                                                                                                |
| **8.3.0**  | **`-allowaccessmodification`** only                                                                                 |
| 8.4.0      | `-allowaccessmodification`                                                                                          |
| 8.5.0      | `-allowaccessmodification`                                                                                          |
| 8.10.1     | `-allowaccessmodification`                                                                                          |
| **8.12.0** | **`-allowaccessmodification`**                                                                                      |
| 9.0.0      | `-allowaccessmodification`                                                                                          |
| 9.1.0      | `-allowaccessmodification`                                                                                          |

(7.x–8.12 read from the local Gradle cache; 8.3.0, 8.4.0, 9.0.0, 9.1.0 downloaded
from `https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/<v>/gradle-<v>.jar`.)

So the removal landed **between AGP 8.2.1 and 8.3.0**. The Google-hosted source of
the current file is
<https://android.googlesource.com/platform/tools/base/+/refs/heads/mirror-goog-studio-main/build-system/gradle-core/src/main/resources/com/android/build/gradle/proguard-optimizations.txt>.
The commit that removed it could not be dated — `android.googlesource.com`'s
`+log/` requires sign-in — so "between 8.2.1 and 8.3.0" is as tight as this gets.

### The AGP pin — verified

`node_modules/react-native/gradle/libs.versions.toml:9` → `agp = "8.12.0"`, and
`node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml:2` → the same.
`node_modules/react-native/package.json` → `"version": "0.86.0"`. The ticket's
"React Native 0.86 pins exactly 8.12.0" holds.

---

## 2. Does R8 honour `-optimizations`? **No.**

**Parsed, an info diagnostic is emitted, and the value is discarded.** Not an
error, not a warning, no effect on the configuration.

`src/main/java/com/android/tools/r8/shaking/ProguardConfigurationParser.java`,
branch `8.12` ([source](https://r8.googlesource.com/r8/+/refs/heads/8.12/src/main/java/com/android/tools/r8/shaking/ProguardConfigurationParser.java)):

```java
private boolean parseOptimizationOption(TextPosition optionStart)
    throws ProguardRuleParserException {
  if (!acceptString("optimizations")) {
    return false;
  }
  infoIgnoringOptions("optimizations", optionStart);
  do {
    skipWhitespace();
    skipOptimizationName();
    skipWhitespace();
  } while (acceptChar(','));
  return true;
}
```

`infoIgnoringOptions` is `reporter.info(new StringDiagnostic("Ignoring option: -" + optionName, …))`,
and the receiving `ProguardConfiguration.Builder.addIgnoredOption(…)` body is
literally `// Intentionally empty.` `-optimizationpasses` gets the same treatment,
except that a missing integer argument is a fatal error before the option is
ignored. The two are the whole of `getIgnoredOptionsWithInfo()`.

Contrast: R8 _does_ hard-error on genuinely unsupported options
(`addUnsupportedOption` → `reporter.error("Unsupported option: -" + option)`), and
`-optimizations` is not in that set. So it will never fail a build and — because
`reporter.info` is INFO severity — you will normally never see the diagnostic
under Gradle either.

**Consequence, stated plainly:** an `-optimizations !class/merging/*` line
protects nothing. R8 has no mechanism to disable an individual optimisation; the
only switches are the coarse `-dontoptimize` / `-dontshrink` / `-dontobfuscate`.
The ticket's worry is well-founded — it just does not arise, because AGP 8.12 no
longer writes the line at all.

**What _does_ protect the widget receivers.** `-keepnames` is parsed as
`-keep,allowshrinking` (`parseRuleTypeAndModifiers`: `acceptString("names")` →
`setType(KEEP)` + `setAllowsShrinking(true)`, and nothing else). `allowOptimization`
stays false, so `KeepInfo.isPinned(configuration)` —
`!isOptimizationAllowed(configuration) || !isShrinkingAllowed(configuration)` — is
true for the class. The horizontal class merger's
[`NoKeepRules`](https://r8.googlesource.com/r8/+/refs/heads/8.12/src/main/java/com/android/tools/r8/horizontalclassmerging/policies/NoKeepRules.java)
policy refuses to merge any type it finds pinned. So
`-keepnames class * extends com.reactnativeandroidwidget.RNWidgetProvider`
(already in `app.config.ts`) **does** hold the generated receivers out of class
merging and out of renaming, on R8's own keep-info machinery rather than on the
dead `-optimizations` line. It still permits _removal_ if the class is unreachable —
`allowshrinking` is exactly that — which the manifest declaration and the
AAPT-generated keeps cover. Ticket 6 owns the final ruling; this is the mechanism
it should reason from.

---

## 3. Does the optimize file set `-repackageclasses`? **No — and R8 8.12 does not repackage by default either.**

The file, printed in full in §1's diff basis, contains no `-repackageclasses` and
no `-flattenpackagehierarchy`. The swap is therefore **not** a side-effect route to
Play's _Repackage classes_ row.

R8 8.12 does honour both directives when you write them — `REPACKAGE_CLASSES` and
`FLATTEN_PACKAGE_HIERARCHY` are first-class constants in the parser with
ProGuard's override-warning semantics. (⚠️ `-dontrepackage` does **not** exist in
R8 8.12's parser — no occurrence of the string in
`ProguardConfigurationParser.java` @ `8.12`. It is a later addition, which fits:
there is nothing to opt out of until 9.1 makes repackaging a default.) The
question is the _default_, and on R8 8.12 the default is not repackaging:

`ProguardConfiguration.java` @ `8.12`, `Builder.build()`:

```java
if (packageObfuscationMode == PackageObfuscationMode.NONE && obfuscating) {
  packageObfuscationMode = PackageObfuscationMode.MINIFICATION;
}
```

The 8.12 `PackageObfuscationMode` enum has exactly four values — `NONE`,
`MINIFICATION`, `REPACKAGE`, `FLATTEN` — and `MINIFICATION` is documented in place
as _"In practice this falls back to FLATTEN but with keeping package-names."_
Reaching `REPACKAGE` requires an explicit `-repackageclasses`.

**This changes at AGP 9.1, not 9.0.** R8 `9.1` adds a fifth `DEFAULT` value and
resolves it:

```java
if (packageObfuscationMode.isDefault()) {
  if (!getTestingOptions().enableRepackagingByDefault) { return getPackageObfuscationModeForNone(); }
  if (isGeneratingClassFiles() && !getTestingOptions().enableRepackagingByDefaultForCf) { … }
  return PackageObfuscationMode.REPACKAGE;
}
```

matching Google's own wording on
<https://developer.android.com/topic/performance/app-optimization/global-options>:
_"Since Android Gradle Plugin (AGP) 9.1, this is the default configuration for
apps. To opt out of this optimization, use `-dontrepackage`."_

**Ruling for ticket 6:** chasing the _Repackage classes_ row is a **separate,
deliberate choice** — one extra line, `-repackageclasses ''` — not something the
file swap drags along. It carries its own reflection risk (anything that does
`Class.forName` on a package-qualified name, or reasons about packages) and should
be decided on its own merits, ideally in its own change.

---

## 4. What "optimisation" concretely comprises, and what full mode already does

This project already runs R8 **full mode** (default since AGP 8.0) _and_
`-dontoptimize` (from `proguard-android.txt`). The two are orthogonal: full mode
is `!forceProguardCompatibility`; optimising is `proguardConfiguration.isOptimizing()`.

`-dontoptimize` takes effect through one constructor branch in
`InternalOptions` @ `8.12`:

```java
if (!proguardConfiguration.isOptimizing()) {
  // TODO(b/171457102): Avoid the need for this.
  // -dontoptimize disables optimizations by flipping related flags.
  disableAllOptimizations();
}
```

and `disableAllOptimizations()` is exactly:

```java
void disableAllOptimizations() {
  disableGlobalOptimizations();
  enableNameReflectionOptimization = false;
  enableStringConcatenationOptimization = false;
}

public void disableGlobalOptimizations() {
  enableClassInlining = false;
  enableDevirtualization = false;
  enableEnumUnboxing = false;
  outline.enabled = false;
  enableEnumValueOptimization = false;
  enableSideEffectAnalysis = false;
  enableTreeShakingOfLibraryMethodOverrides = false;
  enableInitializedClassesAnalysis = false;
  callSiteOptimizationOptions.disableOptimization();
  horizontalClassMergerOptions.setRestrictToSynthetics();
  verticalClassMergerOptions.disable();
}
```

### Already running today, with `-dontoptimize` set

| Pass                                                                                                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tree shaking / shrinking**                                                                                                      | `enableTreeShaking = proguardConfiguration.isShrinking()` — independent of `-dontoptimize`.                                                                                                                                                                                                                                                                                                                 |
| **Minification (renaming)**                                                                                                       | `enableMinification = proguardConfiguration.isObfuscating()` — independent. The 93% obfuscation figure in `docs/releasing.md` is this, not optimisation.                                                                                                                                                                                                                                                    |
| **Resource shrinking**                                                                                                            | Separate machinery entirely (`android.r8.optimizedResourceShrinking`, already on — #2522).                                                                                                                                                                                                                                                                                                                  |
| **String-switch rewriting**                                                                                                       | `isStringSwitchConversionEnabled() { return enableStringSwitchConversion && !debug; }` — **not gated on `isOptimizing()`**. Same for `isSwitchRewritingEnabled()`. Runs today.                                                                                                                                                                                                                              |
| **Inlining (narrow)**                                                                                                             | `InlinerOptions.isEnabled() { return enableInlining && !options.debug; }`, with the in-source comment: _"Note that this is deliberately enabled in release mode even when optimizations and shrinking are disabled, since we still allow inlining of javac synthetic lambda methods into their R8 generated accessor methods."_ So the inliner runs; with `-dontoptimize` its remit is that synthetic case. |
| **Horizontal class merging (synthetics only)**                                                                                    | `setRestrictToSynthetics()`, and `isRestrictedToSynthetics() { return restrictToSynthetics \|\| !isOptimizing() \|\| !isShrinking(); }`. The pass runs; it merges R8's own synthetics, never app classes.                                                                                                                                                                                                   |
| **Unused-interface removal, redundant field-load elimination, loop unrolling, service-loader rewriting, enum switch-map removal** | `enableUnusedInterfaceRemoval`, `enableRedundantFieldLoadElimination`, `enableLoopUnrolling`, `enableServiceLoaderRewriting`, `enableEnumSwitchMapRemoval` are all `true` and **not** reset by `disableGlobalOptimizations()`.                                                                                                                                                                              |

### Newly enabled by the swap

| Pass                                                                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **General inlining and class inlining**                                              | `enableClassInlining = false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Devirtualisation**                                                                 | `enableDevirtualization = false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Enum unboxing**                                                                    | `enableEnumUnboxing = false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Enum value optimisation**                                                          | `enableEnumValueOptimization = false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Method-signature rewriting, unused-argument removal, method staticizing**          | The argument propagator: `CallSiteOptimizationOptions.isEnabled() { if (!isOptimizing() \|\| !isShrinking()) return false; return enabled; }`, plus `disableOptimization()` today. ⚠️ This is the pass most likely to break reflection — it rewrites method descriptors.                                                                                                                                                                                                                     |
| **Horizontal class merging of _app_ classes**                                        | Restricted to synthetics today; unrestricted after, subject to ~50 merge policies including `NoKeepRules` (see §2) and `RespectPackageBoundaries`.                                                                                                                                                                                                                                                                                                                                           |
| **Vertical class merging**                                                           | `verticalClassMergerOptions.disable()` today. Its own gate is `if (!enabled \|\| options.debug \|\| options.intermediate \|\| !options.isOptimizing() \|\| !options.isShrinking()) return false;` — so it needs _both_ the file swap and shrinking, which is already on.                                                                                                                                                                                                                     |
| **Outlining**                                                                        | `outline.enabled = false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Side-effect / initialized-classes analysis, library-method-override tree shaking** | all `false` today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Name-reflection and string-concatenation optimisation**                            | the two extras in `disableAllOptimizations()` beyond the global set.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Access modification (publicizing)**                                                | Two routes, both closed today. `AccessModifierOptions.isAccessModificationEnabled()` returns true if `-allowaccessmodification` is present, **or** if `!forceProguardCompatibility && isOptimizing()`. Today: no rule (it lives in the _optimize_ file) and `isOptimizing()` false → the `AccessModifier.run` pass is a no-op. After the swap both routes open. This widens visibility, which in turn enlarges what repackaging and cross-package horizontal merging are _allowed_ to touch. |

### ⚠️ The map correction #2593 needs

**"The optimisation pass genuinely never runs" is too strong.** Some optimisation
demonstrably runs today under full mode with `-dontoptimize`: string-switch
rewriting, switch rewriting, redundant field-load elimination, loop unrolling,
unused-interface removal, synthetic horizontal merging, and synthetic-lambda
inlining. R8's own comment on the inliner says so in as many words.

The accurate framing is narrower and more useful: **`-dontoptimize` switches off
R8's whole-program, interprocedural optimisation layer** — inlining, both class
mergers, enum unboxing, devirtualisation, argument propagation, outlining and
publicizing — while leaving the intraprocedural IR cleanups, shrinking and
minification running. That is also the honest risk framing: the passes the swap
turns on are precisely the ones that change _shapes_ (class identity, method
descriptors, visibility), which is why reflection-dependent code is what breaks.

⚠️ Separately, and against the map's "no primary source ties Play's `-` to
`-dontoptimize`": nothing found here ties them either. This file does not close
that question; ticket 4 still owns it.

---

## 5. What AGP 9.0 actually does: a **hard build error**

Read out of the shipped `gradle-9.0.0.jar`, not from the release notes.

`com.android.build.gradle.ProguardFiles` gains a constant:

```java
public static final java.lang.String DONTOPTIMIZE_DISALLOWED_MESSAGE =
  "`getDefaultProguardFile('proguard-android.txt')` is no longer supported since it includes "
+ "`-dontoptimize`, which prevents R8 from performing many optimizations. Instead use "
+ "`getDefaultProguardFile('proguard-android-optimize.txt)`, and if needed, temporarily use "
+ "`-dontoptimize` in a custom keep rule file while fixing breakages.";
```

and `CommonExtensionImpl.getDefaultProguardFile(String)` reports it:

```
15: getstatic  BooleanOption.R8_PROGUARD_ANDROID_TXT_DISALLOWED
18: invokevirtual ProjectOptions.get(BooleanOption):Z
21: ifeq 60
24: aload_1
25: getstatic  ProguardFiles$ProguardFile.DONT_OPTIMIZE.fileName
31: invokestatic Intrinsics.areEqual(...)
34: ifeq 60
...
49: ldc_w  "<the message above>"
57: invokestatic IssueReporter.reportError$default(...)
```

**`IssueReporter.reportError`, not `reportWarning`.** So:

- It is a **hard error**, not a warning.
- There is **no automatic substitution** — the method falls through and still
  returns the `proguard-android.txt` path; the build fails via the issue reporter.
  You must change the argument yourself.
- The file itself is **not removed**: `ProguardFiles.ProguardFile.DONT_OPTIMIZE`
  still exists in 9.0.0 and 9.1.0, and `createProguardFile` still writes
  `-dontoptimize` for it. What is disallowed is asking `getDefaultProguardFile()`
  for it.
- It is gated on `BooleanOption.R8_PROGUARD_ANDROID_TXT_DISALLOWED`, whose Gradle
  property name is `android.r8.proguardAndroidTxt.disallowed` (string constant
  confirmed in `BooleanOption`), defaulting `false → true` in 9.0. So there is an
  escape hatch, `android.r8.proguardAndroidTxt.disallowed=false`.
  ⚠️ Google's release-notes recommendation cell names the **wrong property** for
  that opt-out — it repeats `android.r8.globalOptionsInConsumerRules.disallowed`,
  which is the next row's property. The jar is right and the doc is wrong; the
  option name above is the one the code reads.

The release notes agree, under **Behavior changes** →
`android.r8.proguardAndroidTxt.disallowed`, `false → true`
(<https://developer.android.com/build/releases/agp-9-0-0-release-notes>, fetched
2026-09-22):

> In AGP 9.0, `getDefaultProguardFile()` will only support
> `proguard-android-optimize.txt` rather than `proguard-android.txt`. This is to
> prevent accidental usage of the `-dontoptimize` flag, which is included in
> `proguard-android.txt`.

> You can explicitly specify `-dontoptimize` in a custom proguardFile if you want
> to avoid optimization, alongside using `proguard-android-optimize.txt`. Make
> sure to remove the `-dontoptimize` flag from this file if possible, as it
> reduces R8 optimization benefits.

**What this means for ticket 7's "it arrives anyway".** It arrives as a _build
failure_ at the SDK bump, with a documented one-line opt-out
(`android.r8.proguardAndroidTxt.disallowed=false`) and a documented way to keep
the current behaviour while satisfying the check (swap the file **and** add
`-dontoptimize` to `extraProguardRules` — which this project can already do,
since `expo-build-properties` exposes `extraProguardRules`). So "AGP 9.0 forces
this change" is **false**: AGP 9.0 forces a _config_ change, and gives two
separate ways to keep optimisation off. The behavioural change remains a choice.

**AGP 9.0 does not otherwise move R8 in a way that bears on this.** Full mode is
still the AGP 8.0-era default with `android.enableR8.fullMode=false` still
supported; `minifyEnabled` / `shrinkResources` defaults are unchanged.
`android.r8.optimizedResourceShrinking` flips to `true` (already opted into here —
#2522), and `android.r8.strictFullModeForKeepRules` flips to `true`, which stops
`-keep class A` implying `-keep class A { <init>(); }`. That last one is a
_separate_ keep-rule hazard arriving with the same AGP, and ticket 6 should know
about it.

**Status check (2026-09-22):** AGP 9.0 is long stable — Google Maven lists 9.0.0
and 9.0.1 as final, and the current line is 9.4.1 (9.5.0-alpha06 is the newest
published artifact). None of that changes the map's out-of-scope ruling: the AGP
version comes from the Expo SDK 57 template, blocked per expo/expo#49550.

---

## Sources

Local artefacts (read directly):

- `~/.gradle/caches/modules-2/files-2.1/com.android.tools.build/gradle/{7.2.1,7.3.1,8.2.1,8.5.0,8.10.1,8.12.0}/*/gradle-*.jar`
- `https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/{8.3.0,8.4.0,9.0.0,9.1.0}/gradle-*.jar`
- `node_modules/react-native/gradle/libs.versions.toml`,
  `node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml`,
  `node_modules/react-native/package.json`

R8 source, `r8.googlesource.com/r8`, branch `8.12` (branch `9.1` where noted),
fetched with `?format=TEXT`:

- `src/main/java/com/android/tools/r8/shaking/ProguardConfigurationParser.java`
- `src/main/java/com/android/tools/r8/shaking/ProguardConfiguration.java`
- `src/main/java/com/android/tools/r8/shaking/KeepInfo.java`
- `src/main/java/com/android/tools/r8/utils/InternalOptions.java`
- `src/main/java/com/android/tools/r8/optimize/accessmodification/AccessModifier{,Options}.java`
- `src/main/java/com/android/tools/r8/verticalclassmerging/VerticalClassMergerOptions.java`
- `src/main/java/com/android/tools/r8/horizontalclassmerging/policies/NoKeepRules.java`
- `compatibility-faq.md`

Google documentation:

- <https://developer.android.com/build/releases/agp-9-0-0-release-notes>
- <https://developer.android.com/topic/performance/app-optimization/global-options>
- <https://android.googlesource.com/platform/tools/base/+/refs/heads/mirror-goog-studio-main/build-system/gradle-core/src/main/resources/com/android/build/gradle/proguard-optimizations.txt>

## Could not verify

- **The commit that removed the `-optimizations` line.** `android.googlesource.com`
  `+log/` returns 403 without sign-in. Bisected to "after 8.2.1, at or before
  8.3.0" from the shipped jars instead.
- **A currently-live Google doc saying R8 ignores `-optimizations`.**
  `developer.android.com/build/shrink-code` now redirects to the restructured
  app-optimization docs, and the old sentence ("R8 ignores any ProGuard rules that
  attempt to modify default optimizations, such as `-optimizations` and
  `-optimizationpasses`") is not on any live page found. `web.archive.org` was not
  reachable from this environment. R8's own parser source settles it regardless —
  that is the stronger source anyway.
- **Whether AGP 9.0's `reportError` fails configuration immediately or at sync.**
  `IssueReporter.reportError` is the error channel either way; the precise failure
  point was read as bytecode, not observed in a build.
- **Anything about how the change behaves on a device.** Nothing here was built or
  run. Per the map, that is the owner's gate.
