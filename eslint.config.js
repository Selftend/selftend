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

// The features whose entries carry a captured civil day (`dayKey`) and, for
// timestamps, a captured offset (#250, #330). Every route from one of these to
// the VIEWER's day is guarded - the import-layer and syntax-layer halves below.
// The breathing SCREEN lives under app/, which is how its viewer-local
// timestamps escaped a feature-dir-only guard until #433.
const CAPTURED_FRAME_FILES = [
  "src/features/mood/**/*.{ts,tsx}",
  "src/features/gratitude/**/*.{ts,tsx}",
  "src/features/sleep/**/*.{ts,tsx}",
  "src/features/journal/**/*.{ts,tsx}",
  "src/features/meditation/**/*.{ts,tsx}",
  "src/features/breathing/**/*.{ts,tsx}",
  "src/features/grounding/**/*.{ts,tsx}",
  "src/features/activities/**/*.{ts,tsx}",
  "src/features/cbt/**/*.{ts,tsx}",
  "app/(app)/tools/breathing/**/*.{ts,tsx}",
];

// Import-layer half of the captured-frame guard. `allow` names an import a
// specific file keeps ON PURPOSE - each exemption block below states its
// reason, because the exemption is the documentation.
function capturedFrameImportPaths(allow = []) {
  const dayNames = ["toLocalDateKey", "localDateKey", "calendarDayDiff"].filter(
    (n) => !allow.includes(n),
  );
  const clockNames = ["formatTimestamp"].filter((n) => !allow.includes(n));
  const activityNames = ["formatRelativeActivity"].filter((n) => !allow.includes(n));
  return [
    MODULE_ROOM_RESTRICTION,
    ...(dayNames.length
      ? ["@/src/utils/date", "@/src/stores/selected-date-store"].map((name) => ({
          name,
          importNames: dayNames,
          message:
            "Group by the entry's `dayKey` (the civil day captured at logging time) instead. Bucketing by the viewer's local day moves entries after travel - see #250 and #330.",
        }))
      : []),
    ...(clockNames.length
      ? [
          {
            name: "@/src/utils/date",
            importNames: clockNames,
            message:
              "Render an occurrence timestamp with formatAtOffset(value, offsetMinutes) so it reads in the frame it was captured in (#433 §3). Server-set updatedAt labels are the one sanctioned viewer-local use - exempt the file below the guard block and say why.",
          },
        ]
      : []),
    ...(activityNames.length
      ? [
          {
            name: "@/src/utils/relative-time",
            importNames: activityNames,
            message:
              "An entry is never labelled by activity recency: label from its captured dayKey with formatRelativeDayKey, or a day-key-grouped list files a card under YESTERDAY whose own label reads 'Today' (#433 §2). formatRelativeActivity is only for server-set instants that HAVE no captured frame - exempt the file and say why.",
          },
        ]
      : []),
  ];
}

// The hue gate (#589). The eight module hues survive ONLY as the pinned encoding
// palette - the mood heatmap ramp, the mood scale, habit colours, the breathing
// pacer, the user's custom-exercise colour, the sleep quality ramp. Everywhere
// else, module identity is icon and label (#558).
//
// This is a lint rule rather than a test because of what the old gates could not
// see. Three suites in this workstream were green while `think` shipped at
// 1.80:1 as a rendered glyph, because all three checked spelling and none
// checked the surface - and hue misuse is invisible at review time: the class
// name looks deliberate, and the defect is a colour on a screen nobody
// re-opened. A rule that fires in the editor catches it before it is written.
//
// Deliberately matched on the string LITERAL rather than on an import, because
// that is the shape every one of the 470 swept call sites had: a class name
// inside a className, a cva variant, or a lookup table - never an import a
// no-restricted-imports rule could see.
const HUE_NAMES_FOR_LINT = ["think", "act", "be", "aqua", "mist", "iris", "ink", "clay"];
const HUE_CHROME_PATTERN =
  `(?<![\w-])(text|bg|border|from|to|via|fill|stroke|ring|shadow|decoration|outline|caret|divide)` +
  `-(${HUE_NAMES_FOR_LINT.join("|")})(-ink)?(?![\w-])`;

