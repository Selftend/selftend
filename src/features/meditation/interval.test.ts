import {
  BELL_CHOICES,
  type BellChoice,
  bellChoiceFromKey,
  bellChoiceFromStored,
  bellChoiceKey,
  bellChoicePatch,
  bellSecondsFor,
} from "@/src/features/meditation/interval";

const MIN = 60;

describe("bell choice keys", () => {
  it("round-trips every option the row draws", () => {
    for (const choice of BELL_CHOICES) {
      expect(bellChoiceFromKey(bellChoiceKey(choice))).toEqual(choice);
    }
  });

  it("still reads the bare minute count older links carry", () => {
    // The sitting screen took `bell=5` as a route param before #1189; a link
    // someone saved must not silently become a bell that never rings.
    expect(bellChoiceFromKey("5")).toEqual({ kind: "every", minutes: 5 });
    expect(bellChoiceFromKey("0")).toEqual({ kind: "off" });
  });

  it("lands on off for anything it cannot read", () => {
    // A bell nobody asked for is worse than no bell, so garbage falls to off
    // rather than to a default spacing.
    for (const raw of [undefined, "", "abc", "12.5", "-3", "NaN"]) {
      expect(bellChoiceFromKey(raw)).toEqual({ kind: "off" });
    }
  });
});

describe("stored preference pair", () => {
  it("reads the two columns as one choice", () => {
    expect(bellChoiceFromStored(0, false)).toEqual({ kind: "off" });
    expect(bellChoiceFromStored(5, false)).toEqual({ kind: "every", minutes: 5 });
    expect(bellChoiceFromStored(0, true)).toEqual({ kind: "half" });
  });

  it("lets the half-time flag win if the pair ever drifts", () => {
    // Both writers go through bellChoicePatch, so this should not arise - but a
    // stale row from a half-written update must resolve to something, not to
    // whichever field is read first.
    expect(bellChoiceFromStored(5, true)).toEqual({ kind: "half" });
  });

  it("writes both columns for every choice, so neither goes stale", () => {
    expect(bellChoicePatch({ kind: "off" })).toEqual({
      meditationIntervalBellMinutes: 0,
      meditationBellAtHalf: false,
    });
    expect(bellChoicePatch({ kind: "every", minutes: 10 })).toEqual({
      meditationIntervalBellMinutes: 10,
      meditationBellAtHalf: false,
    });
    // The one that matters: picking half must CLEAR the minutes, or the old
    // spacing keeps ringing alongside the midpoint chime.
    expect(bellChoicePatch({ kind: "half" })).toEqual({
      meditationIntervalBellMinutes: 0,
      meditationBellAtHalf: true,
    });
  });

  it("survives a round trip through storage for every option", () => {
    for (const choice of BELL_CHOICES) {
      const patch = bellChoicePatch(choice);
      expect(
        bellChoiceFromStored(patch.meditationIntervalBellMinutes, patch.meditationBellAtHalf),
      ).toEqual(choice);
    }
  });
});

describe("bellSecondsFor", () => {
  it("rings nothing when the bell is off", () => {
    expect(bellSecondsFor({ kind: "off" }, 12 * MIN)).toBe(0);
  });

  it("spaces an absolute choice at its own minutes", () => {
    expect(bellSecondsFor({ kind: "every", minutes: 5 }, 12 * MIN)).toBe(5 * MIN);
  });

  it("treats a spacing at or past the sit's length as off", () => {
    // It would never ring: the end bell owns the final tick.
    expect(bellSecondsFor({ kind: "every", minutes: 12 }, 12 * MIN)).toBe(0);
    expect(bellSecondsFor({ kind: "every", minutes: 15 }, 12 * MIN)).toBe(0);
  });

  it("puts half-time at the midpoint, including one no minute list could hold", () => {
    expect(bellSecondsFor({ kind: "half" }, 12 * MIN)).toBe(6 * MIN);
    // 12.5 minutes - the case that made this a mode rather than a fifth entry
    // in [0, 5, 10, 15]. As seconds it is exact.
    expect(bellSecondsFor({ kind: "half" }, 25 * MIN)).toBe(750);
  });

  it("is RELATIVE: the same choice is a different spacing per sit", () => {
    // This is the whole reason half-time cannot be stored as a number of
    // minutes - the sit length is picked separately and changes freely.
    const half: BellChoice = { kind: "half" };
    expect(bellSecondsFor(half, 10 * MIN)).not.toBe(bellSecondsFor(half, 30 * MIN));
  });

  it("never leaves half-time stranded past the end of its own sit", () => {
    // The at-or-past-length rule can catch an absolute spacing; half is half by
    // construction, so it must ring for every length the picker can produce.
    for (let minutes = 1; minutes <= 120; minutes++) {
      const seconds = bellSecondsFor({ kind: "half" }, minutes * MIN);
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThan(minutes * MIN);
    }
  });

  it("rings nothing for a sit with no length", () => {
    expect(bellSecondsFor({ kind: "half" }, 0)).toBe(0);
    expect(bellSecondsFor({ kind: "every", minutes: 5 }, 0)).toBe(0);
  });
});
