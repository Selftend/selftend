// Integration tests run against a real local Supabase stack at
// http://localhost:54321 using the seeded test users from supabase/seed.sql.
// They are kept separate from `npm test` so unit tests stay hermetic and
// integration tests only run when you explicitly opt in via `npm run test:integration`.

const jestExpoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  // Overriding setupFiles replaces the preset's list, so re-include it. The
  // polyfill keeps integration tests working on Node < 22 (see the file).
  setupFiles: [...(jestExpoPreset.setupFiles ?? []), "<rootDir>/test/websocket-polyfill.ts"],
  testMatch: ["<rootDir>/test/integration/**/*.integration.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 30000,
  globalSetup: "<rootDir>/test/integration/global-setup.ts",
};
