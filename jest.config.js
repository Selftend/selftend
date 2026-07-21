const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/integration/", "/test/e2e/"],
  // jest-expo's default leaves @rn-primitives untransformed; our UI primitives
  // (Text, Label) depend on it, so widen the allowlist to transform it too.
  // Likewise the default only lists @sentry/react-native, but sentry v8 pulls
  // in sibling @sentry/* packages (core, browser, ...) that ship ESM — widen
  // to the whole scope so jest transforms them.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern
      .replace("native-base))", "native-base|@rn-primitives))")
      .replace("@sentry/react-native", "@sentry"),
  ),
  // Coverage is scoped to the .ts logic surface. .tsx screens/components are
  // covered by e2e (not ratcheted); pure data/barrel modules are excluded.
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/types.ts",
    "!src/**/*.d.ts",
    "!src/i18n/**",
    "!src/lib/design-tokens.ts",
    "!src/features/help/help-images.ts",
    "!src/features/gratitude/breaks.ts",
    // Android-widget native-bridge glue + pure constant/type modules: exercised on
    // device (like the .tsx widget views), not in jest. The tested logic surface
    // (snapshot-builder, snapshot-store, diff-snapshots) stays in.
    "!src/features/widgets/use-widget-snapshot-sync.ts",
    "!src/features/widgets/snapshot-types.ts",
    "!src/features/widgets/click-actions.ts",
    // Platform-IO hooks/modules extracted in the 2026-07 screen splits: their
    // branches (ImageManipulator + native image-picker; web Blob download vs native
    // Share) are unreachable under jest and are exercised on-device / in the web
    // smoke test. Their pure cores (buildAvatarManipulation, validatePickedAsset,
    // export markdown builders) are unit-tested separately.
    "!src/features/settings/use-profile-avatar.ts",
    "!src/features/settings/use-export-data.ts",
    "!src/features/recovery/export-target.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["json-summary", "text-summary", "lcov"],
  // Per-file branch floor for the refactored data-layer modules (2026-07 ACT/profile
  // split). Glob keys enforce the threshold on EACH matching file individually (a bare
  // directory key would only check the directory aggregate, letting a weak file hide).
  // Scoped strictly to the refactored paths — NOT the whole feature dirs, which contain
  // untouched .ts files below this bar. The global ratchet (baseline.json) guards the rest.
  coverageThreshold: {
    "./src/features/act/repository/**/*.ts": { branches: 80 },
    "./src/features/act/queries/**/*.ts": { branches: 80 },
    "./src/features/profile/repository.ts": { branches: 80 },
    "./src/features/profile/profile-sync.ts": { branches: 80 },
    "./src/features/profile/profile-avatar.ts": { branches: 80 },
    // Routines data layer (#42): the ticket's acceptance floor for the new
    // query/hook files.
    "./src/features/routines/repository.ts": { branches: 80 },
    "./src/features/routines/queries.ts": { branches: 80 },
    "./src/features/routines/schemas.ts": { branches: 80 },
  },
};
