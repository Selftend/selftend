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
  `(?<![\\w-])(text|bg|border|from|to|via|fill|stroke|ring|shadow|decoration|outline|accent|caret|divide)-(${HUE_ALTERNATION})(-ink)?(?![\\w-])`,
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
 * Every surface this batch neutralises, grouped by the acceptance criterion it
 * answers. A file earns its place here by rendering module or tool IDENTITY -
 * "which module is this" - which the ruling says an icon and a label already
 * carry.
 */
const IDENTITY_SURFACES: Record<string, string[]> = {
  "module and tool badges": [
    "src/components/react-native-reusables/badge.tsx",
    "src/components/app/tool-hero.tsx",
    "src/components/app/module-home-header.tsx",
  ],
  "sidebar icons": ["src/components/app/sidebar-nav.tsx"],
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
const RETIRED = ["src/features/home/tool-accent.ts"];

/**
 * The other half of the gate. Each of the four surfaces that KEEPS hue, and the
 * literal that proves it still does.
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
      }
    });
  }

  for (const file of RETIRED) {
    it(`${file} is gone - a tool has no colour to look up`, () => {
      expect(existsSync(join(ROOT, file))).toBe(false);
    });
  }
});

describe("the four surfaces that keep hue are untouched (#558)", () => {
  it("covers every ruled encoding, so the ruling and the gate cannot drift", () => {
    expect(Object.keys(KEEPS_HUE).sort()).toEqual(HUE_ENCODINGS.map((e) => e.id).sort());
  });

  for (const [id, { file, pattern, what }] of Object.entries(KEEPS_HUE)) {
    it(`${id} still encodes in hue: ${what}`, () => {
      expect(read(file)).toMatch(pattern);
    });
  }
});
