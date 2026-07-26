import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { habitChipColors, HABIT_COLOR_TINTS } from "@/src/features/habits/habit-color";
import { HABITS_LEARN_CARDS } from "@/src/features/habits/learn";
import { HABIT_COLORS } from "@/src/features/habits/schemas";
import { TINT_TOKENS } from "@/src/lib/design-tokens";

describe("habit colors are an alias layer over the design tokens", () => {
  it("maps every stored color to a tint token", () => {
    expect(Object.keys(HABIT_COLOR_TINTS).sort()).toEqual([...HABIT_COLORS].sort());
    for (const color of HABIT_COLORS) {
      expect(TINT_TOKENS).toContain(HABIT_COLOR_TINTS[color]);
    }
  });

  it("keeps the legacy palette names pointed at token hues", () => {
    // The four names below are stored in the `habits.color` column, so they
    // stay as-is; only what they resolve to changed (#278). Pinning the map
    // here means a retune of those hues re-tints existing habits instead of
    // drifting away from them.
    expect(HABIT_COLOR_TINTS.amber).toBe("think");
    expect(HABIT_COLOR_TINTS.emerald).toBe("mist");
    expect(HABIT_COLOR_TINTS.violet).toBe("iris");
    expect(HABIT_COLOR_TINTS.rose).toBe("clay");
  });

  it("gives every color a distinct hue", () => {
    const tints = HABIT_COLORS.map((color) => HABIT_COLOR_TINTS[color]);
    expect(new Set(tints).size).toBe(tints.length);
  });

  it("resolves each color to hsl() strings in both schemes", () => {
    for (const color of HABIT_COLORS) {
      for (const scheme of ["light", "dark"] as const) {
        const chip = habitChipColors(color, scheme);
        for (const value of Object.values(chip)) {
          expect(value).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
        }
      }
    }
  });

  it("tones every learn card with a habit color", () => {
    for (const card of HABITS_LEARN_CARDS) {
      expect(HABIT_COLORS).toContain(card.tone);
    }
  });
});

describe("the habits feature never hardcodes a raw palette color", () => {
  // Habit color chips used to reach for `bg-amber-200/40 dark:bg-amber-900/30`
  // and friends - outside the token system, so they missed palette retunes and
  // carried hand-picked dark variants (#278). Every accent in this feature now
  // resolves through HABIT_COLOR_TINTS or a `--hue` token class, and a raw
  // Tailwind palette literal is a drift from that by definition.
  const RAW_PALETTE =
    /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
  const featureDir = join(__dirname);

  it("src/features/habits/* uses no Tailwind palette literals", () => {
    const files = readdirSync(featureDir).filter(
      (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(join(featureDir, file), "utf8");
      expect(source).not.toMatch(RAW_PALETTE);
    }
  });
});
