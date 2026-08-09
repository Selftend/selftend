import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { HUE_ENCODINGS, type HueEncodingId } from "@/src/lib/theme/encoding";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { stripComments } from "./source-scan";

// The gate for migrate batch B (#587): module and tool identity is icon and
// label, not colour.
//
// #558 measured why this batch exists at all. Switching the rooms off (#586)
// left `/modules` and `/tools` BYTE-IDENTICAL, because those two screens never
// poured a room - their colour comes from direct `text-<hue>` / `bg-<hue>/10`
// classes on badges, chips and glyphs. So the ask lives here, in a list of call
// sites with no chokepoint, which is exactly the shape of change that comes
// back a file at a time unless something holds it down.
//
// This suite is that hold-down, and it is deliberately two-sided:
//
//   - IDENTITY_SURFACES may carry no module hue at all. A regression here is
//     invisible at review time and shows up as one stubbornly green badge in an
//     otherwise neutral screen - the "half-done" look #558 called out.
//   - KEEPS_HUE must STILL carry hue. Over-sweeping is the opposite failure and
//     the more damaging one: it deletes a scale the user reads, or repaints a
//     colour they chose. The four entries are keyed off HUE_ENCODINGS so the
//     ruling and this gate cannot drift apart.
//
// #589 turns the first half into a lint rule covering the whole tree. Until
// then the list is explicit, because most of the tree still has hue in it
// legitimately and a blanket scan would fail on #588's work.

const ROOT = join(__dirname, "..");

const HUE_ALTERNATION = HUE_NAMES.join("|");

/**
 * A module hue used as a utility class - `text-act`, `bg-iris/10`,
 * `border-be/30`, `from-clay`, and the `-ink` variants.
 *
 * The lookbehind is what keeps `text-primary-ink` out: the prefix has to be the
 * whole word before the dash, so `primary-ink` never reads as the `ink` hue.
 */
const HUE_CLASS = new RegExp(
  // `border` takes an optional DIRECTION and `ring` an optional `-offset`,
  // because Tailwind builds a colour utility for each: `border-t-act`,
  // `border-x-iris` and `ring-offset-be` all paint a hue. Requiring the prefix to
  // be the whole word let a neutral component reach a hue through any of them
  // while both gates stayed green. Kept identical to eslint.config.js.
  `(?<![\\w-])(text|bg|border(-[trblxyse])?|ring(-offset)?|from|to|via|fill|stroke|shadow|decoration|outline|accent|caret|divide)-(${HUE_ALTERNATION})(-ink)?(?![\\w-])`,
  "g",
);

/**
 * The same hue reached as a CSS variable - `hsl(var(--act)/0.10)`, and the
 * arbitrary-value class form `bg-[hsl(var(--iris)/0.12)]` that #421 found the
 * static gates were blind to.
 */
const HUE_VAR = new RegExp(`--(${HUE_ALTERNATION})(-ink)?(?![\\w-])`, "g");

/**
 * The hue maps themselves. A migrated file must not reach these even
 * indirectly: `TINT_TEXT[tint]` is a `text-<hue>-ink` by another name, and it is
 * how the landing page kept eight hues while looking like it named none.
 */
const HUE_IMPORT = /\b(TINT_TEXT|TINT_ACCENT|hueToTint|toolAccent|exerciseHue|hueGradient)\b/g;

/**
 * A hue handed to a colour helper as a STRING — `tintStripeColors("act", isDark)`,
 * `hueHsl("iris", …)`, `useRoomStyle("clay")`.
 *
 * Neither pattern above can see this: the argument is not a class name and not a
 * CSS variable, it is a bare word inside quotes. The gap was real rather than
 * theoretical — `pillar-card.tsx` paints its 3px stripe through
 * `tintStripeColors`, and flipping that argument back from `"primary"` to
 * `"act"` restored a green stripe with every other assertion in this file still
 * green. The helper is not itself forbidden; passing it a hue is.
 */
const HUE_ARGUMENT = new RegExp(
  String.raw`\b(tintStripeColors|hueHsl|hueRamp|hueGradient|useRoomStyle|hueRampClass)\(\s*"(${HUE_ALTERNATION})"`,
  "g",
);

