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
  prettierConfig,
];
