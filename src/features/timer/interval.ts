/**
 * What the sit's optional mid-sit bell is set to.
 *
 * Two kinds, and the distinction is the whole point (#1189). `every` is an
 * ABSOLUTE spacing - a bell every five minutes, whatever the sit's length.
 * `half` is RELATIVE - one bell at the midpoint, which is a different number of
 * minutes for every sit length. TMI asks for the second ("optional silent
 * half-time bell ... helps with the 'check in' practice",
 * `docs/modules/meditation-tmi.md:119`), and it cannot be expressed as a member
 * of a list of minute spacings: half of a 25-minute sit is 12.5 minutes, and
 * even if it were whole, storing it as a number would freeze it against a sit
 * length the user changes independently.
 */
export type BellChoice = { kind: "off" } | { kind: "every"; minutes: number } | { kind: "half" };

/** The bell row's options, in the order they are drawn. */
export const BELL_CHOICES: readonly BellChoice[] = [
  { kind: "off" },
  { kind: "half" },
  { kind: "every", minutes: 5 },
  { kind: "every", minutes: 10 },
  { kind: "every", minutes: 15 },
];

/**
 * The choice's stable string key. It doubles as the sitting screen's route
 * param, so there is one spelling of each choice rather than two that can drift
 * ("off" / "half" / "5"). Older links carrying a bare minute count still parse,
 * because that is exactly what an `every` key looks like.
 */
export function bellChoiceKey(choice: BellChoice): string {
  switch (choice.kind) {
    case "off":
      return "off";
    case "half":
      return "half";
    case "every":
      return String(choice.minutes);
  }
}

/** The choice a key names, or `off` for anything unrecognised. */
export function bellChoiceFromKey(raw: string | undefined): BellChoice {
  if (raw === "half") return { kind: "half" };
  const minutes = Number(raw);
  // `0` is the legacy spelling of off, and a fractional or negative count is
  // not a spacing - both land on off rather than on a bell nobody asked for.
  if (!Number.isInteger(minutes) || minutes <= 0) return { kind: "off" };
  return { kind: "every", minutes };
}

/**
 * The choice these two stored preference columns describe.
 *
 * Two columns rather than one because `meditation_interval_bell_minutes` means
 * what its name says - a spacing in minutes - and half-time is not one. The
 * boolean wins when both are set, and every writer goes through
 * `bellChoicePatch`, so the pair cannot drift apart in practice.
 */
export function bellChoiceFromStored(minutes: number, atHalf: boolean): BellChoice {
  if (atHalf) return { kind: "half" };
  return minutes > 0 ? { kind: "every", minutes } : { kind: "off" };
}

/** The preference patch that stores a choice. The only writer of the pair. */
export function bellChoicePatch(choice: BellChoice): {
  meditationIntervalBellMinutes: number;
  meditationBellAtHalf: boolean;
} {
  return {
    meditationIntervalBellMinutes: choice.kind === "every" ? choice.minutes : 0,
    meditationBellAtHalf: choice.kind === "half",
  };
}

/**
 * The bell spacing this choice works out to for a sit of `totalSeconds`, or 0
 * when no bell should ring.
 *
 * Half-time resolves here rather than at the picker, because it is only a
 * number once the sit's length is known. A spacing at or past the whole length
 * would never ring, so it is treated as off - which `half` can never trip, it
 * being half of the length by construction.
 */
export function bellSecondsFor(choice: BellChoice, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  switch (choice.kind) {
    case "off":
      return 0;
    case "half":
      return totalSeconds / 2;
    case "every": {
      const seconds = choice.minutes * 60;
      return seconds >= totalSeconds ? 0 : seconds;
    }
  }
}