/**
 * Every surface this batch neutralises, grouped by the acceptance criterion it
 * answers. A file earns its place here by rendering module or tool IDENTITY -
 * "which module is this" - which the ruling says an icon and a label already
 * carry.
 */
const IDENTITY_SURFACES: Record<string, string[]> = {
  // `tool-hero.tsx` used to sit here too; #733 deleted it, so its neutrality is
  // asserted by absence in RETIRED rather than by scanning a file that is gone.
  "module and tool badges": [
    "src/components/react-native-reusables/badge.tsx",
    "src/components/app/module-home-header.tsx",
  ],
  "sidebar icons": ["src/components/app/sidebar-nav.tsx"],
  // The programme cards were the loudest survivor of the first pass: the ACT
  // card renders on the ACT home directly beside pillar cards this same batch
  // made neutral. Its map held two entries that were the same eleven class
  // strings with the hue swapped, so the `primary` row WAS already the neutral
  // form and collapsing onto it added no classes.
  "the programme cards": [
    "src/components/app/program-card.tsx",
    "src/components/app/act-program-card.tsx",
    "src/components/app/cbt-program-card.tsx",
  ],
  "the module and tool listings": [
    "src/features/modules/modules-screen.tsx",
    "src/features/tools/tools-screen.tsx",
    // The CBT home's pillar cards and the shared-tool pills beneath them are a
    // tool listing wearing a different frame: both took the owning pillar's hue,
    // and both sit on the same screen, so leaving either would have shown the
    // half-swept look on the module the app leads with.
    "src/features/cbt/cbt-home/shared-tools-row.tsx",
    "src/features/cbt/cbt-home/cbt-pillars-section.tsx",
  ],
  "the signed-out module surfaces": [
    "src/components/app/pillar-card.tsx",
    "src/components/app/landing/modules-section.tsx",
    "src/components/app/landing/landing-screen.tsx",
  ],
  // A widget's header chip is a module badge with a different frame around it:
  // the module's glyph in a tint of the module's own hue, beside the module's
  // own name. The ticket names badges rather than widgets, but the home
  // dashboard is the first screen a signed-in user sees, and a neutral
  // `/modules` behind a fully hued home is the same half-done look #558
  // rejected. Read as in scope; recorded on the PR.
  "the home dashboard's widget identity": [
    "src/features/home/widget-tint.ts",
    "src/features/home/widgets/widget-card-header.tsx",
    "src/features/home/widgets/activities-widget.tsx",
    "src/features/home/widgets/breathing-widget.tsx",
    "src/features/home/widgets/gratitude-widget.tsx",
    "src/features/home/widgets/grounding-log-widget.tsx",
    "src/features/home/widgets/journal-week-widget.tsx",
    "src/features/home/widgets/meditation-widget.tsx",
    "src/features/home/widgets/mood-checkin-widget.tsx",
    "src/features/home/widgets/mood-trend-widget.tsx",
    "src/features/home/widgets/routines-widget.tsx",
    "src/features/home/widgets/sleep-widget.tsx",
  ],
};

/**
 * Files this batch deletes outright. `tool-accent.ts` existed to answer "what
 * colour is this tool", and the ruling is that a tool has no colour - so there
 * is nothing left for it to return. Asserted by absence rather than by content,
 * because a neutralised version of it would be a map from eleven tool ids to
 * one constant.
 */
const RETIRED = [
  "src/features/home/tool-accent.ts",
  // #733's deletions, listed here for the same reason: the surest gate on a
  // hue-bearing surface is that the file no longer exists. `tool-hero.tsx` was
  // already consumerless; `tool-stats.tsx` took `accentClassName` and
  // `content-sheet.tsx` existed only to overlap the field.
  "src/components/app/tool-hero.tsx",
  "src/components/app/tool-stats.tsx",
  "src/components/app/content-sheet.tsx",
];

/**
 * The other half of the gate. Each surface that KEEPS hue, and the literal that
 * proves it still does. Six of them - see the note in src/lib/theme/encoding.ts
 * for the two #588 added to #558's four.
 *
 * The pattern is the encoding itself, not merely "some hue appears here": the
 * failure being guarded against is a later sweep that neutralises the mood
 * ramp because it looks like every other tinted chip in the diff.
 */
