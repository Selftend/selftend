import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
// Text scan, no config evaluation - matching the repo's dependency-free
// convention tests (see ios-release-config.test.ts, android-release-track.test.ts).

const ROOT = resolve(__dirname, "..");

const appConfigSource = readFileSync(resolve(ROOT, "app.config.ts"), "utf8");
const releaseWorkflow = readFileSync(
  resolve(ROOT, ".github/workflows/android-release.yml"),
  "utf8",
);
const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};

describe("Android release builds run R8 (#1707)", () => {
  it("depends on expo-build-properties, the only supported way to flip minify in a managed project", () => {
    expect(packageJson.dependencies?.["expo-build-properties"]).toBeDefined();
    expect(appConfigSource).toContain('"expo-build-properties"');
  });

  it("turns on code minification and resource shrinking for release builds", () => {
    expect(appConfigSource).toMatch(/enableMinifyInReleaseBuilds:\s*true/);
    expect(appConfigSource).toMatch(/enableShrinkResourcesInReleaseBuilds:\s*true/);
  });

  it("keeps the widget receiver names the native side matches on", () => {
    expect(appConfigSource).toContain(
      "-keepnames class * extends com.reactnativeandroidwidget.RNWidgetProvider",
    );
    expect(appConfigSource).toContain("-keep class com.reactnativeandroidwidget.** { *; }");
  });

  it("wires the Sentry Android Gradle Plugin so mapping.txt reaches Sentry", () => {
    expect(appConfigSource).toMatch(/enableAndroidGradlePlugin:\s*true/);
  });

  it("keeps the release workflow's Sentry token and its no-token fail-safe", () => {
    expect(releaseWorkflow).toContain("SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}");
    expect(releaseWorkflow).toMatch(/SENTRY_DISABLE_AUTO_UPLOAD:.*secrets\.SENTRY_AUTH_TOKEN/);
  });
});
