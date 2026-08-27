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

// The raw-Modal ban (#1166 clause G2, built by #1260). PressShieldModal's
// required onEscape makes a forgotten modal Escape a type error - but only for
// modals that actually render through the wrapper. A raw Modal written around
// it inherits neither the Escape row nor the #1054 web-unmount gate, so the
// import itself is what this rule closes off. Kept as a shared constant
// because no-restricted-imports is last-wins per file, and every later import
// block that covers a component dir must re-state it.
const RAW_MODAL_RESTRICTION = {
  name: "react-native",
  importNames: ["Modal"],
  message:
    "A raw Modal bypasses the modal escape guarantees (#1166/#1260) - render through PressShieldModal from @/src/components/app/press-shield-modal, which carries the pinned Escape row and the web-unmount gate. If this surface genuinely cannot (its entire content already is an explicit way out), exempt the file in eslint.config.js with a reason - test/raw-modal-ban.test.ts keeps the exemption list honest.",
};

// The sanctioned importer plus the frozen bypasser set. Every exemption is a
// surface already ruled out of the modal rule's scope - the small dialogs whose
// entire content is an explicit Cancel, plus the coach-mark overlay (#1165).
// This list is FROZEN: the right response to it growing is to question the new
// entry, not to extend the list. test/raw-modal-ban.test.ts asserts the set
// below equals the set of files that actually import Modal, so a stale entry -
// a file converted to the wrapper or deleted - fails loudly instead of
// lingering as a silent hole.
const RAW_MODAL_EXEMPT_FILES = [
  // The one sanctioned importer: the wrapper itself.
  "src/components/app/press-shield-modal.tsx",
  // Small confirm dialog - its entire content is the explicit Cancel/confirm
  // pair, ruled out of the pinned-row scope by #1165.
  "src/components/app/confirm-dialog.tsx",
  // Same shape as ConfirmDialog: a destructive confirm with its own Cancel.
  "src/components/app/delete-account-modal.tsx",
  // Web-only crop dialog with a visible Cancel; the native file is a null stub.
  "src/components/app/avatar-crop-modal.web.tsx",
  // Coach-mark overlay with its own text dismissals, ruled out of scope by #1165.
  "src/features/tours/tour-overlay.tsx",
];

// The Origin contract (#1167 clause O3, built by #1269). #1164 decided the
// origin is recorded on EVERY push through one helper - opt-out, not opt-in -
// because the cross-link set keeps growing and a push that forgets fails
// invisibly: nothing is recorded, and the arriving screen just quietly shows
// Up. Without this rule the migration (#1265/#1266/#1267) rots straight back
// to opt-in, one new call site at a time. no-restricted-properties rather than
// another no-restricted-syntax selector: every no-restricted-syntax block in
// this file is last-wins per file and each would have to re-state the
// selector, while no-restricted-properties is configured nowhere else - here
// or upstream in expoConfig - so one tree-wide block composes without
// disturbing anything.
const BARE_ROUTER_PUSH_RESTRICTIONS = [
  {
    object: "router",
    property: "push",
    message:
      "A bare router.push records no Origin, so a cross-hierarchy arrival quietly shows Up instead of the way back (#1167 O3). Navigate through usePushWithOrigin from @/src/lib/escape-origin. If this move genuinely must not record one (nav chrome, a cold arrival, a backwards move), exempt the file in eslint.config.js with the reason - test/bare-router-push-ban.test.ts keeps the exemption list honest.",
  },
  {
    object: "router",
    property: "navigate",
    message:
      "A bare router.navigate records no Origin, so a cross-hierarchy arrival quietly shows Up instead of the way back (#1167 O3). Navigate through usePushWithOrigin from @/src/lib/escape-origin. If this move genuinely must not record one (nav chrome, a cold arrival, a backwards move), exempt the file in eslint.config.js with the reason - test/bare-router-push-ban.test.ts keeps the exemption list honest.",
  },
];