const KEEPS_HUE: Record<HueEncodingId, { file: string; pattern: RegExp; what: string }> = {
  "mood-heatmap-ramp": {
    file: "src/lib/design-tokens.ts",
    pattern: /bg-act\/\[0\.16\]/,
    what: "HUE_RAMP_CLASSES, the 5-step score ramp",
  },
  "mood-scale": {
    file: "src/components/app/mood-scale.tsx",
    pattern: /hueHsl\("act"/,
    what: "the 1-5 input control's hue wash",
  },
  "habit-colour": {
    file: "src/features/habits/habit-color.ts",
    pattern: /HABIT_COLOR_TINTS/,
    what: "the colour the user chose for a habit",
  },
  "breathing-pacer": {
    file: "src/features/breathing/pacer-colors.ts",
    pattern: /PACER_HUE[^=]*=\s*"aqua"/,
    what: "the live inhale/hold/exhale phase",
  },
  // Added by #588, which found them mid-sweep. Neither is in #558's table; both
  // are admitted by its rule. See the note in src/lib/theme/encoding.ts.
  "breathing-exercise-colour": {
    file: "src/features/breathing/exercise-colors.ts",
    // Was `case "aqua":` while this file was a switch returning utility classes.
    // #780 moved it onto the same alias-map + chipHsl mechanism habits uses, so
    // the literal that proves the encoding is now the map itself - exactly as
    // the `habit-colour` entry above pins `HABIT_COLOR_TINTS`. Same strength,
    // same shape: a sweep that neutralised this file would delete the map.
    pattern: /BREATHING_COLOR_TINTS/,
    what: "the colour the user picked for their own exercise",
  },
  "sleep-quality-ramp": {
    file: "src/features/sleep/quality-tint.ts",
    pattern: /hueRampClass\("ink"/,
    what: "the 5-step night-quality scale",
  },
};

const read = (file: string): string => stripComments(readFileSync(join(ROOT, file), "utf8"));

const findings = (source: string, pattern: RegExp): string[] =>
  [...source.matchAll(new RegExp(pattern.source, pattern.flags))].map((m) => m[0]);

describe("module and tool identity carries no hue (#587)", () => {
  for (const [criterion, files] of Object.entries(IDENTITY_SURFACES)) {
    describe(criterion, () => {
      for (const file of files) {
        it(`${file} names no hue utility class`, () => {
          expect(findings(read(file), HUE_CLASS)).toEqual([]);
        });

        it(`${file} names no hue CSS variable`, () => {
          expect(findings(read(file), HUE_VAR)).toEqual([]);
        });

        it(`${file} reaches no hue map`, () => {
          expect(findings(read(file), HUE_IMPORT)).toEqual([]);
        });

        it(`${file} passes no hue to a colour helper`, () => {
          expect(findings(read(file), HUE_ARGUMENT)).toEqual([]);
        });
      }
    });
  }

  for (const file of RETIRED) {
    it(`${file} is gone - a tool has no colour to look up`, () => {
      expect(existsSync(join(ROOT, file))).toBe(false);
    });
  }
});

describe("the surfaces that keep hue are untouched (#558, extended by #588)", () => {
  it("covers every ruled encoding, so the ruling and the gate cannot drift", () => {
    expect(Object.keys(KEEPS_HUE).sort()).toEqual(HUE_ENCODINGS.map((e) => e.id).sort());
  });

  // #588's acceptance criterion, and the one failure in this area that is
  // silent rather than loud: a CATEGORICAL encoding that follows the active
  // style repaints the user's own data. A habit they painted green becomes
  // something else because they tried amber-noir, with nothing on screen
  // connecting the two.
  //
  // Asserted structurally rather than by rendering under eight palettes, because
  // what makes these pinned is that they read the fixed hue palette and never
  // reach the style axis at all. A `useStyleName` or `THEME_TOKENS` appearing in
  // one of these files is the change that would break it.
  it("keeps the categorical encodings off the style axis entirely", () => {
    const pinned = HUE_ENCODINGS.filter((e) => e.kind === "categorical").map(
      (e) => KEEPS_HUE[e.id].file,
    );
    expect(pinned.length).toBeGreaterThanOrEqual(3);

    for (const file of pinned) {
      const source = read(file);
      expect(source).not.toMatch(/\bTHEME_TOKENS\b/);
      expect(source).not.toMatch(/\buseStyleName\b/);
      expect(source).not.toMatch(/lib\/style/);
    }
  });

  for (const [id, { file, pattern, what }] of Object.entries(KEEPS_HUE)) {
    it(`${id} still encodes in hue: ${what}`, () => {
      expect(read(file)).toMatch(pattern);
    });
  }
});

// The lint gate #589 added, and the one way it can rot quietly: the rule is a
// list of exempt FILES, the ruling is a list of ENCODINGS, and nothing connects
// them. An encoding added without its file exempted fails loudly (the lint rule
// fires); a file exempted without an encoding behind it fails silently, and is
// exactly how a hue comes back as chrome wearing an exemption.
describe("the lint gate's exemptions and the ruling agree (#589)", () => {
  const config = readFileSync(join(ROOT, "eslint.config.js"), "utf8");

  /** The literal entries of HUE_SANCTIONED_FILES in eslint.config.js. */
  const sanctioned = (() => {
    const block = config.slice(
      config.indexOf("const HUE_SANCTIONED_FILES = ["),
      config.indexOf("];", config.indexOf("const HUE_SANCTIONED_FILES = [")),
    );
    return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  })();

  // The spellings that slipped past the first version of this gate. Tailwind
  // builds a colour utility per border direction and for the ring offset, so
  // `border-t-act` paints just as real a hue as `border-act` - and because the
  // prefix alternation required the whole word, all of these linted clean.
  // Verified against the old pattern: it matched none of the first three.
  it.each([
    "border-t-act",
    "border-b-think",
    "border-x-iris",
    "border-y-be",
    "border-s-clay",
    "border-e-mist",
    "ring-offset-aqua",
    "border-act",
    "bg-ink",
  ])("the class gate matches %s", (cls) => {
    expect(cls).toMatch(new RegExp(HUE_CLASS.source));
  });

  // The lookbehind still has to hold: neutral roles must NOT trip the gate, or
  // the sweep it guards becomes noise everyone learns to switch off.
  it.each(["text-primary-ink", "border-border", "bg-muted", "text-muted-foreground"])(
    "the class gate leaves %s alone",
    (cls) => {
      expect(cls).not.toMatch(new RegExp(HUE_CLASS.source));
    },
  );

  it("declares the rule at all", () => {
    // The cheap guard: everything below passes vacuously if the rule is gone.
    expect(config).toMatch(/HUE_CHROME_RESTRICTIONS/);
    expect(config).toMatch(/no-restricted-syntax/);
    expect(sanctioned.length).toBeGreaterThan(0);
  });

  it("exempts every file a keeps-hue encoding actually lives in", () => {
    const needed = Object.values(KEEPS_HUE).map((entry) => entry.file);
    const missing = needed.filter((file) => !sanctioned.includes(file));

    expect(missing).toEqual([]);
  });

  it("exempts nothing that is not either an encoding surface or the palette itself", () => {
    // The palette's own plumbing: these define the hues rather than reading
    // them, so they carry no encoding id of their own.
    const palette = [
      "src/lib/design-tokens.ts",
      "src/lib/module-room.ts",
      "src/lib/hue-chip.ts",
      "src/features/mindfulness/exercise-hue.ts",
      // The sleep quality ramp's input control, the twin of mood-scale.
      "src/features/sleep/star-rating.tsx",
      // The mood ramp's class helper. The encoding itself is keyed to
      // design-tokens.ts (where HUE_RAMP_CLASSES lives); this is the one-line
      // wrapper the mood surfaces call.
      "src/features/mood/score-tone.ts",
    ];
    const allowed = new Set([...Object.values(KEEPS_HUE).map((e) => e.file), ...palette]);
    const unjustified = sanctioned.filter((file) => !allowed.has(file));

    expect(unjustified).toEqual([]);
  });
});