const HUE_CHROME_MESSAGE =
  "Module hues are the pinned encoding palette, not chrome (#558/#589). Module and tool " +
  "identity is icon and label. Use the neutral roles in @/src/lib/theme/chrome " +
  "(CHROME_TEXT / CHROME_MARK / CHROME_WASH / CHROME_RULE / CHROME_BADGE_*) or the app " +
  "accent. If this really is an encoding the user reads off the colour, add it to " +
  "HUE_ENCODINGS in src/lib/theme/encoding.ts and exempt the file in eslint.config.js.";

const HUE_CHROME_RESTRICTIONS = [
  { selector: `Literal[value=/${HUE_CHROME_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
  { selector: `TemplateElement[value.raw=/${HUE_CHROME_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
];

// The files allowed to name a hue: the encoding palette's own source, and the
// six surfaces HUE_ENCODINGS sanctions. Anything added here needs an entry in
// HUE_ENCODINGS first - that is the whole point of keeping the two lists the
// same length.
const HUE_SANCTIONED_FILES = [
  "src/lib/design-tokens.ts",
  "src/lib/module-room.ts",
  "src/lib/hue-chip.ts",
  "src/features/mindfulness/exercise-hue.ts",
  "src/features/habits/habit-color.ts",
  "src/features/breathing/pacer-colors.ts",
  "src/features/breathing/exercise-colors.ts",
  "src/features/sleep/quality-tint.ts",
  "src/features/sleep/star-rating.tsx",
  "src/features/mood/score-tone.ts",
  "src/components/app/mood-scale.tsx",
];

// Shared by every no-restricted-syntax block: the rule is last-wins per file,
// so a captured-frame block that omitted this selector would quietly
// un-restrict accessibilityState for the files it matches.
const ACCESSIBILITY_STATE_RESTRICTION = {
  selector: "JSXAttribute[name.name='accessibilityState']",
  message:
    "accessibilityState is dropped by react-native-web; use the equivalent aria-* prop (aria-checked/aria-selected/aria-expanded/aria-disabled/aria-busy) instead.",
};

// Syntax-layer half of the captured-frame guard. Selector-based because two of
// the viewer-day routes never appear in an import: formatDate/formatDateTime
// arrive destructured from the useLocaleFormats() hook, and a raw Intl
// formatter (or toLocale*) applied to `new Date(instant)` imports nothing.
// #433 §2 found exactly this blind spot - a day-key-grouped surface labelling
// viewer-locally with every gate green.
function capturedFrameSyntaxRestrictions(allow = []) {
  return [
    {
      key: "localeFormats",
      selector: "CallExpression[callee.name=/^(formatDate|formatDateTime)$/]",
      message:
        "In a captured-offset feature, render an occurrence timestamp with formatAtOffset(value, offsetMinutes) so it reads in the frame it was captured in (#433 §3). Server-set updatedAt labels are the one sanctioned use - exempt the file below the guard block and say why.",
    },
    {
      key: "intlOnInstant",
      selector: "CallExpression[callee.property.name='format'] > NewExpression[callee.name='Date']",
      message:
        "Formatting `new Date(instant)` dates the value by the viewer's zone. Date a civil day via parseLocalNoon(dayKey), or render a timestamp with formatAtOffset (#433 §2).",
    },
    {
      key: "toLocaleOnInstant",
      selector:
        "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/][callee.object.type='NewExpression']",
      message:
        "`new Date(instant).toLocale*String()` dates the value by the viewer's zone. Date a civil day via parseLocalNoon(dayKey), or render a timestamp with formatAtOffset (#433 §2).",
    },
  ]
    .filter((r) => !allow.includes(r.key))
    .map(({ selector, message }) => ({ selector, message }));
}

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
    // shared mindfulness_sessions offset, and CBT thought records and activities
    // (#330) all carry a captured civil day, resolved once in the repository.
    // Bucketing one of them by the VIEWER's day instead moves entries between days
    // after travel and skews daily averages. Activities carry TWO such days -
    // `completedDayKey` for when it was done, `scheduledDayKey` for the day it was
    // planned for - so neither the completion nor the plan may be re-derived from
    // its timestamp here. The viewer-local helpers stay available to ACT, which has
    // no captured offset and is deliberately out of #330's scope until it grows a
    // history surface, and to routines, whose day axis is deliberately viewer-local
    // (#330 owner decision). Habits are already correct by a different route:
    // `habit_logs.logged_on` stores the resolved civil date, so no timestamp is
    // ever converted.
    files: CAPTURED_FRAME_FILES,
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: capturedFrameImportPaths() }],
    },
  },
  {
    // journal's hero subline is recency of ACTIVITY - server-set updatedAt,
    // chosen over created_at because created_at is user-backdatable - and an
    // update carries no captured offset, so the viewer's frame is the only
    // frame it has. Entries themselves label from dayKey (journal-card).
    files: ["src/features/journal/journal-list-screen.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: capturedFrameImportPaths(["formatRelativeActivity"]) },
      ],
    },
  },
  {
    // Both sites render a record's server-set updatedAt ("last edited"), which
    // has no captured offset. A thought record's OCCURRENCE day is its
    // created_offset_minutes, and that is not what these labels show.
    files: [
      "src/features/cbt/cbt-history-screen.tsx",
      "src/features/cbt/thought-record-detail-screen.tsx",
    ],
    rules: {
      "no-restricted-imports": ["error", { paths: capturedFrameImportPaths(["formatTimestamp"]) }],
    },
  },
  {
    // The hue gate, tree-wide (#589). `.ts` as well as `.tsx`: the maps this
    // workstream deleted - TINT_TEXT, TINT_ACCENT, tool-accent, widget-tint -
    // were all plain modules, and a class table is where a hue comes back.
    //
    // Every no-restricted-syntax block BELOW this one re-states
    // HUE_CHROME_RESTRICTIONS, because the rule is last-wins per file and a
    // block that omitted them would quietly un-restrict hue for its files.
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    // Tests name hues on purpose - they assert their ABSENCE ("not.toContain
    // text-be"), which the rule cannot tell from painting one. Source is covered
    // by the static gates in test/module-identity-neutral.test.ts as well.
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...HUE_CHROME_RESTRICTIONS],
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
        ACCESSIBILITY_STATE_RESTRICTION,
        // Re-stated because this block is last-wins for every .tsx it matches.
        // Test files are exempt from the hue half via the trailing block below.
        ...HUE_CHROME_RESTRICTIONS,
      ],
    },
  },
  {
    // Syntax-layer captured-frame guard (see capturedFrameSyntaxRestrictions).
    // Sits AFTER the accessibilityState block: no-restricted-syntax is also
    // last-wins per file, so this block re-states that selector too.
    files: CAPTURED_FRAME_FILES,
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ACCESSIBILITY_STATE_RESTRICTION,
        ...HUE_CHROME_RESTRICTIONS,
        ...capturedFrameSyntaxRestrictions(),
      ],
    },
  },
  {
    // meditation daily-life notes are edited documents, not occurrences: their
    // only displayed timestamp is server-set updatedAt, which carries no
    // captured offset, so the viewer's frame is the only frame it has.
    files: [
      "src/features/meditation/meditation-daily-life-screen.tsx",
      "src/features/meditation/meditation-daily-life-card.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ACCESSIBILITY_STATE_RESTRICTION,
        ...HUE_CHROME_RESTRICTIONS,
        ...capturedFrameSyntaxRestrictions(["localeFormats"]),
      ],
    },
  },
  {
    // Tests, exempted from the hue half only (see the tree-wide block's note).
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ACCESSIBILITY_STATE_RESTRICTION],
    },
  },
  {
    // LAST, and that is load-bearing: no-restricted-syntax is last-wins per
    // file, so this is what actually exempts the encoding palette's own files
    // from the hue rule every block above carries. `.tsx` entries keep the
    // accessibilityState guard they would otherwise lose with it.
    files: HUE_SANCTIONED_FILES,
    rules: {
      "no-restricted-syntax": ["error", ACCESSIBILITY_STATE_RESTRICTION],
    },
  },
  prettierConfig,
];
