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
  // A relative glob, not "<rootDir>/test/integration/**": jest's glob conversion
  // keeps the backslash before a dot-directory in a Windows rootDir, so an
  // anchored pattern silently matches nothing when the repo checkout lives under
  // .claude/worktrees/ (agent worktrees). The .claude ignore below keeps a main-
  // checkout run from sweeping worktree duplicates instead.
  testMatch: ["**/test/integration/**/*.integration.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "<rootDir>/\\.claude/"],
  testTimeout: 30000,
  globalSetup: "<rootDir>/test/integration/global-setup.ts",
};
