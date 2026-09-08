import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

// #1707 - Play Console flagged release 0.17.0 as "App optimisation is below
// our threshold. Obfuscation (1%). Fix by Feb 2027." Google's technical quality
// requirements (announced 2026-08-26) ask for at least 25% optimisation,
// obfuscation and shrinking from February 2027 on any app with more than
// 10 MB of DEX, and say falling short "can affect an app's visibility and
// publishing capabilities". Expo's default is no R8 at all, which is exactly
// how 0.17.0 shipped every class name intact.
//
// What is pinned here is the set of properties whose silent loss would either
// put the Play card back or, worse, keep the card green while blinding us:
//
//   - the two expo-build-properties flags. They are Expo's wiring for
//     `minifyEnabled` / `shrinkResources` on the release build type; drop
//     either and the next release is back at 1% with no build error.
//   - the widget keep rule. react-native-android-widget ships no consumer
//     ProGuard rules, and its native side names a widget by the receiver
//     class's simple name (`getClass().getSimpleName()`), which the JS task
//     handler maps onto widget-catalog.json. A renamed receiver renders
//     nothing, and only on a real launcher - no test in this repo can see it.
//   - the Sentry Android Gradle Plugin flag. Without it Sentry receives the
//     JS source maps but never the ProGuard mapping, so native frames of a
//     crash in a minified build arrive as obfuscated names - a release that
//     LOOKS monitored and is not.
//   - the release workflow's Sentry token and the no-token fail-safe. The
//     plugin gates the mapping upload on the same SENTRY_DISABLE_AUTO_UPLOAD
//     switch as the source maps, so both still have to be there.
//
// The config is evaluated, not text-scanned, so a flag that moves or is
// spelled through a variable still counts. The workflow is a text scan,
// matching the repo's dependency-free convention tests.

// expo/config-plugins is Node-only and fails to load under jest-expo, so the
// two mods are pass-through stubs (same as app.config.test.ts). The
// cleartext-traffic one runs solely for dev-variant builds; the Gradle JVM
// args one is asserted on below by text, since the stub never runs it.
jest.mock("expo/config-plugins", () => ({
  withAndroidManifest: (config: unknown) => config,
  withGradleProperties: (config: unknown) => config,
}));

const ROOT = resolve(__dirname, "..");

type PluginEntry = string | [string, Record<string, unknown>?];

function loadPlugins(): PluginEntry[] {
  const config = (require("../app.config") as { default: { plugins?: PluginEntry[] } }).default;
  return config.plugins ?? [];
}

function pluginProps(plugins: PluginEntry[], name: string): Record<string, unknown> | undefined {
  const entry = plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : undefined;
}

describe("Android release builds run R8 (#1707)", () => {
  const plugins = loadPlugins();
  const buildProperties = pluginProps(plugins, "expo-build-properties");
  const android = buildProperties?.android as
    | {
        enableMinifyInReleaseBuilds?: boolean;
        enableShrinkResourcesInReleaseBuilds?: boolean;
        extraProguardRules?: string;
      }
    | undefined;

  it("depends on expo-build-properties, the only supported way to flip minify in a managed project", () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies?.["expo-build-properties"]).toBeDefined();
    expect(buildProperties).toBeDefined();
  });

  it("turns on code minification and resource shrinking for release builds", () => {
    expect(android?.enableMinifyInReleaseBuilds).toBe(true);
    expect(android?.enableShrinkResourcesInReleaseBuilds).toBe(true);
  });

  it("keeps the widget receiver names the native side matches on", () => {
    const rules = android?.extraProguardRules ?? "";
    expect(rules).toContain(
      "-keepnames class * extends com.reactnativeandroidwidget.RNWidgetProvider",
    );
    expect(rules).toContain("-keep class com.reactnativeandroidwidget.** { *; }");
  });

  it("wires the Sentry Android Gradle Plugin so mapping.txt reaches Sentry", () => {
    const sentry = pluginProps(plugins, "@sentry/react-native/expo") as
      { experimental_android?: { enableAndroidGradlePlugin?: boolean } } | undefined;
    expect(sentry?.experimental_android?.enableAndroidGradlePlugin).toBe(true);
  });

  it("raises the Gradle daemon metaspace R8 exhausted on the first proof build", () => {
    // Expo's template ships `-XX:MaxMetaspaceSize=512m`; the first local
    // release build with R8 on died in `minifyReleaseWithR8` with
    // `OutOfMemoryError: Metaspace`. The ceiling is set through a
    // withGradleProperties mod, which the stub above cannot run, so this is
    // the one text assertion here.
    const appConfigSource = readFileSync(resolve(ROOT, "app.config.ts"), "utf8");
    expect(appConfigSource).toMatch(/MaxMetaspaceSize=(1024m|[2-9]\d{3}m|\dg)/);
    expect(appConfigSource).toContain('key: "org.gradle.jvmargs"');
  });

  it("keeps the release workflow's Sentry token and its no-token fail-safe", () => {
    const releaseWorkflow = readFileSync(
      resolve(ROOT, ".github/workflows/android-release.yml"),
      "utf8",
    );
    expect(releaseWorkflow).toContain("SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}");
    expect(releaseWorkflow).toMatch(/SENTRY_DISABLE_AUTO_UPLOAD:.*secrets\.SENTRY_AUTH_TOKEN/);
  });
});