// The declared opt-outs: every file here stays bare ON PURPOSE, for the stated
// reason - each records no origin because recording one would be wrong, not
// because it predates the helper. FROZEN the same way RAW_MODAL_EXEMPT_FILES
// is: the right response to it growing is to question the new entry.
// test/bare-router-push-ban.test.ts asserts the set below equals the set of
// files that actually call router.push/router.navigate, so a migrated or
// deleted call site fails loudly instead of lingering as a silent hole.
const BARE_ROUTER_PUSH_EXEMPT_FILES = [
  // The one sanctioned caller: the helper itself - its push IS the recorded one.
  "src/lib/escape-origin.ts",
  // Nav chrome's deliberate opt-out (#1264/#1265): go-somewhere-else-entirely
  // affordances whose targets are top-level routes already rooted correctly -
  // an Escape reading back-to-CBT on Settings would compete with the sidebar
  // as the way back. The full five-surface set, with the reasoning that
  // separates these two callers from the three that never call push, is
  // enumerated in src/components/app/nav-chrome-origin.test.ts. (No quoted
  // phrases in these comments: the honesty test reads the list's entries as
  // every string literal between the brackets.)
  "src/components/app/user-menu.tsx",
  // The breadcrumb is the escape chrome itself: its jumps are the Up trail.
  "src/components/app/screen-breadcrumb.tsx",
  // Cold arrival (#1267): a notification tap opens the app from outside, so
  // there is no in-app where-you-came-from to record.
  "src/features/notifications/use-notification-deep-link.ts",
  // The editor forms' `canGoBack() ? back() : push(fallback)` is a BACKWARDS
  // move (#1267): recording it would aim the destination's Escape back into
  // the just-abandoned form.
  "src/features/gratitude/gratitude-entry-editor-screen.tsx",
  "src/features/habits/habit-editor-screen.tsx",
  "src/features/journal/journal-entry-editor-screen.tsx",
  "src/features/mood/mood-entry-editor-screen.tsx",
  "src/features/routines/routine-editor-screen.tsx",
  "src/features/sleep/sleep-log-screen.tsx",
];

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
    // Re-stated because every block built from this function is last-wins for
    // the feature dirs it matches - omitting it here would quietly un-ban the
    // raw Modal for every captured-frame feature.
    RAW_MODAL_RESTRICTION,
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
// pacer, the user's custom-exercise colour. Everywhere else, module identity is
// icon and label (#558).
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
// `accent` is in this list and it is not the `--accent` token: Tailwind builds an
// `accent-<colour>` family for the CSS `accent-color` property, so `accent-ink`
// paints a form control in the ink hue. It is an obscure way to reach a hue and
// exactly the kind the sweep would miss - found by grepping a built bundle, not
// by reading. `accent-foreground` is unaffected; `foreground` is not a hue name.
//
// Kept identical to the prefix list in test/module-identity-neutral.test.ts. The
// two gates guard the same thing and drifted here, which is its own small lesson.
//
// `border` carries an optional DIRECTION, and `ring` an optional `-offset`,
// because Tailwind builds a colour utility for each: `border-t-act`,
// `border-x-iris` and `ring-offset-be` are all real classes that paint a hue.
// Without those groups the prefix had to be the whole word, so a neutral
// component could reach a prohibited hue through any of them and lint stayed
// green - the same shape as the arbitrary-value hole below, which hid ~78 sites
// in #421.
const HUE_CHROME_PATTERN =
  String.raw`(?<![\w-])(text|bg|border(-[trblxyse])?|ring(-offset)?|from|to|via|fill|stroke|shadow|decoration|outline|accent|caret|divide)` +
  String.raw`-(${HUE_NAMES_FOR_LINT.join("|")})(-ink)?(?![\w-])`;

// The OTHER spelling, and the one that hid ~78 sites from every gate in #421:
// `bg-[hsl(var(--act)/0.10)]`. It is an arbitrary value, so the hue never
// appears after a utility prefix and the pattern above cannot see it. Matching
// the CSS variable directly catches both that form and any raw `var(--iris)`
// reaching a style prop.
const HUE_VAR_PATTERN = String.raw`--(${HUE_NAMES_FOR_LINT.join("|")})(-ink)?(?![\w-])`;

