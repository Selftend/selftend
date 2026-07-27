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

// Shared so the day-key block below can re-state it: flat config resolves
// `no-restricted-imports` last-wins per file, so a later block that omitted this
// would quietly un-restrict module-room for the files it matches.
const MODULE_ROOM_RESTRICTION = {
  name: "@/src/lib/module-room",
  importNames: ["roomVariables", "roomCardHsl"],
  message:
    "Use useRoomStyle(hue) / useRoomCardHsl(hue) from @/src/lib/use-room-style - they carry the scheme read and the cached style identity.",
};

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "dist-e2e/**",
      "build/**",
      "build-artifacts/**",
      "web-build/**",
      ".secrets/**",
      "android/**",
      "ios/**",
      "supabase/.temp/**",
      "supabase/functions/**",
      ".claude/**",
    ],
  },
  {
    rules: {
      "import/no-unresolved": ["error", { commonjs: true }],
    },
    settings: {
      // Explicit version is LOAD-BEARING under ESLint 10: eslint-plugin-react's
      // "detect" path calls context.getFilename(), which ESLint 10 removed —
      // pinning the version skips that path entirely (#158). Bump alongside React.
      react: { version: "19.2" },
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
        node: {
          extensions: [".cjs", ".mjs", ".js", ".jsx", ".ts", ".tsx", ".d.ts", ...assetExtensions],
        },
      },
    },
  },
  {
    // Node.js contributor scripts — declare CommonJS globals that the React Native
    // environment doesn't include by default.
    files: ["scripts/**/*.js", "scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "writable",
        exports: "writable",
        process: "readonly",
        Buffer: "readonly",
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.test.js"],
    rules: {
      // require() inside jest.mock factories is the idiomatic pattern - factories
      // can't reference out-of-scope ES imports because jest hoists the mock call.
      "@typescript-eslint/no-require-imports": "off",
      // Jest globals (describe, it, expect, ...) are injected by jest at runtime;
      // no-undef is already off for .ts test files via eslint-config-expo, match
      // that behaviour for plain .js test files in scripts/.
      "no-undef": "off",
    },
  },
  {
    // Room wiring goes through the useRoomStyle/useRoomCardHsl hooks - they
    // carry the scheme read and the cached style identity, so screens can't
    // drift back to per-file module consts. Tests are exempt: every room
    // suite imports roomVariables for its pour assertion.
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [MODULE_ROOM_RESTRICTION] }],
    },
  },
  {
    // mood/gratitude/sleep/journal entries carry a `dayKey`: the civil day captured
    // when the entry was logged, resolved once in the repository. Bucketing one of
    // them by the VIEWER's day instead moves entries between days after travel and
    // skews daily averages (#250). The viewer-local helpers stay available to the
    // modules with no captured offset (habits, ACT, CBT, breathing, meditation,
    // routines) - they have nothing better to use yet.
    // gratitude/sleep/journal join this list when they move onto `dayKey` too.
    files: ["src/features/mood/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            MODULE_ROOM_RESTRICTION,
            ...["@/src/utils/date", "@/src/stores/selected-date-store"].map((name) => ({
              name,
              importNames: ["toLocalDateKey", "localDateKey"],
              message:
                "Group by the entry's `dayKey` (the civil day captured at logging time) instead. Bucketing by the viewer's local day moves entries after travel - see #250.",
            })),
          ],
        },
      ],
    },
  },
  {
    // react-native-web 0.21 silently drops the object-form accessibilityState prop,
    // so state set that way never reaches the browser's accessibility tree. The
    // aria-* props (aria-checked/selected/expanded/disabled/busy) map to
    // accessibilityState on native AND emit real ARIA on web. Only the
    // react-native-reusables wrappers keep the object form - it is consumed by
    // the @rn-primitives roots, which emit correct ARIA themselves.
    files: ["**/*.tsx"],
    ignores: ["src/components/react-native-reusables/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='accessibilityState']",
          message:
            "accessibilityState is dropped by react-native-web; use the equivalent aria-* prop (aria-checked/aria-selected/aria-expanded/aria-disabled/aria-busy) instead.",
        },
      ],
    },
  },
  prettierConfig,
];
