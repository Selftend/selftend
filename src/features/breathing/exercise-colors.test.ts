import {
  BREATHING_EXERCISE_COLORS,
  BREATHING_EXERCISE_COLOR_CHOICES,
  nextUnusedBreathingColor,
  type BreathingExerciseColor,
} from "@/src/features/breathing/exercise-types";
import {
  BREATHING_COLOR_TINTS,
  breathingChipColors,
  breathingColorChoicesFor,
} from "@/src/features/breathing/exercise-colors";
import { HABIT_COLOR_TINTS } from "@/src/features/habits/habit-color";
import { HABIT_COLOR_CHOICES } from "@/src/features/habits/schemas";
import type { HabitColor } from "@/src/features/habits/types";
import { breathingPatterns } from "@/src/constants/breathing";
import { TINT_TRIPLES } from "@/src/lib/design-tokens";

/**
 * The offered breathing palette (#780, decided on #715).
 *
 * The design draws eight swatches. #715 measured that exact set and cut it to six because
 * two pairs were indistinguishable as pale fills. These guards exist so a later "let's
 * offer more colours" change has to argue with the numbers rather than quietly
 * reintroducing the pairs.
 */
describe("the offered breathing palette", () => {
  it("offers exactly six colours, in the decided order", () => {
    expect(BREATHING_EXERCISE_COLOR_CHOICES).toEqual(["act", "clay", "ink", "aqua", "be", "iris"]);
  });

  it("resolves to the same six tints habits offers", () => {
    // Habits stores two of them under retired names (`rose`→clay, `violet`→iris), so the
    // two features only agree once both are read through their alias layers. If they ever
    // diverge, one tool's "clay" is another tool's something else.
    const breathing = BREATHING_EXERCISE_COLOR_CHOICES.map((c) => BREATHING_COLOR_TINTS[c]);
    const habits = HABIT_COLOR_CHOICES.map((c) => HABIT_COLOR_TINTS[c as HabitColor]);
    expect([...breathing].sort()).toEqual([...habits].sort());
  });

  it("never offers primary, because it is the only colour that moves with the theme", () => {
    // `global.css` gives the eight hues to "the pinned encoding palette" and `--primary`
    // to the theme contract, so a `primary` pattern would recolour on a theme change while
    // its neighbours did not.
    expect(BREATHING_EXERCISE_COLOR_CHOICES).not.toContain("primary");
  });

  it("keeps every offered colour legal in storage", () => {
    for (const choice of BREATHING_EXERCISE_COLOR_CHOICES) {
      expect(BREATHING_EXERCISE_COLORS).toContain(choice);
    }
  });

  it("resolves every legal stored colour to a tint, including the retired names", () => {
    // The four pre-token names must keep rendering: a stored value that no longer maps to
    // a tint would throw on the overview, taking the user's pattern with it.
    for (const color of BREATHING_EXERCISE_COLORS) {
      expect(BREATHING_COLOR_TINTS[color]).toBeDefined();
      expect(breathingChipColors(color, "light").ink).toMatch(/^hsl\(/);
      expect(breathingChipColors(color, "dark").ink).toMatch(/^hsl\(/);
    }
    for (const retired of ["amber", "emerald", "violet", "rose"] as BreathingExerciseColor[]) {
      expect(BREATHING_EXERCISE_COLORS).toContain(retired);
      expect(BREATHING_EXERCISE_COLOR_CHOICES).not.toContain(retired);
    }
  });

  it("gives every built-in pattern an offered colour, all distinct", () => {
    const colors = breathingPatterns.map((p) => p.color);
    expect(new Set(colors).size).toBe(colors.length);
    for (const color of colors) {
      expect(BREATHING_EXERCISE_COLOR_CHOICES).toContain(color);
    }
  });
});

describe("breathingColorChoicesFor", () => {
  it("shows the six when the pattern already wears one of them", () => {
    expect(breathingColorChoicesFor("aqua")).toEqual(BREATHING_EXERCISE_COLOR_CHOICES);
  });

  it("prepends a retired colour so editing cannot silently reassign it", () => {
    // A picker with nothing selected would write a different colour on the next save.
    const choices = breathingColorChoicesFor("rose");
    expect(choices[0]).toBe("rose");
    expect(choices).toHaveLength(7);
  });
});

describe("nextUnusedBreathingColor", () => {
  it("gives a first pattern the head of the list", () => {
    expect(nextUnusedBreathingColor([])).toBe("act");
  });

  it("skips colours already in use", () => {
    expect(nextUnusedBreathingColor([{ color: "act" }, { color: "clay" }])).toBe("ink");
  });

  it("ignores retired colours when deciding what is taken", () => {
    expect(nextUnusedBreathingColor([{ color: "rose" }, { color: "amber" }])).toBe("act");
  });

  it("falls back to the head when the list has not loaded", () => {
    // A duplicate colour is a cosmetic miss; blocking the form on a query is not.
    expect(nextUnusedBreathingColor(undefined)).toBe("act");
  });

  it("wraps once every colour is in use - six colours is a palette, not a quota", () => {
    const all = BREATHING_EXERCISE_COLOR_CHOICES.map((color) => ({ color }));
    expect(nextUnusedBreathingColor(all)).toBe("act");
  });
});

/**
 * A categorical palette whose members are not distinguishable has stopped being
 * categorical. This is the measurement, not an eyeball check - the same method and the
 * same floor habits' guard uses, so the two palettes cannot drift apart.
 */
describe("the offered colours are measurably distinct", () => {
  // sRGB -> linear -> XYZ (D65) -> CIELAB, then plain Euclidean distance = ΔE76.
  function labOf(triple: string) {
    const parts = triple.split(" ").map((v) => Number.parseFloat(v));
    // A mis-parse yields NaN, and `NaN < threshold` is false - which would make the whole
    // comparison below pass vacuously. Fail loudly instead.
    if (parts.some((v) => Number.isNaN(v))) throw new Error(`unparseable triple: ${triple}`);
    const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const seg = Math.floor(h / 60) % 6;
    const rgb = [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ][seg].map((v) => v + m);

    const lin = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const [R, G, B] = lin;
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
    const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }

  function deltaE(a: string, b: string) {
    const [l1, a1, b1] = labOf(a);
    const [l2, a2, b2] = labOf(b);
    return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
  }

  // The threshold #715 measured the old palette against: `act`/`mist` sat at 6.5 and
  // `primary`/`iris` at 4.5, which is what cut the set from eight to six.
  const MIN_DELTA_E = 6.5;

  it.each(["light", "dark"] as const)("has no pair under the threshold in %s", (scheme) => {
    const tooClose: string[] = [];

    for (let i = 0; i < BREATHING_EXERCISE_COLOR_CHOICES.length; i++) {
      for (let j = i + 1; j < BREATHING_EXERCISE_COLOR_CHOICES.length; j++) {
        const a = TINT_TRIPLES[BREATHING_COLOR_TINTS[BREATHING_EXERCISE_COLOR_CHOICES[i]]][scheme];
        const b = TINT_TRIPLES[BREATHING_COLOR_TINTS[BREATHING_EXERCISE_COLOR_CHOICES[j]]][scheme];
        const d = deltaE(a, b);
        if (d < MIN_DELTA_E) {
          const pair = `${BREATHING_EXERCISE_COLOR_CHOICES[i]}/${BREATHING_EXERCISE_COLOR_CHOICES[j]}`;
          tooClose.push(`${pair} = ${d.toFixed(1)}`);
        }
      }
    }

    expect(tooClose).toEqual([]);
  });

  it("keeps the three built-in pattern hues apart too", () => {
    // They sit in one list on the overview, so they are read against each other exactly
    // as the user's own patterns are. This is what rules out the design's `mist`, which
    // measures under the floor against `aqua`.
    const tooClose: string[] = [];
    const colors = breathingPatterns.map((p) => p.color);
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const a = TINT_TRIPLES[BREATHING_COLOR_TINTS[colors[i]]].light;
        const b = TINT_TRIPLES[BREATHING_COLOR_TINTS[colors[j]]].light;
        const d = deltaE(a, b);
        if (d < MIN_DELTA_E) tooClose.push(`${colors[i]}/${colors[j]} = ${d.toFixed(1)}`);
      }
    }
    expect(tooClose).toEqual([]);
  });
});
