const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

const assetExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
];

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "build-artifacts/**",
      "web-build/**",
      ".secrets/**",
      "android/**",
      "ios/**",
      "supabase/.temp/**",
      "supabase/functions/**",
    ],
  },
  {
    rules: {
      "import/no-unresolved": ["error", { commonjs: true }],
    },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
        node: {
          extensions: [".cjs", ".mjs", ".js", ".jsx", ".ts", ".tsx", ".d.ts", ...assetExtensions],
        },
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.test.js"],
    rules: {
      // require() inside jest.mock factories is the idiomatic pattern — factories
      // can't reference out-of-scope ES imports because jest hoists the mock call.
      "@typescript-eslint/no-require-imports": "off",
      // Jest globals (describe, it, expect, …) are injected by jest at runtime;
      // no-undef is already off for .ts test files via eslint-config-expo, match
      // that behaviour for plain .js test files in scripts/.
      "no-undef": "off",
    },
  },
  prettierConfig,
];
