// Integration tests run against a real local Supabase stack at
// http://localhost:54321 using the seeded test users from supabase/seed.sql.
// They are kept separate from `npm test` so unit tests stay hermetic and
// integration tests only run when you explicitly opt in via `npm run test:integration`.
//
// Deliberately NOT on the jest-expo preset: these tests import only
// @supabase/supabase-js and node built-ins, and the preset's setup files stub
// global fetch (expo's winter runtime) and gut global.performance — both of
// which break real HTTP against the local stack. Plain babel-jest with the
// project babel config compiles the TS just fine and leaves Node's real
// globals (fetch, WebSocket on Node 22+, performance) intact.

module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/integration/**/*.integration.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  testTimeout: 30000,
  globalSetup: "<rootDir>/test/integration/global-setup.ts",
};
