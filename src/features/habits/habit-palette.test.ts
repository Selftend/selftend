import {
  HABIT_COLORS,
  HABIT_COLOR_CHOICES,
  RETIRED_HABIT_COLORS,
  nextHabitColor,
  toHabitColor,
} from "@/src/features/habits/schemas";
import { HABIT_COLOR_TINTS } from "@/src/features/habits/habit-color";
import { TINT_TRIPLES } from "@/src/lib/design-tokens";
import type { HabitColor } from "@/src/features/habits/types";

/**
 * The offered habit palette (#764, decided on #715).
 *
 * The shipped seven held two pairs a user could not tell apart, so the set was cut to six
 * on a measurement rather than a preference. These guards exist so a later "let's offer
 * more colours" change has to argue with the numbers instead of quietly reintroducing the
 * pairs.
 */
describe("the offered habit palette", () => {
  it("offers exactly six colours, in the decided order", () => {
    // Reading through the alias layer this is `act → clay → ink → aqua → be → iris`.
    expect(HABIT_COLOR_CHOICES).toEqual(["act", "rose", "ink", "aqua", "be", "violet"]);
  });

  it("never offers primary, amber or emerald, but still stores and renders them", () => {
    expect(RETIRED_HABIT_COLORS).toEqual(["primary", "amber", "emerald"]);

    for (const retired of RETIRED_HABIT_COLORS) {
      // Legal in storage...
      expect(toHabitColor(retired)).toBe(retired);
      // ...and still resolvable to a tint, so an existing habit keeps its identity.
      expect(HABIT_COLOR_TINTS[retired as HabitColor]).toBeDefined();
    }
  });

  /**
   * `--primary` is the one colour that moves with the theme (`global.css` calls the eight
   * hues "the pinned encoding palette"), so it cannot be a stable categorical member — a
   * user's habits would recolour when they changed theme.
   */
  it("excludes primary, because it is the only colour that moves with the theme", () => {
    expect(HABIT_COLOR_CHOICES).not.toContain("primary");
  });

  it("resolves every legal colour to a tint", () => {
    for (const color of HABIT_COLORS) {
      expect(HABIT_COLOR_TINTS[color]).toBeDefined();
    }
  });
});

/**
 * A categorical palette whose members are not distinguishable has stopped being
 * categorical. This is the measurement, not an eyeball check.
 */
describe("the offered colours are measurably distinct", () => {
  // sRGB -> linear -> XYZ (D65) -> CIELAB, then plain Euclidean distance = ΔE76.
  // The tokens are stored as HSL triple strings, e.g. "232 46% 54%".
  function labOf(triple: string) {
    const parts = triple.split(" ").map((v) => Number.parseFloat(v));
    // A mis-parse yields NaN, and `NaN < threshold` is false - which would make the
    // whole comparison below pass vacuously. Fail loudly instead.
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

  // The threshold #715 measured the old palette against. `act`/`mist` sat at 6.5 and
  // `primary`/`iris` at 4.5, which is what cut the set from seven to six.
  const MIN_DELTA_E = 6.5;

  it.each(["light", "dark"] as const)("has no pair under the threshold in %s", (scheme) => {
    const tooClose: string[] = [];

    for (let i = 0; i < HABIT_COLOR_CHOICES.length; i++) {
      for (let j = i + 1; j < HABIT_COLOR_CHOICES.length; j++) {
        const a = TINT_TRIPLES[HABIT_COLOR_TINTS[HABIT_COLOR_CHOICES[i] as HabitColor]][scheme];
        const b = TINT_TRIPLES[HABIT_COLOR_TINTS[HABIT_COLOR_CHOICES[j] as HabitColor]][scheme];
        const d = deltaE(a, b);
        if (d < MIN_DELTA_E) {
          tooClose.push(`${HABIT_COLOR_CHOICES[i]}/${HABIT_COLOR_CHOICES[j]} = ${d.toFixed(1)}`);
        }
      }
    }

    expect(tooClose).toEqual([]);
  });
});

describe("nextHabitColor", () => {
  it("gives a first habit the head of the list", () => {
    expect(nextHabitColor([])).toBe("act");
  });

  it("skips colours already in use", () => {
    expect(nextHabitColor(["act", "rose"])).toBe("ink");
  });

  it("ignores retired colours when deciding what is taken", () => {
    // A user whose only habit is an old `primary` one still gets the head of the list.
    expect(nextHabitColor(["primary", "amber"])).toBe("act");
  });

  it("wraps to the head once every colour is in use - six colours is a palette, not a quota", () => {
    expect(nextHabitColor([...HABIT_COLOR_CHOICES])).toBe("act");
  });
});
