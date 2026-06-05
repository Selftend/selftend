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
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace("native-base))", "native-base|@rn-primitives))"),
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
    // (snapshot-builder, snapshot-store, resolve-for-today, diff-snapshots) stays in.
    "!src/features/widgets/use-widget-snapshot-sync.ts",
    "!src/features/widgets/snapshot-types.ts",
    "!src/features/widgets/click-actions.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["json-summary", "text-summary", "lcov"],
};
