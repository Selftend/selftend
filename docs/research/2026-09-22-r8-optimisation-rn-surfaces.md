# What R8's optimisation pass can break in React Native 0.86, and what the ecosystem already keeps

Research for [What can R8's optimisation pass break in React Native 0.86 and this app's native surface, and what does the ecosystem keep?](https://github.com/Selftend/selftend/issues/2680), under map [R8 optimisation passes — map](https://github.com/Selftend/selftend/issues/2673).

**All facts checked 2026-09-22** against the installed `node_modules`, the AGP jar in the local Gradle cache, and primary sources (R8 source on `r8.googlesource.com`, AOSP, `developer.android.com`, library repositories).

This document **does not rule on whether to take the change**. It names surfaces, mechanisms and rules so that the decision tickets and the device runbook work from a list rather than a hunch.

## Versions this was read against

| Thing                                                      | Version                                             | How established                                                                |
| ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `react-native`                                             | 0.86.0                                              | `node_modules/react-native/package.json`                                       |
| `expo`                                                     | 57.0.7                                              | `node_modules/expo/package.json`                                               |
| `expo-modules-core`                                        | 57.0.6                                              | `node_modules/expo-modules-core/package.json`                                  |
| `expo-notifications`                                       | 57.0.6                                              | `node_modules/expo-notifications/package.json`                                 |
| `react-native-reanimated`                                  | 4.5.0                                               | `node_modules/react-native-reanimated/package.json`                            |
| `react-native-worklets`                                    | 0.10.0                                              | `node_modules/react-native-worklets/package.json`                              |
| `react-native-screens`                                     | 4.25.2                                              | `node_modules/react-native-screens/package.json`                               |
| `@sentry/react-native`                                     | 8.19.0 (pins `io.sentry:sentry-android` **8.49.0**) | `node_modules/@sentry/react-native/android/build.gradle:181`                   |
| `expo-secure-store` / `expo-image-picker` / `expo-haptics` | 57.0.1 / 57.0.5 / 57.0.2                            | package manifests                                                              |
| `react-native-android-widget`                              | 0.20.3                                              | `node_modules/react-native-android-widget/package.json`                        |
| AGP (default ProGuard files read from)                     | 8.12.0                                              | `~/.gradle/caches/.../com.android.tools.build/gradle/8.12.0/gradle-8.12.0.jar` |

---

## Part 0 — the R8 semantics this whole ticket turns on

The ticket's framing is that **`-keepnames` prevents renaming but not class merging or repackaging.** Read against R8's own source, **that framing is wrong on merging and only conditionally right on repackaging.** The correction is load-bearing, so it is established from source rather than asserted.

### 0.1 What each keep option is, by definition

ProGuard's manual (the grammar R8 implements):

> **`-keepnames`** — "Short for `-keep,allowshrinking` _class\_specification_"
>
> **`allowoptimization`** — "Specifies that the entry points specified in the `-keep` option may be optimized, even if they have to be preserved otherwise."

Source: [ProGuard manual — Usage](https://www.guardsquare.com/manual/configuration/usage).

So `-keepnames X` == `-keep,allowshrinking X`: shrinking allowed, obfuscation **not** allowed, optimisation **not** allowed.

### 0.2 What R8 does with those modifiers

`RootSetBuilder.evaluateKeepRule` (R8 `main`), verbatim:

```java
if (options.isMinificationEnabled() && !modifiers.allowsObfuscation) {
  itemJoiner.computeIfAbsent().disallowMinification();
  markAsUsed.execute();
}

if (options.isOptimizationEnabled() && !modifiers.allowsOptimization) {
  itemJoiner.computeIfAbsent().disallowOptimization();
  markAsUsed.execute();
}
```

Source: [`src/main/java/com/android/tools/r8/shaking/rootset/RootSetBuilder.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/rootset/RootSetBuilder.java).

**A `-keepnames` rule therefore calls `disallowMinification()` _and_ `disallowOptimization()`.** It is not a name-only rule in R8; it is a name-and-optimisation rule that merely permits removal.

### 0.3 Class merging is gated on optimisation

`KeepClassInfo` (R8 `main`), verbatim:

```java
public boolean isHorizontalClassMergingAllowed(GlobalKeepInfoConfiguration configuration) {
  return isOptimizationAllowed(configuration)
      && isShrinkingAllowed(configuration)
      && internalIsHorizontalClassMergingAllowed();
}

public boolean isVerticalClassMergingAllowed(GlobalKeepInfoConfiguration configuration) {
  return isOptimizationAllowed(configuration)
      && isShrinkingAllowed(configuration)
      && internalIsVerticalClassMergingAllowed();
}
```

Source: [`shaking/KeepClassInfo.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/KeepClassInfo.java).

Because `-keepnames` sets `allowOptimization = false`, `isOptimizationAllowed` is false, so **both horizontal and vertical class merging are disallowed for a `-keepnames`-matched class.**

A second, independent confirmation: the horizontal merger has a dedicated policy, `NoKeepRules`, which excludes a class from merging if the class **or any of its members** is pinned:

```java
private void processClass(DexProgramClass clazz) {
  DexType type = clazz.getType();
  boolean pinHolder = isPinned(keepInfo.getClassInfo(clazz), clazz.getClassSignature());
  for (DexEncodedMember<?, ?> member : clazz.members()) {
    if (isPinned(keepInfo.getMemberInfo(member, clazz), member.getGenericSignature())) {
      pinHolder = true;
      ...
    }
  }
  if (pinHolder) {
    dontMergeTypes.add(type);
  }
}
```

and "pinned" is defined in `KeepInfo` as:

```java
public boolean isPinned(GlobalKeepInfoConfiguration configuration) {
  return !isOptimizationAllowed(configuration) || !isShrinkingAllowed(configuration);
}
```

Sources: [`horizontalclassmerging/policies/NoKeepRules.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/horizontalclassmerging/policies/NoKeepRules.java), [`shaking/KeepInfo.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/KeepInfo.java).

Two consequences worth naming separately, because they do a lot of work later in this document:

- **A `-keepclassmembers` rule protects its holder class from horizontal merging**, even though it does not keep the class. Pinning a member pins the holder for merging purposes.
- **A class with any `native` method is never horizontally merged at all**, by policy, independent of keep rules:

  ```java
  public boolean canMerge(DexProgramClass program) {
    return !Iterables.any(program.methods(), DexEncodedMethod::isNative);
  }
  ```

  Source: [`horizontalclassmerging/policies/NoNativeMethods.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/horizontalclassmerging/policies/NoNativeMethods.java).

### 0.4 Repackaging is off unless asked for — today

`KeepClassInfo`:

```java
public boolean isRepackagingAllowed(GlobalKeepInfoConfiguration configuration) {
  return configuration.getPackageObfuscationMode().isSome() && internalIsRepackagingAllowed();
}
```

`ProguardConfiguration.Builder` defaults `packageObfuscationMode = PackageObfuscationMode.DEFAULT`, and the only places the parser changes it are the `-repackageclasses` and `-flattenpackagehierarchy` handlers (`configurationConsumer.enableRepackageClasses(...)` / `enableFlattenPackageHierarchy(...)`).

Sources: [`shaking/KeepClassInfo.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/KeepClassInfo.java), [`shaking/ProguardConfiguration.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/ProguardConfiguration.java), [`shaking/ProguardConfigurationParser.java`](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/shaking/ProguardConfigurationParser.java).

Google's own documentation says the same from the other side, and gives the date this stops being true:

> **`-repackageclasses [<optional-package-name>]`** — "Repackages classes into a single package to reduce app size… **Since Android Gradle Plugin (AGP) 9.1, this is the default configuration for apps.** To opt out of this optimization, use `-dontrepackage`."

Source: [Add global options — Android Developers](https://developer.android.com/topic/performance/app-optimization/global-options).

**So: on AGP 8.12 repackaging does not happen unless the config plugin adds `-repackageclasses`.** It arrives by default with AGP 9.1. That is a forcing-function fact for the "take it now or wait for AGP 9" ruling, and it is a reason _not_ to bundle _Repackage classes_ into the same change — it is a separate, later, separately-testable step.

Also note what repackaging _is_: it changes a class's **package**, not its **simple name**. `getClass().getSimpleName()` is unaffected by repackaging by construction. And a class whose minification is disallowed cannot have its descriptor rewritten at all.

### 0.5 What `proguard-android-optimize.txt` actually contains on AGP 8.12

⚠️ **The widely-quoted AOSP copy of this file is not the file AGP uses.** The [AOSP `sdk/files/proguard-android-optimize.txt`](https://android.googlesource.com/platform/sdk/+/master/files/proguard-android-optimize.txt) contains `-optimizations !…,!class/merging/*`, `-optimizationpasses 5` and `-dontpreverify`. **That file is dead.** Its own AGP replacement says so:

> "Starting with version 2.2 of the Android plugin for Gradle, this file is distributed together with the plugin and unpacked at build-time. The files in `$ANDROID_HOME` are no longer maintained and will be ignored by new version of the Android plugin for Gradle."

AGP composes the default files at build time from three resources inside `gradle-8.12.0.jar` (`com/android/build/gradle/ProguardFiles.class`, read from the jar): `proguard-header.txt` + a middle section + `proguard-common.txt`. The middle section is the only difference between the two files:

- `proguard-android.txt` → the literal string `-dontoptimize` (plus its comment).
- `proguard-android-optimize.txt` → the resource `proguard-optimizations.txt`, whose **entire contents** are:

  ```
  -allowaccessmodification
  ```

**So the swap this map is about is exactly two edits: `-dontoptimize` goes away, `-allowaccessmodification` appears.** Nothing else changes. In particular there is **no** `-optimizations`, **no** `-optimizationpasses`, **no** `-repackageclasses` and **no** `-flattenpackagehierarchy` in AGP's optimize file.

This also settles a trap: even if someone copies the AOSP file's `-optimizations !class/merging/*` across in the belief it disables merging, **R8 ignores it.** `ProguardConfigurationParser` routes both `-optimizations` and `-optimizationpasses` through `infoIgnoringOptions`, emitting `Ignoring option: -optimizations` / `Ignoring option: -optimizationpasses`; `-dontpreverify` and `-dontoptimize` handling live in the ignored/flag lists. There is **no supported way to turn individual R8 optimisations off.** It is all-or-nothing per keep rule.

The shared `proguard-common.txt` (AGP 8.12) is also worth having on the record, because two of its lines matter below:

```
-keepattributes AnnotationDefault,
                EnclosingMethod,
                InnerClasses,
                RuntimeVisibleAnnotations,
                RuntimeVisibleParameterAnnotations,
                RuntimeVisibleTypeAnnotations,
                Signature
...
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}
```

### 0.6 The other thing already on by default

R8 **full mode** is the AGP 8.0+ default ("Full mode by default: R8 full mode provides significantly more powerful optimization. It is enabled by default." — [Enable app optimization](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)). It is already in force in this app's current shipped builds, so nothing in this document treats full-mode behaviour as new risk. Two full-mode clauses are still worth carrying, from [R8 compatibility FAQ](https://r8.googlesource.com/r8/+/refs/heads/master/compatibility-faq.md):

> "Attributes (such as `Signature`) and annotations are only kept for classes, methods and fields which are matched by keep rules even when `-keepattributes` is specified."

> "Access modification is enabled by default when optimizations are enabled (`-allowaccessmodification`)."

The second means the `-allowaccessmodification` that the optimize file adds may be partly redundant under full mode — but it is explicit and harmless either way.

### 0.7 The minimal vocabulary, for the rules below

| Rule                                         | Shrink  | Rename  | Optimise (inline / merge)                              | Note                                                                |
| -------------------------------------------- | ------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| `-keep X`                                    | ✗       | ✗       | ✗                                                      | strongest; blocks everything                                        |
| `-keepnames X` (= `-keep,allowshrinking`)    | ✓       | ✗       | ✗                                                      | removable if unused; never renamed, never merged, never inlined     |
| `-keep,allowshrinking,allowobfuscation X`    | ✓       | ✓       | ✗                                                      | **the precise "don't merge me" rule** when the name does not matter |
| `-keep,allowoptimization,allowobfuscation X` | ✗       | ✓       | ✓                                                      | "keep it present, do what you like to it"                           |
| `-keepclassmembers C { m; }`                 | class ✓ | class ✓ | class **✗ for horizontal merging** (via `NoKeepRules`) | members not removed, not renamed, not optimised                     |

(✓ = R8 may do it, ✗ = R8 may not.)

---

## Part 1 — what already ships, and whether it is optimisation-proof

Every file below was read from the installed tree on 2026-09-22.

### 1.1 `react-native` 0.86.0

`node_modules/react-native/ReactAndroid/proguard-rules.pro`, shipped via `consumerProguardFiles("proguard-rules.pro")` (`ReactAndroid/build.gradle.kts:560`). The whole body:

```
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep @com.facebook.proguard.annotations.DoNotStripAny class * {
    *;
}
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.jni.annotations.DoNotStrip *;
}
-keep @com.facebook.jni.annotations.DoNotStripAny class * {
    *;
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }
-keep,includedescriptorclasses class com.facebook.react.internal.turbomodule.core.** { *; }

# hermes
-keep class com.facebook.jni.** { *; }

# okio
-keep class sun.misc.Unsafe { *; }
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn okio.**

# yoga
-keep,allowobfuscation @interface com.facebook.yoga.annotations.DoNotStrip
-keep @com.facebook.yoga.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.yoga.annotations.DoNotStrip *;
}

# fresco
-keep public class com.facebook.imageutils.** {
   public *;
}
```

**Verdict: optimisation-proof, with one named gap.**

- Every `-keep …` here carries no `allowoptimization`, so every matched class is `isPinned` → never merged, never inlined, never renamed. That covers **all `NativeModule` implementors and all their supertypes** (ProGuard's `implements` matches indirect implementors, so a codegen'd `Native…Spec` abstract class matches too), the whole `com.facebook.react.bridge` / `turbomodule.core` / `internal.turbomodule.core` packages, and everything annotated `@DoNotStrip`.
- The only `-keepclassmembers` entries are the `@ReactProp` / `@ReactPropGroup` ones and the `native <methods>` one. By §0.3 these still pin the holder class against horizontal merging.
- ⚠️ **One structural gap: there is no rule for `ViewManager` subclasses as classes.** They are kept alive by being referenced from `ReactPackage.createViewManagers()`, and their `@ReactProp` methods are pinned, which (per `NoKeepRules`) also protects the holder from merging. A `ViewManager` with **no** `@ReactProp` method at all has no such pin — and in this app that is most of them. §2.2 traces where that leads; the short answer is "nowhere harmful that could be traced", and the rule proposed there is defensive rather than corrective.
- ⚠️ `-keep,allowobfuscation @interface …DoNotStrip` lets the annotation **type** be renamed. That is fine — R8 matches `@annotation` specifications against class-file annotations at rule-evaluation time, before renaming.

#### ☠️ Two more RN rule files exist in the installed tree and are **not** applied to this app

`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/bridge/reactnative.pro` and `.../com/facebook/hermes/reactexecutor/fbjni.pro` are Meta's **internal (BUCK) shrinker configs**. They sit under a Java _source_ directory, and `ReactAndroid/build.gradle.kts` declares only `consumerProguardFiles("proguard-rules.pro")` — grepping that build file (and `publish.gradle`) for `reactnative.pro` / `fbjni.pro` returns nothing. **They do not reach an OSS Gradle consumer.** Do not cite them as coverage.

They matter anyway, as evidence of what Meta itself considers necessary. `reactnative.pro` contains, among others:

```
-keepnames class * extends com.facebook.react.uimanager.ViewManager
-keepnames class * extends com.facebook.react.uimanager.ReactShadowNode
-keepnames class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepnames class * extends com.facebook.react.bridge.CxxModuleWrapper {*; }
-keep class **$$PropsSetter
-keep class **$$ReactModuleInfoProvider
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod *;
    public <init>(...);
}
```

and `fbjni.pro` contains the hybrid-object rules:

```
-keepclassmembers class * {
    com.facebook.jni.HybridData *;
    <init>(com.facebook.jni.HybridData);
}
-keepclasseswithmembers class * {
    com.facebook.jni.HybridData *;
}
```

**Meta pins `ViewManager` and `ReactShadowNode` names internally; the shipped consumer file does not.** That is independent support for the one rule this ticket recommends adding (§2.2) — and it is also a reminder that the `HybridData` constructor pin is, in OSS, carried only by `@DoNotStrip` annotations rather than by a structural rule.

### 1.2 `expo-modules-core` 57.0.6

`node_modules/expo-modules-core/android/proguard-rules.pro` (`consumerProguardFiles 'proguard-rules.pro'`, `android/build.gradle:95`):

```
-keep @expo.modules.core.interfaces.DoNotStrip class *
-keepclassmembers class * {
  @expo.modules.core.interfaces.DoNotStrip *;
}

-keep class * implements expo.modules.kotlin.records.Record {
  *;
}
-keep class * extends expo.modules.kotlin.sharedobjects.SharedObject
-keep enum * implements expo.modules.kotlin.types.Enumerable {
  *;
}
-keepnames class kotlin.Pair

-keep,allowoptimization,allowobfuscation class * extends expo.modules.kotlin.modules.Module {
  public <init>();
  public expo.modules.kotlin.modules.ModuleDefinitionData definition();
}

-keepclassmembers class * implements expo.modules.kotlin.views.ExpoView {
  public <init>(android.content.Context);
  public <init>(android.content.Context, expo.modules.kotlin.AppContext);
}

-keepclassmembers class * {
  expo.modules.kotlin.viewevent.ViewEventCallback *;
}
-keepclassmembers class * {
  expo.modules.kotlin.viewevent.ViewEventDelegate *;
}

-keep class * implements expo.modules.kotlin.views.ComposeProps {
  *;
}

-keepnames class * implements expo.modules.kotlin.views.ExpoView {
  *;
}

-keep interface expo.modules.kotlin.services.Service
-keep class * implements expo.modules.kotlin.services.Service {
    <init>(...);
}
```

**Verdict: optimisation-aware by design — and one rule short of the version Expo ships for optimised builds.** The `-keep,allowoptimization,allowobfuscation class * extends …Module` rule is the tell: Expo deliberately opts _its own module classes into_ optimisation while pinning them against removal. Everything reflection-critical (`Record`, `Enumerable`, `SharedObject`, `ComposeProps`, `Service`, `@DoNotStrip`) uses a plain `-keep`, which is optimisation-proof.

☠️ **But `-keep interface expo.modules.kotlin.records.Record` is absent from this version and present on Expo's `main`**, added in the same PR in which Expo turned optimisation on for its own templates. That is §3.0, and it is the single most consequential finding in this document.

On the ticket's explicit question about `DoNotStrip`: `expo/modules/core/interfaces/DoNotStrip.java` is declared

```java
@Target({ ElementType.TYPE, ElementType.FIELD, ElementType.METHOD, ElementType.CONSTRUCTOR })
@Retention(CLASS)
public @interface DoNotStrip { }
```

so it is a **compile-time marker for the shrinker only** — nothing reads it at runtime. The rules it drives (`-keep @…DoNotStrip class *` and the matching `-keepclassmembers`) are plain `-keep`-family rules with no `allow*` modifier, so **`@DoNotStrip` is honoured against optimisation, not only against shrinking.** The annotation's `CLASS` retention is irrelevant to that: R8 evaluates `@annotation` class specifications against the class file, and AGP's `-keepattributes` list (§0.5) does not include `RuntimeInvisibleAnnotations`, so the annotation simply will not appear in the output DEX — which nothing depends on.

### 1.3 `expo` 57.0.7

`node_modules/expo/android/proguard-rules.pro` (`consumerProguardFiles("proguard-rules.pro")`, `android/build.gradle:25`):

```
-keepclassmembers public class com.facebook.react.ReactActivityDelegate { public *; protected *; private ReactDelegate mReactDelegate; }
-keepclassmembers public class expo.modules.ReactActivityDelegateWrapper { protected ReactDelegate getReactDelegate(); }
-keepclassmembers public class com.facebook.react.ReactActivity { private final ReactActivityDelegate mDelegate; }
-keepclassmembers public class com.facebook.react.ReactNativeHost { protected *; }
-keepclassmembers public class expo.modules.ExpoModulesPackageList { public *; }
-keepnames class * extends expo.modules.core.BasePackage
-keepnames class * implements expo.modules.core.interfaces.Package
-keep class com.facebook.react.views.view.WindowUtilKt { *; }
-keep class com.squareup.zstd.** { *; }
```

**Verdict: mixed, but adequate.** The `-keepclassmembers` rules are member pins that also block horizontal merging of their holders (§0.3). The two `-keepnames` rules pin names **and** optimisation (§0.2). One entry is itself evidence that R8 bugs are live in this stack: `# Workaround zstd-kmp R8 issue - https://github.com/square/zstd-kmp/issues/108`.

### 1.4 `expo-notifications` 57.0.6

The entire file (`android/proguard-rules.pro`, via `consumerProguardFiles`):

```
-keep class expo.modules.notifications.** {*;}
```

**Verdict: maximally optimisation-proof and maximally blunt.** The whole package is pinned against shrinking, renaming and optimisation. Nothing to add; nothing this change can break here.

### 1.5 `react-native-reanimated` 4.5.0 and `react-native-worklets` 0.10.0

Reanimated (`android/proguard-rules.pro`, `consumerProguardFiles("proguard-rules.pro")` at `build.gradle.kts:200`):

```
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
```

Worklets (`node_modules/react-native-worklets/android/proguard-rules.pro`) — the same shape:

```
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
```

**Verdict: optimisation-proof for their own packages.** Plain `-keep … { *; }`.

### 1.6 `react-native-svg` 15.15.4

```
-keep public class com.horcrux.svg.** {*;}
```

**Verdict: optimisation-proof.** (Not on the ticket's list; found by scanning the installed tree, and included because it is one of only seven installed packages that ship any rules at all.)

### 1.7 The packages that ship **no** rules

Read directly: **`react-native-screens` 4.25.2, `expo-secure-store` 57.0.1, `expo-image-picker` 57.0.5, `expo-haptics` 57.0.2 and `react-native-android-widget` 0.20.3 ship no `proguard-rules.pro` and no `consumerProguardFiles`/`consumerProguardRules` declaration at all.** Their `android/build.gradle` files contain no occurrence of the string `proguard`.

That is not automatically a problem:

- `expo-secure-store`, `expo-image-picker` and `expo-haptics` are Expo modules — they are covered transitively by `expo-modules-core`'s rules (`Record`, `Enumerable`, `Module`, `@DoNotStrip`), which is exactly why they ship none of their own.
- `react-native-screens` is `ViewManager`-shaped and JNI-shaped; it relies on React Native's own consumer rules plus the `native <methods>` rules. Its 18 `ViewManager`s are the largest block of annotation-free, unpinned manager classes in the app — see §2.2 and §2.5.
- `react-native-android-widget` is **not** an Expo module and is **not** covered by anything upstream. It is the one genuinely uncovered library, which is why `app.config.ts` already carries rules for it. See §2.4.

### 1.8 A surface the ticket did not list: `kotlin-reflect`

`expo-modules-core/android/build.gradle:210` declares `implementation "org.jetbrains.kotlin:kotlin-reflect:${kotlinVersion}"`. Kotlin reflection is therefore in the app's dependency graph, and it works by parsing the `@kotlin.Metadata` annotation at runtime. `kotlin-reflect` ships its own consumer rules (read from `kotlin-reflect-2.1.20.jar`, `META-INF/com.android.tools/r8-from-1.6.0/kotlin-reflect.pro`):

```
-keep class kotlin.Metadata { *; }
-keepattributes InnerClasses,Signature,RuntimeVisible*Annotations,EnclosingMethod
-dontnote kotlin.internal.PlatformImplementationsKt
-dontwarn kotlin.reflect.jvm.internal.**
-dontwarn java.lang.ClassValue
-assumenosideeffects class kotlin.reflect.jvm.internal.CacheByClassKt {
    boolean useClassValue return false;
}
```

**Verdict: optimisation-proof, and it contains the one directive in the whole set whose behaviour _changes_ when optimisation is turned on.** `-assumenosideeffects` is an optimisation-only directive: under `-dontoptimize` it is inert, and when the optimisation pass runs it takes effect and folds `useClassValue` to `false`. That is JetBrains' deliberate intent (`# Do not even execute try-catch block for ClassValue`), and it is benign — but it is a concrete, named example of "the same rules, different behaviour" and belongs on the device runbook's awareness list rather than its test list.

R8 also refuses to horizontally merge classes carrying Kotlin metadata at all — there is a `NoKotlinMetadata` policy in the horizontal merger's policy set ([policies directory](https://r8.googlesource.com/r8/+/refs/heads/main/src/main/java/com/android/tools/r8/horizontalclassmerging/policies/)), which further limits exposure for the Kotlin-heavy Expo modules.

### 1.9 `@sentry/react-native` 8.19.0 / `io.sentry:sentry-android` 8.49.0

See **Part 4**. The JS package ships no `.pro` file of its own (`node_modules/@sentry/react-native/android/build.gradle` contains no `proguard` string); the rules come from the Android SDK AAR it pulls in, and those are a deliberate mix of optimisation-proof plain `-keep` and name-pinning `-keepnames` — Sentry designs its SDK to be optimised and runs its own integration suite against `proguard-android-optimize.txt`. **Symbolication survives optimisation**; the only Sentry-shaped exposure is a class-name comparison in the _React Native_ package at the installed version (§3.3).

---

## Part 2 — the known-dangerous surfaces, mechanism by mechanism

### 2.1 TurboModules / codegen — spec lookup, method names and JNI signatures

**Mechanism (read from the installed source).** In the new architecture, a legacy-interop TurboModule's JS-visible method list is built reflectively in `TurboModuleInteropUtils.getMethodDescriptorsFromModule`:

```kotlin
private fun getMethodsFromModule(module: NativeModule): Array<Method> {
  var classForMethods: Class<out NativeModule> = module.javaClass
  val superClass = classForMethods.superclass as? Class<out NativeModule>
  if (superClass != null && TurboModule::class.java.isAssignableFrom(superClass)) {
    classForMethods = superClass
  }
  return classForMethods.declaredMethods
}
```

(`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/turbomodule/core/TurboModuleInteropUtils.kt`.)

Three things are load-bearing at runtime, not compile time: the **method name** (`method.name` becomes the JS method name), the **parameter and return types** (`createJniSignature`), and the **class hierarchy** (the generated `Native…Spec` abstract superclass is what gets inspected). `ReactPackageTurboModuleManagerDelegate` additionally reads `moduleClass.getAnnotation(ReactModule::class.java)` to get the module's registered name, and `@ReactModule`/`@ReactMethod` are both `@Retention(AnnotationRetention.RUNTIME)` (read from `module/annotations/ReactModule.kt` and `bridge/ReactMethod.kt`).

**Already covered? Yes.** `-keep class * implements com.facebook.react.bridge.NativeModule { *; }` is a plain `-keep` with `{ *; }`, matching both the concrete module and its `Native…Spec` supertype. That pins names, members, and — because no `allowoptimization` is present — blocks inlining, vertical merging (which would collapse the spec into the module and change `superclass`) and horizontal merging. `@ReactModule`/`@ReactMethod` survive because their holders are matched by that keep rule, which is what R8 full mode requires for annotation retention (§0.6).

**Rule needed: none.**

### 2.2 `ViewManager` registration and `@ReactProp`

**Mechanism.** `ViewManagerPropertyUpdater.findGeneratedSetter` does

```kotlin
val setterClass = Class.forName("$clsName$\$PropsSetter")
```

and on `ClassNotFoundException` — which is the **normal OSS path**, because the `$$PropsSetter` annotation processor does not run in open-source builds — falls back to `FallbackViewManagerSetter`, which reflects over the manager class:

```java
Method[] declaredMethods = cls.getDeclaredMethods();
...
ReactProp annotation = method.getAnnotation(ReactProp.class);
if (annotation != null) {
  Class<?>[] paramTypes = method.getParameterTypes();
  if (paramTypes.length != 2) { throw new RuntimeException("Wrong number of args for prop setter: …"); }
  if (!View.class.isAssignableFrom(paramTypes[0])) { throw new RuntimeException("First param should be a view subclass…"); }
  props.put(annotation.name(), createPropSetter(annotation, method, paramTypes[1]));
}
```

(`uimanager/ViewManagersPropertyCache.java`, `uimanager/ViewManagerPropertyUpdater.kt`.) Note the prop **name** comes from the annotation, not the method name, so renaming is harmless; but the **set of declared methods on the runtime class** is not harmless. Note also that `ClassFinder.canLoadClassesFromAnnotationProcessors()` returns `BuildConfig.IS_INTERNAL_BUILD`, i.e. `false` in OSS, so the annotation-processor `Class.forName` paths in `NativeModuleRegistry` etc. are dead code here.

**Already covered? Mostly.** `-keepclassmembers class * { @ReactProp <methods>; }` and its `ReactPropGroup` twin pin those methods, which by `NoKeepRules` (§0.3) also excludes the holder class from horizontal merging. So a `ViewManager` that has at least one `@ReactProp` method cannot be merged with another, and the `getDeclaredMethods()` union hazard does not arise.

⚠️ **Where the gap is, and — having chased it — how far it actually goes.** A `ViewManager` with **no** `@ReactProp`/`@ReactPropGroup` method at all is pinned by nothing, so R8 may horizontally merge it with another such class. This is not hypothetical: **all 18 `ViewManager` classes in `react-native-screens` 4.25.2 contain no `@ReactProp`** (they use codegen delegates instead — `ScreenViewManager.kt` overrides `getDelegate()` to return `RNSScreenManagerDelegate`), and so do the four in `react-native-reanimated` and three of four in `react-native-safe-area-context`. Grepped 2026-09-22.

But every concrete path from "merged" to "broken" that I could trace **self-closes**, and saying so is more useful than leaving a vague warning:

- **The prop-update path does not reach reflection for these managers at all.** `ViewManager.updateProperties` routes through `getOrCreateViewManagerDelegate()`, and a codegen'd manager returns its generated delegate; only a manager _without_ a delegate falls back to `ViewManagerPropertyUpdater.GenericViewManagerDelegate`.
- **`getNativeProps()` does reach reflection for every manager** (`ViewManagerPropertyUpdater.getNativeProps(getClass(), getShadowNodeClass())`), **but two classes can only be merged if neither has an `@ReactProp` method** — because such a method is pinned and `NoKeepRules` therefore makes its holder unmergeable (§0.3). The union of two annotation-free classes is still annotation-free, so the scan returns the same empty map it would have returned unmerged.
- **Vertical merging does not change the answer either**, because `getNativePropSettersForViewManagerClass` recurses up the superclass chain and unions: `props = new HashMap<>(getNativePropSettersForViewManagerClass(cls.getSuperclass())); extractPropSettersFromViewManagerClassDefinition(cls, props);`. Moving a method between a class and its parent preserves the union. The recursion's terminator, `if (cls == ViewManager.class) return EMPTY_PROPS_MAP;`, stays reachable because `ViewManager` has many subclasses and R8's vertical merger needs a single one.
- The loud failure is still there if it ever does go wrong — `throw new RuntimeException("Wrong number of args for prop setter: …")` and `throw new RuntimeException("First param should be a view subclass to be updated: …")` — which is the good news: this surface fails noisily, unlike the widget one (§2.4).

⚠️ **None of that means merging is theoretical in this stack — it demonstrably is not.** [sentry-react-native#6691](https://github.com/getsentry/sentry-react-native/issues/6691) records R8 8.12.14, on a stock AGP toolchain with RN 0.86.3, merging `com.swmansion.rnscreens.events.ScreenAppearEvent` into `com.facebook.react.views.drawer.events.DrawerClosedEvent` (§3.3). Merging happens here; it is the _`ViewManager` prop-reflection_ consequence specifically that closes.

**Rule needed.** Two candidates, both defensible:

```
# minimal — blocks optimisation only; still shrinkable, still renameable
-keep,allowshrinking,allowobfuscation class * extends com.facebook.react.uimanager.ViewManager
-keep,allowshrinking,allowobfuscation class * extends com.facebook.react.uimanager.ReactShadowNode
```

```
# what Meta itself uses internally (see §1.1) — also pins the names
-keepnames class * extends com.facebook.react.uimanager.ViewManager
-keepnames class * extends com.facebook.react.uimanager.ReactShadowNode
```

The first disallows optimisation only (§0.2): the classes may still be shrunk if unused and renamed, but never merged or inlined — so it costs essentially nothing in DEX size. The second is what `ReactAndroid/src/main/java/com/facebook/react/bridge/reactnative.pro` carries for Meta's internal builds; it additionally keeps the names, which costs a little size and buys readable stack frames.

**Recommendation: take the `-keepnames` pair — as cheap insurance, not as a fix for a demonstrated break.** The honest status is: no path from "R8 merged two `ViewManager`s" to "the app misbehaves" survived being traced, so this rule is **defensive, not load-bearing**. It is recommended anyway because (a) it is what upstream applies to itself, (b) it costs two class-name tables, and (c) the reasoning above depends on a chain of R8 policy details that a future R8 version could change without anyone noticing, on a pipeline with no rollback. A later ticket may drop it on size grounds without contradicting this one. `ReactShadowNode` is included because `ViewManagersPropertyCache.extractPropSettersFromShadowNodeClassDefinition` runs the identical `getDeclaredMethods()` scan against shadow-node classes.

**Unverified:** I did not establish empirically that R8 _does_ merge any of this app's `ViewManager` classes — that needs a build and a `mapping.txt` read, which is the local-measured-build item on the build list, not this ticket.

### 2.3 `expo-modules-core`'s `DoNotStrip`

Answered in §1.2: **honoured against optimisation, not only shrinking**, because the rules that implement it are plain `-keep` / `-keepclassmembers` with no `allow*` modifier. **Rule needed: none.**

### 2.4 `react-native-android-widget` — `getClass().getSimpleName()`

**Mechanism, read from the installed library.** `RNWidgetProvider.java` calls `getClass().getSimpleName()` in four places (lines 25, 38, 73, 153) and passes it as the widget name into `RNWidgetJsCommunication.buildData(...)`, which the JS task handler matches against the widget catalog. The receivers are generated by the config plugin as empty subclasses:

```java
public class <WidgetName> extends RNWidgetProvider { }
```

in package `<applicationId>.widget`, and declared in `AndroidManifest.xml` as `<receiver android:name=".widget.<WidgetName>">` (`node_modules/react-native-android-widget/app.plugin.js`, `withWidgetProviderClass` / `withWidgetReceiver`).

⚠️ **There is a second name dependency the app.config.ts comment does not mention, and it is the more dangerous one.** `RNWidgetUtil.getWidgetProviderClassName` goes the _other_ way — from a JS widget name back to a class:

```java
for (AppWidgetProviderInfo providerInfo : installedProviders) {
    if (providerInfo.provider.getPackageName().equals(context.getPackageName())
        && providerInfo.provider.getShortClassName().endsWith("." + widgetName)) {
        return providerInfo.provider.getClassName();
    }
}
return null;
```

and `getWidgetIds` returns `new int[]{}` when that lookup returns `null`. So a renamed receiver makes `requestWidgetUpdate` a **silent no-op**: the widget simply never refreshes, with no crash, no log and **nothing in Sentry**. Given that this pipeline's only production early warning is Sentry (map §"the fact that sets the bar"), this is precisely the failure mode that a device gate exists to catch and telemetry cannot.

**Does the existing `-keepnames` rule survive merging and repackaging?** Yes, on the evidence:

- **Renaming — blocked.** `-keepnames` → `disallowMinification()` (§0.2).
- **Class merging — blocked.** `-keepnames` → `disallowOptimization()` → `isHorizontalClassMergingAllowed` and `isVerticalClassMergingAllowed` are both false (§0.3), and `isPinned` is true so `NoKeepRules` excludes them from the horizontal merger outright.
- **Repackaging — not reachable on AGP 8.12**, because `packageObfuscationMode` stays at its default unless `-repackageclasses`/`-flattenpackagehierarchy` is supplied, and AGP's optimize file supplies neither (§0.4, §0.5). And even under `-repackageclasses`, repackaging changes the package, not the simple name, so `getSimpleName()` would be unaffected; the `endsWith("." + widgetName)` lookup above is also written against the _short_ class name.

**Belt and braces already exist, and are stronger than the `-keepnames` rule.** aapt2 emits, for every manifest-declared component, a plain keep rule with no modifiers — verbatim from AOSP:

```cpp
printer.Print("-keep class ").Print(entry.first).Println(" { <init>(); }");
```

([`frameworks/base/tools/aapt2/java/ProguardRules.cpp`](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/tools/aapt2/java/ProguardRules.cpp)). A modifier-free `-keep` disallows shrinking, minification **and** optimisation, so the generated receivers are already fully pinned by the manifest alone. The `app.config.ts` rule is genuine belt-and-braces, exactly as its comment claims — and it is a _weaker_ rule than the one AGP already generates, not a stronger one.

One measured data point already exists in the repo, and it is worth keeping in view: `docs/releasing.md` records that the 2026-09-03 local proof build's `mapping.txt` "kept `org.vasilyoshev.selftend.widget.SelftendCard` and `com.reactnativeandroidwidget.RNWidgetProvider` under their own names". ⚠️ That was a build with `-dontoptimize` in force, so it evidences the _shrink + obfuscate_ configuration only. It is a baseline for a re-measurement, not a result that carries over.

**Rule needed: none beyond what is there.** The existing pair

```
-keepnames class * extends com.reactnativeandroidwidget.RNWidgetProvider
-keep class com.reactnativeandroidwidget.** { *; }
```

is sufficient, and the second line (a plain `-keep … { *; }`) already pins the library's own classes against optimisation. **If `-repackageclasses` is ever added** (which AGP 9.1 will do by default), re-read this section: the conclusion still holds, but it should be re-derived rather than inherited.

### 2.5 JNI / native method binding by signature

**Mechanism.** fbjni registers native methods from C++ against a class name plus a method name and JNI type signature; the Java side declares them `native`. RN's own hybrid classes are annotated `@DoNotStrip` / `@DoNotStripAny`.

**Already covered? Yes, three times over.**

1. AGP's `proguard-common.txt` (§0.5): `-keepclasseswithmembernames,includedescriptorclasses class * { native <methods>; }`. `-keepclasseswithmembernames` = `-keepclasseswithmembers,allowshrinking`, so the class name, the method names and the descriptor types are all pinned, and optimisation is disallowed for them.
2. RN's own `-keepclassmembers,includedescriptorclasses class * { native <methods>; }` and `-keep class com.facebook.jni.** { *; }`.
3. R8's `NoNativeMethods` horizontal-merging policy (§0.3) excludes _any_ class with a native method from merging, independent of keep rules.

**Rule needed: none.**

### 2.6 Kotlin/Java serialisation and `Class.forName` in the dependency set

**What I actually found**, by grepping the installed `react-native` Android sources for `Class.forName`:

- `common/ClassFinder.kt:27` — guarded by `canLoadClassesFromAnnotationProcessors()`, which is `BuildConfig.IS_INTERNAL_BUILD`, i.e. **false in OSS**. Dead path here.
- `uimanager/ViewManagerPropertyUpdater.kt:134` — `Class.forName("$clsName$\$PropsSetter")`. Also dead in OSS (the processor does not run), and it catches `ClassNotFoundException` and falls back. Covered in §2.2.

Those are the only two occurrences in RN's Android tree. I did **not** perform an exhaustive `Class.forName` sweep across every installed Android dependency — a recursive grep over `node_modules` times out, and most third-party Android code is inside AARs resolved at build time rather than present in `node_modules` at all. So:

⚠️ **Honest limit.** "No `Class.forName` anywhere in the dependency set" is **not** something this ticket established, and nothing downstream should claim it. What was established is (a) RN's own two call sites and their guards, (b) that `kotlin-reflect` is present and ships optimisation-proof rules for it (§1.8), and (c) that every installed package shipping any consumer rule at all was read (seven of them: `react-native`, `expo`, `expo-modules-core`, `expo-notifications`, `react-native-reanimated`, `react-native-worklets`, `react-native-svg`).

No Java/Kotlin serialisation surface (`Serializable`, `Parcelable` `CREATOR`, Gson/Moshi/kotlinx-serialization reflection) was found in the app's own native surface; AGP's `proguard-common.txt` carries the `Parcelable.CREATOR` rule regardless.

### 2.7 Summary table

| Surface                                                                                                              | Mechanism                                                                                                                                 | Already covered?                                                                                                                                                                                                                                                             | Rule needed                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TurboModules / codegen specs                                                                                         | `declaredMethods` on the spec superclass; method name → JS name; param types → JNI signature; `@ReactModule` read at runtime              | **Yes** — RN's `-keep class * implements …NativeModule { *; }` (plain `-keep`, matches spec supertypes too)                                                                                                                                                                  | none                                                                                                                                                                                                                                                                    |
| `@ReactMethod`                                                                                                       | runtime-retained annotation on pinned holders                                                                                             | **Yes** — same rule + AGP `-keepattributes RuntimeVisibleAnnotations`                                                                                                                                                                                                        | none                                                                                                                                                                                                                                                                    |
| `ViewManager` / `ReactShadowNode` + `@ReactProp`                                                                     | `getDeclaredMethods()` + annotation scan (always via `getNativeProps()`); prop name from the annotation                                   | **Yes, on tracing** — `-keepclassmembers …@ReactProp` pins the methods and (via `NoKeepRules`) blocks merging of the holder; annotation-free managers merge harmlessly (§2.2). Meta's internal `reactnative.pro` pins the classes anyway; the shipped consumer file does not | **Optional, recommended** — `-keepnames class * extends com.facebook.react.uimanager.ViewManager` + the same for `…ReactShadowNode`. Defensive, matches upstream, ~free                                                                                                 |
| `expo-modules-core` `@DoNotStrip`                                                                                    | shrinker-only marker, `@Retention(CLASS)`                                                                                                 | **Yes** — driven by plain `-keep` / `-keepclassmembers`, optimisation-proof                                                                                                                                                                                                  | none                                                                                                                                                                                                                                                                    |
| ☠️ Expo `Record` types (`SecureStoreOptions`, every module's options object)                                         | `-keep class * implements …Record { *; }` matches **through an empty marker interface**; `@Field` members reached only reflectively       | ☠️ **No** — the installed `expo-modules-core` 57.0.6 lacks the rule Expo added on `main` when it enabled optimisation                                                                                                                                                        | ☠️ **`-keep interface expo.modules.kotlin.records.Record`** (§3.0). Consider also the reporter-verified `-keep,allowobfuscation @interface expo.modules.kotlin.records.Field` + `-keepclassmembers class * implements …Record { @…Field <fields>; }` (§3.1, expo#49081) |
| Expo modules (`Enumerable`, `SharedObject`, `Service`, `ComposeProps`)                                               | Kotlin reflection over pinned types                                                                                                       | **Yes** — plain `-keep … { *; }`                                                                                                                                                                                                                                             | none                                                                                                                                                                                                                                                                    |
| ☠️ Class-identity string comparisons anywhere (`getCanonicalName().equals("…")`, `startsWith(LIBRARY_PACKAGE_NAME)`) | horizontal merging redirects the class **and** R8 rewrites the literal to follow it; ordinary obfuscation already breaks the package form | **No, and cannot be** — no keep rule fixes a comparison in someone else's code                                                                                                                                                                                               | `@sentry/react-native` ≥ 8.25.0 (§3.3); `react-native-screens` has no merged fix (§3.1)                                                                                                                                                                                 |
| `expo.modules.kotlin.modules.Module` subclasses                                                                      | resolved from `ExpoModulesPackageList`, not by name                                                                                       | **Yes, deliberately optimisable** — `-keep,allowoptimization,allowobfuscation`                                                                                                                                                                                               | none                                                                                                                                                                                                                                                                    |
| `react-native-android-widget` receivers                                                                              | `getClass().getSimpleName()` → JS catalog, **and** `provider.getShortClassName().endsWith("."+name)` → silent no-op on mismatch           | **Yes, twice** — aapt2's modifier-free `-keep class <receiver> { <init>(); }` from the manifest, plus `app.config.ts`'s `-keepnames`                                                                                                                                         | none (re-check if `-repackageclasses` is ever added)                                                                                                                                                                                                                    |
| JNI / native methods                                                                                                 | fbjni binds by class + name + descriptor                                                                                                  | **Yes, three times** — AGP `-keepclasseswithmembernames …native <methods>`, RN's own, and R8's `NoNativeMethods` merge policy                                                                                                                                                | none                                                                                                                                                                                                                                                                    |
| `kotlin-reflect` / `@kotlin.Metadata`                                                                                | runtime metadata parsing                                                                                                                  | **Yes** — `-keep class kotlin.Metadata { *; }` + `NoKotlinMetadata` merge policy                                                                                                                                                                                             | none; note `-assumenosideeffects` becomes live                                                                                                                                                                                                                          |
| `react-native-screens`, `expo-secure-store`, `expo-image-picker`, `expo-haptics`                                     | no rules of their own                                                                                                                     | **Yes, transitively** (Expo modules via `expo-modules-core`; screens via RN's rules)                                                                                                                                                                                         | none found; screens is the one to watch on the device                                                                                                                                                                                                                   |

---

## Part 3 — what other React Native apps had to add

This section separates reports that are about the **optimisation pass** from reports that are about **shrinking and obfuscation** (which this app already runs). Only the first kind is evidence about the change this map is considering.

### ☠️ 3.0 The finding that changes the answer: the `Record` marker-interface rule is missing on SDK 57

**Expo added a keep rule specifically because R8's optimisation pass broke their `Record` rule — and that rule is not in the version this app has installed.**

[expo/expo#46852](https://github.com/expo/expo/pull/46852), merged **2026-06-15** by `@lukmccall` (Expo core), switched Expo's own templates (`expo-template-bare-minimum`, `apps/bare-expo`, `apps/minimal-tester`, the `@expo/cli` prebuild fixtures) from `proguard-android.txt` to `proguard-android-optimize.txt`. To do that it had to fix two things first, and its `expo-modules-core/CHANGELOG.md` entries say so verbatim:

> "[Android] Keep the `Record` marker interface so its consumer ProGuard rule keeps matching after **R8 optimization removes empty marker interfaces**."

> "[Android] Fix `Record` arguments crashing with a `NullPointerException` in R8-optimized release builds when converted through the reflection fallback path."

The first added exactly one line to `packages/expo-modules-core/android/proguard-rules.pro`:

```
-keep interface expo.modules.kotlin.records.Record
```

**Verified on both sides, 2026-09-22:**

- [`expo/expo` `main` → `packages/expo-modules-core/android/proguard-rules.pro`](https://raw.githubusercontent.com/expo/expo/main/packages/expo-modules-core/android/proguard-rules.pro) **contains** `-keep interface expo.modules.kotlin.records.Record`.
- The **installed `expo-modules-core` 57.0.6 does not.** Grepping `node_modules/expo-modules-core/android/proguard-rules.pro` for `keep interface` returns exactly one line, and it is `-keep interface expo.modules.kotlin.services.Service`. The file's only `Record` rule is `-keep class * implements expo.modules.kotlin.records.Record { *; }` (§1.2).
- `expo.modules.kotlin.records.Record` in the installed tree is, verbatim and in full, an **empty marker interface**:

  ```kotlin
  package expo.modules.kotlin.records
  interface Record
  ```

So the exact precondition Expo's changelog names — an empty marker interface, with a consumer rule that matches through it, and no rule keeping the interface itself — **is the state this app is in.** ⚠️ The fix is on `main` (SDK 58) and **was not backported to SDK 57**: `expo-template-bare-minimum` on the `sdk-57` branch, and the published `expo-template-bare-minimum@57.0.4` tarball, both still write `getDefaultProguardFile("proguard-android.txt")`.

**Rule needed — this is the one non-negotiable addition if the change is taken on SDK 57:**

```
-keep interface expo.modules.kotlin.records.Record
```

⚠️ **Honest limit on the mechanism.** R8 evaluates keep rules against the _input_ program, so it is not obvious from first principles how interface removal could un-match a rule evaluated before it. I did **not** derive the mechanism from R8's source, and this document does not claim to have. What is established is stronger than a mechanism anyway: **Expo's own maintainers hit this, named optimisation as the cause, and shipped a one-line rule for it**, in the same PR in which they turned optimisation on. On a change whose only verification is a device session, that is the rule to copy, not to re-derive.

### 3.1 Optimisation-pass breakages, with version context

| Report                                                                                                                                                                                           | Versions stated                                                                                                                                                               | What broke                                                                                                                                                                                                                                                     | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                                                                                                                                                                                | Weight for RN 0.86 / Sept 2026                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [expo/expo#46852](https://github.com/expo/expo/pull/46852) (merged 2026-06-15)                                                                                                                   | Expo `main` → SDK 58                                                                                                                                                          | `Record`-typed arguments; the `Record` consumer rule                                                                                                                                                                                                           | empty marker interface removed by optimisation; `@Field` annotation instance stored in a data class                                                                                                                                                                                                                                                                                                                       | `-keep interface …Record` + eager key resolution in `RecordTypeConverter.kt`                                                                                                                                                                                                                                                                                                       | **Highest.** Expo's own engineer, naming the mechanism. **Not backported to SDK 57.** See §3.0                                                                                                                                                                                                                                                                                  |
| [expo/expo#49081](https://github.com/expo/expo/issues/49081) (2026-08-18, closed by bot for missing repro, **never maintainer-triaged**)                                                         | expo 54.0.36, expo-modules-core 3.0.30, **expo-secure-store 15.0.8**, New Arch, Android 17                                                                                    | every `SecureStore.getItemAsync` rejects: _"The 2nd argument cannot be cast to type `expo.modules.securestore.SecureStoreOptions` (received `ReadableNativeMap`)"_ → NPE. Reporter notes the app is left **silently half-initialised** if the caller only logs | `@Field` members of a Kotlin `Record` reached only by reflection; reporter: _"Under R8's default (non-optimize) config the reflection metadata survives; under full `-optimize` it doesn't"_                                                                                                                                                                                                                              | reporter-verified: `-keep,allowobfuscation @interface expo.modules.kotlin.records.Field`, `-keepclassmembers class * implements …Record { @…Field <fields>; }`, `-keep class * implements …Record { *; }`                                                                                                                                                                          | **High and directly relevant — this app ships `expo-secure-store`.** But SDK 54, i.e. before #46852; the `Record` half is addressed by §3.0's rule. Trigger stated as exactly this map's swap                                                                                                                                                                                   |
| [getsentry/sentry-react-native#6691](https://github.com/getsentry/sentry-react-native/issues/6691) (2026-09-09, closed; fix [#6692](https://github.com/getsentry/sentry-react-native/pull/6692)) | **RN 0.86.3**, @sentry/react-native **8.25.0**, react-native-screens 4.27.0, New Arch, `proguard-android-optimize.txt`, **stock AGP-bundled R8 8.12.14 — no pinned compiler** | time-to-initial-display spans close early; **silent** (every diagnostic on the path logs at `DEBUG`)                                                                                                                                                           | ☠️ **horizontal class merging.** R8 merged `com.swmansion.rnscreens.events.ScreenAppearEvent` into RN's `com.facebook.react.views.drawer.events.DrawerClosedEvent`, added a discriminator int and a 22-way switch, and **rewrote the string literal to follow the merge** — so `event.getClass().getCanonicalName().equals("…ScreenAppearEvent")` matched all 22 events                                                   | identify the event by its name string (`"topAppear"`) instead of its class. **No keep rule added**                                                                                                                                                                                                                                                                                 | **Strongest evidence that merging bites this exact stack on a stock toolchain.** RN `Event` subclasses share a superclass and constructor shape and are prime merge candidates                                                                                                                                                                                                  |
| [software-mansion/react-native-screens#4505](https://github.com/software-mansion/react-native-screens/issues/4505) (2026-08-17, **still OPEN**, maintainer-confirmed)                            | **react-native-screens 4.25.0**, **RN 0.86.2**, **AGP 8.12.0**, New Arch, `isMinifyEnabled`, `isShrinkResources`, **`android.r8.optimizedResourceShrinking=true`**            | `IllegalStateException: Screen fragments should never be restored`                                                                                                                                                                                             | `RNScreensFragmentFactory` does `className.startsWith(BuildConfig.LIBRARY_PACKAGE_NAME)`; R8 renamed `com.swmansion.rnscreens.ScreenFragment` → `kg.D`, so the prefix test fails                                                                                                                                                                                                                                          | workaround: `-keep class com.swmansion.rnscreens.** extends androidx.fragment.app.Fragment { <init>(); }`. Both proposed fixes ([#4539](https://github.com/software-mansion/react-native-screens/pull/4539) closed, [#4540](https://github.com/software-mansion/react-native-screens/pull/4540) open) **unmerged**                                                                 | ⚠️ **Read §3.2 before acting on this one.** Its stated trigger is a flag this app already has on, and its mechanism is name-based, not optimisation-based                                                                                                                                                                                                                       |
| [software-mansion/react-native-screens#4586](https://github.com/software-mansion/react-native-screens/issues/4586) (2026-09-02, closed)                                                          | **react-native-screens 4.25.0 / 4.27.0, React Native 0.86.0**, Expo bare, Hermes, API 37                                                                                      | `NullPointerException` in `ScreenContainer.requestLayout` on first screen mount — a hard crash                                                                                                                                                                 | R8's **new read-before-write analysis for constructors** assumes a library superclass constructor never calls back into the subclass; `ViewGroup.<init>` does, so R8 proved `layoutCallback` non-null and folded the `!= null` guard away. Confirmed by the reporter with `dexdump -d`                                                                                                                                    | ⚠️ **no keep rule fixes this** — it is a code-shape problem, not a reachability one. Library fix [#4574](https://github.com/software-mansion/react-native-screens/pull/4574) **closed unmerged** (maintainer: _"I'm not confident in landing it before we do thorough testing, which we lack capacity for"_). Making the fields nullable produced a **byte-identical** post-R8 dex | **Exactly this RN version — but R8-version-gated.** The reporter reproduces only by pinning `com.android.tools:r8:9.4.14` and states R8 **8.12.14, which AGP 8.11 bundles, still keeps the check**. ⚠️ I did **not** verify which R8 version AGP 8.12 bundles; there is no `com.android.tools:r8` entry in the local Gradle cache. **That verification belongs in the runbook** |
| [ionic-team/capacitor#8589](https://github.com/ionic-team/capacitor/issues/8589) (2026-09-04, OPEN)                                                                                              | Capacitor 8.4.1, AGP 8.13.0, **R8 8.13.6 full mode**, `proguard-android-optimize.txt`                                                                                         | `Bridge.getPermissionStates` compiled down to a literal `throw null`                                                                                                                                                                                           | R8 proved an annotation-holding field never non-null, removed field and getter, constant-propagated `null`. Two generalisable findings: **`-keepattributes *Annotation*` does not help** (keeping annotation _attributes_ ≠ keeping annotation _classes_), and the annotations were still in the dex — the optimizer's _assumption_ was wrong, so nothing appears in lint, `configuration.txt`, or missing-class warnings | `-keep @interface com.getcapacitor.annotation.** { *; }`                                                                                                                                                                                                                                                                                                                           | Different framework — use for the **mechanism only**. It is the closest analogue to the `@ReactModule` shape (§3.3)                                                                                                                                                                                                                                                             |

### 3.2 ⚠️ A correction to `react-native-screens#4505`, and to §0.4

That issue attributes the breakage to `android.r8.optimizedResourceShrinking`, which **this app already has on** (`app.config.ts`, `GRADLE_OPTIMIZED_RESOURCE_SHRINKING`). Taken at face value that would mean the app is already broken today — which the shipped releases do not suggest. The mechanism resolves the tension, and it also sharpens §0.4:

- **`com.swmansion.rnscreens.ScreenFragment` → `kg.D` is ordinary obfuscation, not repackaging.** R8's class-name minifier rewrites the whole descriptor, package segments included; it does not preserve package _names_, only (absent `-repackageclasses`/`-flattenpackagehierarchy`) the package _hierarchy shape_. That is why `-keeppackagenames` exists as a separate option — and why Sentry uses it (§4.3).
- So **any `startsWith(<package name>)` or `getCanonicalName().equals("<fqcn>")` test is already fragile under the obfuscation this app runs today**, with or without the optimisation swap. `-repackageclasses` would make it worse, not newly broken.
- **Two things follow.** First: §0.4's claim stands as written — _repackaging into a single package_ is off until `-repackageclasses` is supplied or AGP 9.1 arrives — but it must not be read as "package names are safe today". They are not. Second: the runbook should exercise **screen navigation and fragment restore** on the device whatever this map decides, because #4505's surface is installed (`RNScreensFragmentFactory.kt:8` and `ScreenFragment.kt:67` are both present in the installed 4.25.2) and its trigger is already on.

**Unverified:** why #4505's reporter saw the flag change the outcome. Possibly the flag shifted which classes survived to be renamed; possibly the attribution is wrong. I did not reproduce it, and neither conclusion is claimed here.

### 3.3 ☠️ A live exposure this app has _today_, found while checking §3.1

`@sentry/react-native` **8.19.0** is what is installed, and the sentry-react-native#6691 fix shipped in **8.25.0**. The unfixed code is present in the installed tree — `node_modules/@sentry/react-native/android/src/main/java/io/sentry/react/RNSentryReactFragmentLifecycleTracer.java`:

```java
// line 43
if (!"com.swmansion.rnscreens.ScreenStackFragment".equals(f.getClass().getCanonicalName())) {
// lines 91-92
if ("com.swmansion.rnscreens.events.ScreenAppearEvent"
    .equals(event.getClass().getCanonicalName())) {
```

Under optimisation, per #6691, the second comparison stops being a no-op and starts matching **every** event merged into the same class, silently understating time-to-initial-display. The consequence is bad telemetry, not a crash — which, on a pipeline whose only early warning is Sentry, is the worst-shaped failure of the lot. **Bumping `@sentry/react-native` to ≥ 8.25.0 is the fix, and it is a decision for the spec ticket, not a keep rule.**

### 3.4 First-party toolchains have already moved

Two facts that bear directly on "is this change premature":

- **React Native switched its own reference apps** in [react/react-native#54143](https://github.com/react/react-native/pull/54143), merged **2025-10-16** as `40ac4478f`: `private/helloworld/android/app/build.gradle` and `packages/rn-tester/android/app/build.gradle.kts` moved to `proguard-android-optimize.txt`, with the commit message _"This will become the default in AGP 9.x so let's update it inside RNTester as well."_ The same three-file commit appended the Fresco rule (`-keep public class com.facebook.imageutils.** { public *; }`) that §1.1 quotes. ⚠️ The commit body does not state _why_ the Fresco rule was added; co-location in the same commit is suggestive, not proof.
- **Expo switched its templates** in #46852 (§3.0) — but **on `main`/SDK 58 only**. On SDK 57 prebuild, `-dontoptimize` is still what you get.

### 3.5 Real React Native apps that flipped the switch

| App                                                                                                                                              | Outcome     | What broke                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Numbers                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [LedgerHQ/ledger-live#21296](https://github.com/LedgerHQ/ledger-live/pull/21296) — **merged 2026-09-01**, AGP 8.11.0                             | shipped     | `react-native-config` reads env via `Class.forName` + `getDeclaredFields`; R8 saw no reference and deleted the class — _"every `Config.*` became empty at runtime. The app still booted"_, so a feature flag silently read `false` in production. Detox variants additionally needed `kotlin.**` and `kotlinx.coroutines.**` kept                                                                                                                                                                                                                   | APK 152.2 → 139.5 MB; dex 47.7 MB / 6 files → 12.9 MB / 2 files; **+~1m55s** per release build. Validated with full Android E2E (9/12 shards) plus a signed staging APK on a physical device |
| [MetaMask/metamask-mobile#35162](https://github.com/MetaMask/metamask-mobile/pull/35162) — **2026-08-24, CLOSED unmerged (draft)**, R8 full mode | not shipped | ☠️ _"removing `-keep class kotlin.** { *; }` is the single biggest remaining win (−3.1 MB dex) **and it breaks the app** — `expo-modules-core` reflects over arbitrary Kotlin types to build its module registry, and the app dies on the ErrorBoundary with `Engine does not exist` — no crash, no native exception, nothing wrong-looking in `usage.txt`."_ Also: `com.android.installreferrer.api.**` reached only reflectively by `react-native-device-info` was stripped and install attribution silently stopped — _already broken on `main`_ | dex 26.70 → 21.44 MB (−19.7%); cold start 387.5 → 385.5 ms — **no measurable change** on a Galaxy A14 5G over 10 iterations with the ART filter forced to `verify`                           |
| [Expensify/App#100003](https://github.com/Expensify/App/issues/100003) — **2026-09-01, OPEN, proposal stage**                                    | undecided   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | R8 Configuration Analyzer before: Shrinking 45.92%, **Optimization 0.00%**, Obfuscation 0.00%. After: dex 52.99 → 49.46 MB (−6.7%), arm64 APK −2.3 MB, analyzer 45.26%                       |

Three things to take from this table rather than from any one row:

1. **The size win is real but modest** (−6.7% dex at Expensify, −19.7% at MetaMask with a much more aggressive configuration), and **the startup win was not measurable** in the one place it was measured properly.
2. **Every breakage found in these three was silent.** MetaMask's own summary is the sentence to carry into the runbook: _"R8 over-stripping is a runtime failure in code the optimizer cannot see; it never fails the build."_
3. **Two of the three did not ship.** One merged, one closed unmerged, one still a proposal.

⚠️ Expensify's issue also asserts that AGP's two default files "differ by exactly two lines: it drops `-dontoptimize` and adds `-allowaccessmodification`". That happens to match what §0.5 established by reading AGP 8.12.0's jar directly — but §0.5 is the evidence, not the Expensify claim.

### 3.6 Reports that are shrink/obfuscate, not optimisation — weak evidence here

Listed because they show what the _current_ configuration already costs, and because two of them concern packages this app ships.

| Report                                                                                                                                     | Versions                                               | Broke                                                                                                         | Status                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [expo/expo#49779](https://github.com/expo/expo/issues/49779) (2026-09-06, closed)                                                          | **expo-calendar 57.0.2, Expo SDK 57**                  | `createEventAsync` always fails (`DTSTART field missing`), or silently _"Event could not be saved"_           | `expo-modules-core`'s rule keeps only classes that **directly** implement `Record`; `EventInputBase`, the abstract superclass holding the `@Field`s, does not, so it was renamed. **Not installed here** — but the mechanism is the §3.0 family                                                                                              |
| [expo/expo#45291](https://github.com/expo/expo/issues/45291) (2026-05-01, closed)                                                          | Expo SDK 54, **expo-notifications 0.32.17**, RN 0.81.5 | `getAllScheduledNotificationsAsync()` returns `[]`; **no scheduled notification ever fires**; entirely silent | `expo-notifications` had **no `consumerProguardFiles`**, so its own rules were never applied → `NotificationRequest` renamed → `ObjectInputStream.readObject()` threw `ClassNotFoundException`, swallowed. **Fixed upstream**, and the installed 57.0.6 has `consumerProguardFiles 'proguard-rules.pro'` at `android/build.gradle:16` (§1.4) |
| [react/react-native#55465](https://github.com/react/react-native/pull/55465) (2026-02-07)                                                  | RN internal                                            | `NoSuchMethodError` when JNI looked up `"resume"`/`"pause"` by name                                           | `AnimationBackendChoreographer` methods called from C++ had no protection annotation and were renamed; fixed by adding `@DoNotStripAny`. PR notes every other JNI-accessed class in that package already had it                                                                                                                              |
| [software-mansion/react-native-reanimated#9372](https://github.com/software-mansion/react-native-reanimated/pull/9372) (merged 2026-05-11) | reanimated/worklets `main`                             | preventive                                                                                                    | Added missing `@DoNotStrip` to JNI-reached methods, but the PR states the package-wide `-keep class com.swmansion.{reanimated,worklets}.** { *; }` rules **already preserve everything functionally** — annotations were defence-in-depth. Consistent with §1.5                                                                              |
| [margelo/react-native-vision-camera#3830](https://github.com/margelo/react-native-vision-camera/issues/3830) (2026-04-30)                  | VisionCamera 5.0.x, RN 0.83.2                          | all hooks `undefined` at runtime                                                                              | Fixed by a 4-line code change, no keep rule. Not installed here                                                                                                                                                                                                                                                                              |
| [invertase/react-native-firebase#1700](https://github.com/invertase/react-native-firebase/issues/1700) (2018)                              | pre-R8                                                 | build failure                                                                                                 | **Worthless for 2026** — legacy ProGuard era. Listed only so nobody cites it                                                                                                                                                                                                                                                                 |

### 3.7 Explicitly not found

- **No report of `@ReactProp`, `@ReactMethod` or `@ReactModule` annotation-driven reflection breaking under R8 optimisation or full mode.** Recorded as an absence, not a clean bill of health. The one adjacent finding: there is **no `-keep @interface` rule for `com.facebook.react.module.annotations.ReactModule`** anywhere in RN's tree. Under the new architecture `@ReactModule` is consumed by a build-time annotation processor generating `$$ReactModuleInfoProvider`, and the holders are pinned by `-keep class * implements …NativeModule { *; }` (§2.1) — so the gap is probably benign, but it is the exact shape that bit Capacitor in §3.1. **Untested.**
- **No report of `com.facebook.proguard.annotations.DoNotStrip` or `expo.modules.core.interfaces.DoNotStrip` being insufficient under optimisation.** The nearest real thing is Expo's `Record` **marker interface** (§3.0), a different family.
- **No ProGuard/R8/minify issue of any kind in `sAleksovski/react-native-android-widget`** — searched for `proguard`/`R8`/`minify` and again for `"release build"`/`obfuscat`/`minifyEnabled`; 10 results, none about minification. Independently confirmed: that repo's tree contains no `proguard-rules.pro` or `consumer-rules.pro`, `android/build.gradle` has no `consumerProguardFiles`, and a code search for `Class.forName` returns zero hits. **No reports exist and the library protects itself with nothing** — which is why `app.config.ts` carries its rules (§2.4).
- **Nothing in `reactwg/react-native-new-architecture`** (`proguard OR R8 OR minify` → 0 results), and nothing optimisation-related in `margelo`/`mrousavy` repos.
- **The R8 version AGP 8.12 bundles was not established** (no `com.android.tools:r8` entry in the local Gradle cache, and the AGP jar was read only for its ProGuard resources). This matters for §3.1's `react-native-screens#4586` row and belongs in the runbook.
- `issuetracker.google.com/issues/558217403`, the R8 bug the `#4586` reporter says they filed, is **behind a sign-in wall and was not read.** Its existence is reported second-hand.

---

## Part 4 — Sentry under optimisation

Sentry is this pipeline's only production early warning, so "does the mapping still symbolicate" is the question that decides whether a bad build is _detectable_ at all.

### 4.1 The answer: yes, and Sentry implements the optimising-R8 retrace surface explicitly

Symbolication happens server-side in [getsentry/symbolicator](https://github.com/getsentry/symbolicator), crate `symbolicator-proguard`. Its `map_full_frame` carries this doc comment:

> "This function returns a list of frames because one frame may be expanded into a series of inlined frames. The returned list is sorted so that inlinees come before their callers."

and its result type names the optimisation-only cases directly:

```rust
enum FullRemapResult {
    /// Outline frame - skip this frame but preserve rewrite eligibility for next frame.
    OutlineFrame,
    /// Rewrite rules cleared all frames - skip this frame and disable rewrite for subsequent frames.
    RewriteCleared,
    Frames(Vec<JvmFrame>),
    NoFrames,
}
```

Its unit test `remap_filename_inlined` feeds a real R8 mapping containing `{"id":"com.android.tools.r8.mapping","version":"2.2"}`, `$$ExternalSyntheticOutline0`, `com.android.tools.r8.synthesized`, `com.android.tools.r8.outline` and `com.android.tools.r8.outlineCallsite` — **metadata only an optimising R8 run emits**. Symbolicator's changelog dates the support: outline/outlineCallsite in 25.11.0 (#1816), inline-frame filenames in 25.11.0 (#1806), `rewriteFrame` in 25.12.1 (#1845), synthesized-frame marking in 25.8.0 (#1735). `getsentry/sentry`'s `src/sentry/lang/java/processing.py` consumes the marker and sets `in_app = False` for synthesized frames.

These map one-to-one onto [R8's own `doc/retrace.md`](https://r8.googlesource.com/r8/+/refs/heads/main/doc/retrace.md), which specifies `synthesized`, `outline` and `outlineCallsite`.

**So the frames that inlining, outlining and synthetic-method generation create are exactly the frames Sentry has shipped and snapshot-tested handling for.**

### 4.2 The mapping can't drift out of step with the build

Two mechanisms exist; the one in force here is the Gradle-plugin path, which writes `assets/sentry-debug-meta.properties` rather than the `io.sentry.proguard-uuid` manifest marker. `SentryGenerateProguardUuidTask.kt` derives the UUID from the file:

```kotlin
val uuid = mappingFile?.let { UUID.nameUUIDFromBytes(it.contentHash().toByteArray()) } ?: UUID.randomUUID()
```

read back by `io.sentry.util.DebugMetaPropertiesApplier` from the key `io.sentry.ProguardUuids`. Because the UUID is a **content hash of `mapping.txt`**, turning optimisation on changes the mapping, which changes the UUID, which changes what the SDK reports. A mapping/build mismatch is structurally impossible; there is no "stale mapping" failure mode to test for.

### 4.3 What Sentry's rules assert, and what that costs

Sentry's own consumer rules assert the prerequisite in every module:

```
-keepattributes LineNumberTable,SourceFile
```

Also present in `sentry-android-core/proguard-rules.pro` at 8.49.0, and worth naming because it is the one rule in the whole set that interacts with repackaging:

```
# To filter out io.sentry frames from stacktraces
-keeppackagenames io.sentry.**
```

Sentry ships **no** `-keep,allowoptimization` modifiers anywhere, and its rules are a deliberate mix of plain `-keep` (optimisation-proof: `* extends io.sentry.SentryOptions { *; }`, `io.sentry.android.ndk.SentryNdk`, `io.sentry.protocol.DebugImage`, the AndroidX detection classes) and `-keepnames` (shrinkable but never renamed _or_ optimised, per §0.2: everything `implements io.sentry.Integration`, `ApplicationNotResponding`, `ScreenshotEventProcessor`, …).

**Sentry intends its SDK to be optimised.** [sentry-java#2031](https://github.com/getsentry/sentry-java/pull/2031) — "Allow optimization and obfuscation of the SDK by reducing proguard rules", merged 2022-05-25 — deleted the old blanket `-keep class io.sentry.** { *; }` family and replaced it with narrow constructor-only keeps. And Sentry dogfoods the exact configuration this map is considering: `sentry-android-integration-tests/sentry-uitest-android/build.gradle.kts` at tag 8.49.0 sets `testBuildType = "release"`, `isMinifyEnabled = true` and `proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), …)` — its on-device integration suite runs against an optimised build.

### 4.4 The one live Sentry defect, and why it does not reach this app

⚠️ [sentry-java#6127](https://github.com/getsentry/sentry-java/issues/6127) — _"Fatal SIGSEGV on Android 14+ JIT due to R8 optimization mismatch with OkHttp bytecode manipulation"_ — opened **2026-09-17**, **still open** (maintainer asked for a reproducer 2026-09-21), against **sentry-java 8.53.0, AGP 8.x, R8 full mode**. Mechanism as reported: the Sentry Android Gradle Plugin's ASM visitor weaves into `okhttp3.internal.connection.RealCall.getResponseWithInterceptorChain()`, and **no keep rule protects `io.sentry.okhttp.**`** — the rules still name the pre-8.x package `io.sentry.android.okhttp.SentryOkHttpInterceptor`. R8 then optimises over hand-woven bytecode and produces corrupt `StackMapTable` frames. That stale-package gap is independently confirmed at 8.49.0: `sentry-okhttp/src/main/java/io/sentry/okhttp/…` exists, and the only `okhttp` rule in `sentry-android-core/proguard-rules.pro` is `-keepnames class io.sentry.android.okhttp.SentryOkHttpInterceptor`.

**It does not apply to this app, and that is verified locally rather than assumed.** The defect requires the plugin's bytecode instrumentation to be on. `node_modules/@sentry/react-native/plugin/build/withSentryAndroidGradlePlugin.js` writes a **hard-coded** `sentry { … }` block into `android/app/build.gradle`:

```groovy
  sentry {
      autoUploadProguardMapping = shouldSentryAutoUpload()
      includeProguardMapping = true
      dexguardEnabled = false
      uploadNativeSymbols = shouldSentryAutoUpload()
      autoUploadNativeSymbols = shouldSentryAutoUpload()
      includeNativeSources = true
      includeSourceContext = false
      tracingInstrumentation {
          enabled = false
      }
      autoInstallation {
          enabled = false
      }
  }
```

`tracingInstrumentation.enabled = false` and `autoInstallation.enabled = false` are not configurable through `app.config.ts` — the Expo plugin emits them unconditionally. **No ASM weaving happens in this build, so #6127's mechanism is absent.** ⚠️ Re-check this if the Sentry plugin options ever change, or if `@sentry/react-native` starts defaulting tracing instrumentation on.

### 4.5 Explicitly not found

Recorded as absences, not as clean bills of health:

- **No Sentry documentation position on R8 full mode, either way.** (Full mode is a separate switch from the one this map changes, and is already on by AGP 8.0 default — §0.6.)
- **No Sentry documentation caveat tying the _optimisation_ pass, as opposed to obfuscation, to symbolication quality.**
- **No issue in `getsentry/sentry-java` or `getsentry/sentry-android-gradle-plugin` reporting wrong or missing symbolication attributable to inlining, merging or the optimisation pass.** The "mapping does not contain line info" cluster (sentry-android-gradle-plugin #178 2021-09-01, #275 2022-02-04, #460 2023-03-30, #583 2023-10-23) is about `LineNumberTable`/`SourceFile` retention and mapping-vs-build mismatch, not optimisation.
- **No `-dontoptimize` anywhere in the `getsentry` organisation.**
- **The Sentry Android Gradle Plugin contributes no ProGuard rules of its own** (the single `-keep` hit in that repo is a test fixture).

### 4.6 Related Sentry scar tissue worth knowing before the device session

`sentry-android-core/proguard-rules.pro` carries

```
# To mitigate the issue on R8 site (https://issuetracker.google.com/issues/235733922)
# which comes through AGP 7.3.0-betaX and 7.4.0-alphaX
-keepclassmembers enum io.sentry.** { *; }
```

— an enum-handling R8 defect. **Enum unboxing is one of the passes `-dontoptimize` currently suppresses in this build**, so enums are a class of behaviour that genuinely changes. Coverage in this app: AGP's `proguard-common.txt` keeps `values()`/`valueOf()` on every enum, `expo-modules-core` keeps `-keep enum * implements …Enumerable { *; }`, and Sentry keeps its own. Nothing was found uncovered — but "enums" belongs on the device runbook's awareness list.

Two further R8-full-mode Sentry build failures are on record and are already superseded by the 8.49.0 rules: [sentry-java#2696](https://github.com/getsentry/sentry-java/issues/2696) (2023-05-04, sentry-java 6.18.1 / AGP 8.0.1 — `NoSuchElementException` in `Sentry.init`, fixed upstream by the `-keep class * extends io.sentry.SentryOptions { *; }` rule that ships today) and [sentry-java#3996](https://github.com/getsentry/sentry-java/issues/3996) (2024-12-17, sentry-java 7.18.1 / AGP 8.7.3 — `minifyReleaseWithR8` itself crashing). Both predate 8.49.0 by years; neither is evidence about RN 0.86.

---

---

## Part 5 — the rules, collected

Everything this document would have the config plugin add, in priority order. **This is input to the ruling tickets, not a ruling.**

```
# ☠️ Required if optimisation is enabled while on Expo SDK 57.
# expo-modules-core 57.0.6 omits this; Expo added it on main (SDK 58) in the same PR
# that turned optimisation on for their own templates, because R8's optimisation pass
# removes empty marker interfaces and the `-keep class * implements Record { *; }` rule
# then stops matching. See expo/expo#46852.
-keep interface expo.modules.kotlin.records.Record

# Recommended alongside it: the reporter-verified rules from expo/expo#49081, which is
# the same family reaching the reflection fallback path for @Field members.
-keep,allowobfuscation @interface expo.modules.kotlin.records.Field
-keepclassmembers class * implements expo.modules.kotlin.records.Record {
    @expo.modules.kotlin.records.Field <fields>;
}

# Optional, defensive, ~free. Matches what React Native applies to itself internally
# (ReactAndroid/src/main/java/com/facebook/react/bridge/reactnative.pro), which the
# shipped consumer rules do not include. No traced failure depends on it.
-keepnames class * extends com.facebook.react.uimanager.ViewManager
-keepnames class * extends com.facebook.react.uimanager.ReactShadowNode
```

And two non-rule items, because they are the things a keep rule cannot fix:

- **Bump `@sentry/react-native` to ≥ 8.25.0** before enabling optimisation, or accept known-wrong time-to-initial-display telemetry (§3.3).
- **Establish which R8 version AGP 8.12 bundles.** It decides whether `react-native-screens#4586`'s hard crash is in scope at all (§3.1), and it was not established here.

Explicitly **not** recommended: `-repackageclasses`. It is off by default until AGP 9.1 (§0.4), it is a separate change with its own failure surface (§3.2), and bundling it would make a single device session carry two variables.

---

## What this document does not establish

Stated plainly, because the map forbids claiming verifications that were not performed:

- **Nothing here was run on a device, or in a build.** No AAB was produced, no `mapping.txt` was read, no class was observed to be merged or not merged. Every "covered" verdict above is derived from rule semantics in R8's source, not from an artefact.
- **Whether R8 would in fact merge any particular class of this app is unknown**, and knowable only from a build's `mapping.txt` / R8 diagnostics.
- **No exhaustive reflection sweep of every Android dependency was done** (§2.6).
- The `ViewManager` / `ReactShadowNode` keep rule recommended in §2.2 is **proposed on mechanism plus upstream precedent, not on an observed failure.**
- **The mechanism behind Expo's `Record` fix (§3.0) was not derived from R8's source.** The rule is recommended on the strength of Expo's own changelog and PR, not on a derivation this document performed.
- **`react-native-screens#4505`'s attribution to `android.r8.optimizedResourceShrinking` was not reproduced or explained** (§3.2), and the R8 version AGP 8.12 bundles was not established (§3.7).