const HUE_CHROME_MESSAGE =
  "Module hues are the pinned encoding palette, not chrome (#558/#589). Module and tool " +
  "identity is icon and label. Use the neutral roles in @/src/lib/theme/chrome " +
  "(CHROME_TEXT / CHROME_MARK / CHROME_WASH / CHROME_RULE / CHROME_BADGE_*) or the app " +
  "accent. If this really is an encoding the user reads off the colour, add it to " +
  "HUE_ENCODINGS in src/lib/theme/encoding.ts and exempt the file in eslint.config.js.";

const HUE_CHROME_RESTRICTIONS = [
  { selector: `Literal[value=/${HUE_CHROME_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
  { selector: `TemplateElement[value.raw=/${HUE_CHROME_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
  { selector: `Literal[value=/${HUE_VAR_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
  { selector: `TemplateElement[value.raw=/${HUE_VAR_PATTERN}/]`, message: HUE_CHROME_MESSAGE },
];

// The files allowed to name a hue: the encoding palette's own source, and the
// surfaces HUE_ENCODINGS sanctions. Anything added here needs an entry in
// HUE_ENCODINGS first - that is the whole point of keeping the two lists the
// same length. (score-tone.ts left with #924: the mood ramp rides the accent
// now, and the accent needs no exemption.)
const HUE_SANCTIONED_FILES = [
  "src/lib/design-tokens.ts",
  "src/lib/hue-chip.ts",
  "src/features/mindfulness/exercise-hue.ts",
  "src/features/habits/habit-color.ts",
  "src/features/breathing/pacer-colors.ts",
  "src/features/breathing/exercise-colors.ts",
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
    // Import-layer raw-Modal ban (#1166 G2, #1260) for the component dirs.
    // Tests are ignored: a test imports Modal to FIND it in a render tree, not
    // to author one. The exempt files are ignored the same way.
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", ...RAW_MODAL_EXEMPT_FILES],
    rules: {
      "no-restricted-imports": ["error", { paths: [RAW_MODAL_RESTRICTION] }],
    },
  },
  {
    // The same ban for the src/ dirs the block above never covered
    // (providers, stores, utils, i18n, lib, constants) plus top-level lib/.
    files: ["src/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["src/features/**", "src/components/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [RAW_MODAL_RESTRICTION] }],
    },
  },
  {
    // The Origin contract (#1167 O3, #1269): a bare router.push / navigate is
    // an error outside the helper and the declared opt-outs above. One
    // tree-wide block is enough - no other block here or upstream configures
    // no-restricted-properties, so there is nothing for last-wins to disarm
    // (unlike the no-restricted-syntax stack below). Tests are ignored: a test
    // reaches for router.push to assert on the mock, not to navigate.
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", ...BARE_ROUTER_PUSH_EXEMPT_FILES],
    rules: {
      "no-restricted-properties": ["error", ...BARE_ROUTER_PUSH_RESTRICTIONS],
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
    //
    // The detail screen's footer joins the same two frames on purpose: "Written"
    // reads the entry's captured dayKey, and only the "edited" segment beside it
    // uses activity recency, because a revision is a server-set instant with no
    // frame of its own (#769).
    files: [
      "src/features/journal/journal-list-screen.tsx",
      "src/features/journal/journal-detail-screen.tsx",
    ],
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
    //
    // The history screen's own label moved into the shared row it now renders
    // (#1386); the overview's recent records read the same field through the
    // same component, so the exemption follows the import rather than the
    // screen.
    files: [
      "src/features/cbt/thought-record-row.tsx",
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
      // The captured-frame selectors are re-stated because two of these files
      // are ALSO in CAPTURED_FRAME_FILES - pacer-colors,
      // exercise-colors - and last-wins would have exempted them from the
      // day-key guard as a side effect of exempting them from the hue guard.
      // Exactly the last-wins failure the comment on RAW_MODAL_RESTRICTION
      // warns about, one rule over.
      "no-restricted-syntax": [
        "error",
        ACCESSIBILITY_STATE_RESTRICTION,
        ...capturedFrameSyntaxRestrictions(),
      ],
    },
  },
  prettierConfig,
];
