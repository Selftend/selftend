const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "web-build/**",
      "android/**",
      "ios/**",
      "supabase/.temp/**",
    ],
  },
  prettierConfig,
];