// #2211 - `shrinkResources` is on for the first time, and the proof build
// measured DEX only. Every image the app `require()`s becomes a drawable that
// no Java/Kotlin code references - RN resolves it at runtime by a computed
// name - so the shrinker's only root for it is the `res/raw/keep.xml` that
// Expo's bundler writes for every asset when it embeds the release bundle.
// That reliance is documented in docs/releasing.md and pinned here at the two
// ends a test can reach: the set of images that need keeping, and the
// generator in the installed toolchain that keeps them. The middle - the
// produced AAB - is a build, and no test here runs one.
describe("resource shrinking keeps the require()d images (#2211)", () => {
  const IMAGE_REQUIRE = /require\("([^"]+\.(?:png|jpg|jpeg|gif|webp))"\)/g;

  /** Every image `require()` in app/ and src/, resolved to a repo-relative path. */
  const requiredImages = sourceFiles(ROOT, { dirs: ["app", "src"] }).flatMap((file) => {
    const source = stripComments(readFileSync(resolve(ROOT, file), "utf8"));
    return [...source.matchAll(IMAGE_REQUIRE)].map((match) => ({
      file,
      asset: relative(ROOT, resolve(ROOT, dirname(file), match[1]))
        .split(sep)
        .join("/"),
    }));
  });

  it("finds the images the app requires, and every one of them exists on disk", () => {
    // The floor is the help set alone (18) - well under the real count and
    // well over zero, so a scan that matched nothing cannot pass.
    expect(requiredImages.length).toBeGreaterThan(18);
    const missing = requiredImages.filter(({ asset }) => !existsSync(resolve(ROOT, asset)));
    expect(missing).toEqual([]);
    // And every one is a file resource the generator classes as a drawable or
    // raw asset - both are kept; a type it does not copy would not be.
    expect(requiredImages.map(({ asset }) => asset)).toEqual(
      expect.arrayContaining([
        "assets/images/help/cbt_program.png",
        "assets/branding/google-logo.png",
        "assets/icon.png",
      ]),
    );
  });

  it("relies on the keep file Expo's bundler writes for every Android asset", () => {
    // Resolved from `expo`'s own tree, not the root: `@expo/cli` is nested
    // under expo/node_modules, so a root require.resolve misses it.
    const expoRoot = dirname(require.resolve("expo/package.json"));
    const generator = require.resolve("@expo/cli/build/src/export/persistMetroAssets.js", {
      paths: [expoRoot],
    });
    const source = readFileSync(generator, "utf8");
    // Written for the Android platform, from the full list of copied assets.
    expect(source).toMatch(/platform === 'android'[\s\S]{0,200}createKeepFileAsync\(assetsToCopy/);
    // Into res/raw/keep.xml, as a tools:keep list the resource shrinker roots on.
    expect(source).toContain("'raw/keep.xml'");
    expect(source).toMatch(/tools:keep="\$\{assetsList\.join\(','\)\}"/);
    // One entry per asset - a filter here would be a resource silently unkept.
    expect(source).toMatch(/for \(const asset of assets\)\{\s*const prefix = /);
  });

  it("is written down as a reliance, not left implicit", () => {
    const releasing = readFileSync(resolve(ROOT, "docs/releasing.md"), "utf8");
    expect(releasing).toContain("res/raw/keep.xml");
    expect(releasing).toContain("createKeepFileAsync");
  });
});
