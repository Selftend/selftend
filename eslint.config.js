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
    // drift back to per-file module consts. Tests used to be exempt so each
    // room suite could compare against roomVariables(hue)[scheme] - but that
    // comparison could not fail (a nativewind vars() style has no enumerable
    // keys, so every hue deep-equalled every other, #389). Suites now assert
    // through expectRoomPour from @/test/room-pour, so the exemption is gone
    // and a suite cannot hand-roll the vacuous form again.
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [MODULE_ROOM_RESTRICTION] }],
    },
  },
  {
    // mood/gratitude/sleep/journal (#250), meditation, breathing/grounding via the
    // shared mindfulness_sessions offset, and CBT thought records (#330) all carry
    // a `dayKey`: the civil day captured when the entry was logged, resolved once
    // in the repository. Bucketing one of them by the VIEWER's day instead moves
    // entries between days after travel and skews daily averages. The viewer-local
    // helpers stay available to ACT, which has no captured offset and is
    // deliberately out of #330's scope until it grows a history surface, and to
    // routines, whose day axis is deliberately viewer-local (#330 owner decision).
    // Habits are already correct by a different route: `habit_logs.logged_on`
    // stores the resolved civil date, so no timestamp is ever converted.
    files: [
      "src/features/mood/**/*.{ts,tsx}",
      "src/features/gratitude/**/*.{ts,tsx}",
      "src/features/sleep/**/*.{ts,tsx}",
      "src/features/journal/**/*.{ts,tsx}",
      "src/features/meditation/**/*.{ts,tsx}",
      "src/features/breathing/**/*.{ts,tsx}",
      "src/features/grounding/**/*.{ts,tsx}",
      "src/features/cbt/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/*.test.ts",
      "**/*.test.tsx",
      // Temporary, and the only file under src/features/cbt still bucketing by the
      // viewer. Its `didOnDate` also serves the activities and meditation legs of
      // the CBT programme checklist, and it is being edited by #414 right now, so
      // moving its thoughtRecordDaily leg onto `dayKey` belongs in that change
      // rather than in a conflicting edit here. Delete this entry once it lands.
      "src/features/cbt/program-definition.ts",
    ],
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
                "Group by the entry's `dayKey` (the civil day captured at logging time) instead. Bucketing by the viewer's local day moves entries after travel - see #250 and #330.",
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
