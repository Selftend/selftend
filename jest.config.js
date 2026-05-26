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
};
