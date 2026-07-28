import { readFileSync } from "node:fs";
import { join } from "node:path";

import { HUE_NAMES } from "@/src/lib/design-tokens";
import { sourceFiles, stripComments } from "@/test/source-scan";

// The call-site half of the accent-ink work (#368/#403). `test/theme-token-sync.test.ts`
// certifies that the *tokens* are legible; nothing certified that call sites
// actually reach for them. This suite closes that for `src/features/act/`.
//
// Two rules, and the second is the one this module exists to remember:
//
// 1. Small text in a hue must not sit on the raw `text-<hue>` accent - the
//    accent is tuned for fills, borders and icons, and fails AA as text
//    (act is 3.64:1 on `--background`). #406 swept 29 such sites here.
//
// 2. **The ACT module is not the act room.** `act`'s room is
//    `src/features/habits/` (see the header of test/chip-contrast.test.ts:
//    "Every habit screen wears the act room"). No file under
//    `src/features/act/`, and no route under `app/(app)/modules/act/`, calls
//    `useRoomStyle`. So `--accent-ink` is never poured here and resolves to
//    `--primary`: `text-accent-ink` in this module renders violet text on a
//    green screen. The correct off-room class is `text-act-ink`.
//
// Scoped to one directory on purpose. Most `text-<hue>` sites app-wide are
// room-less too, but the shared components in `src/components/app` render both
// inside and outside rooms, so neither class is right for all of their call
// sites. Widening this gate is a per-module judgement, not a regex change -
// add a directory here only once its sites have been classified.

const ROOT = join(__dirname, "..");

const MODULE_DIR = "src/features/act";

/**
 * A bare hue accent used as a color: `text-act`, but not `text-act-ink` and not
 * `text-accent-ink`. The trailing guard rejects any further word character or
 * hyphen, which is what keeps `text-act-ink` out - `\b` would not, since the
 * hyphen in `act-ink` is itself a word boundary.
 *
 * Runs against `stripComments` output, which keeps string literals (class names
 * live inside them) and blanks prose, so a class named in a comment is not a
 * finding.
 */
const BARE_HUE = new RegExp(String.raw`text-(${HUE_NAMES.join("|")})(?![\w-])`, "g");

/** Room ink, which this module must never use - see rule 2 above. */
const ROOM_INK = /text-accent-ink(?![\w-])/g;

/** Why a site is allowed to keep the raw accent. */
type Reason =
  /** Non-text glyph: WCAG 1.4.11 floor of 3:1, not 1.4.3's 4.5:1. */
  | "icon"
  /** Pure decoration under WCAG 1.4.3: conveys nothing, has no function. */
  | "decorative";

interface AllowedSite {
  file: string;
  /** The source line, whitespace-collapsed. See `normalize`. */
  snippet: string;
  reason: Reason;
  /** Measured contrast against the surface the site actually sits on. */
  evidence: string;
}

// Contrast figures are the raw `--act` accent against each site's real backdrop,
// computed with the helper math in test/chip-contrast.test.ts. Light is the
// binding scheme in every case; dark is quoted where it is the same surface.
//
//   `bg-card`             3.95 light / 7.79 dark
//   `bg-act/5` over page  3.45 light / 8.66 dark
//
// Both clear 1.4.11's 3:1. Neither clears 1.4.3's 4.5:1 - which is why every
// site below has to earn its exemption on grounds other than the number.
const ALLOWED: AllowedSite[] = [
  {
    file: `${MODULE_DIR}/act-choice-point-new-screen.tsx`,
    snippet: `className={inputValue.trim() ? "size-6 text-act" : "size-6 text-muted-foreground"}`,
    reason: "icon",
    evidence:
      "add-circle glyph on bg-card, 3.95:1. Enabled/disabled is not carried by " +
      "color alone - the wrapping Pressable takes `disabled={!inputValue.trim()}`.",
  },
  {
    file: `${MODULE_DIR}/act-committed-action-detail-screen.tsx`,
    snippet: `newStepText.trim() ? "text-act" : "text-muted-foreground",`,
    reason: "icon",
    evidence:
      "add-circle glyph (size-6) on bg-card, 3.95:1. Disabled state is on the " +
      "Pressable, not just the tint.",
  },
  {
    file: `${MODULE_DIR}/act-committed-action-detail-screen.tsx`,
    snippet: `step.isCompleted ? "text-act" : "text-muted-foreground",`,
    reason: "icon",
    evidence:
      "check-circle / radio-button-unchecked (size-5) on bg-card, 3.95:1. The " +
      "checked state is exposed via accessibilityRole='checkbox' + aria-checked, " +
      "and repeated visually as line-through + muted on the step label, so the " +
      "hue is not the only channel.",
  },
  {
    file: `${MODULE_DIR}/act-values-screen.tsx`,
    snippet: `className={cn("size-4", hasEntry ? "text-muted-foreground" : "text-act")}`,
    reason: "icon",
    evidence:
      "add / chevron-right (size-4) on bg-card, 3.95:1. The two states differ by " +
      "glyph, not only by color.",
  },
  {
    file: `${MODULE_DIR}/act-connection-new-screen.tsx`,
    snippet: `<Text className="w-2 text-act">·</Text>`,
    reason: "decorative",
    evidence:
      "Bullet marker for the notice-five sense list, on a bg-act/5 card: 3.45:1. " +
      "The only site here that is a real <Text> rather than an <Icon>, and the " +
      "only one whose exemption rests entirely on the decorative reading - it " +
      "carries no information (the sense name sits beside it) and has no " +
      "function. Unlike <Icon>, it is not aria-hidden, so assistive tech still " +
      "reaches it; see the note in the suite below.",
  },
];

/**
 * Collapses runs of whitespace so that re-indentation (a nesting change above
 * the site) does not trip the gate, while a change to the line's *content*
 * still does. That is deliberate: each `reason` is a per-site judgement about
 * what the line renders, so when the line changes the judgement should be
 * re-read rather than silently carried forward.
 */
const normalize = (line: string): string => line.trim().replace(/\s+/g, " ");

interface Finding {
  file: string;
  line: number;
  snippet: string;
}

function findings(pattern: RegExp): Finding[] {
  return sourceFiles(ROOT, { dirs: [MODULE_DIR] }).flatMap((file) => {
    const stripped = stripComments(readFileSync(join(ROOT, file), "utf8"));
    return stripped.split("\n").flatMap((line, index) => {
      pattern.lastIndex = 0;
      return pattern.test(line) ? [{ file, line: index + 1, snippet: normalize(line) }] : [];
    });
  });
}

/** `file::snippet`, the identity the allowlist is keyed on. */
const key = (site: { file: string; snippet: string }): string => `${site.file}::${site.snippet}`;

describe("src/features/act keeps the raw hue accent only where it is not text", () => {
  it("has exactly the classified set of bare text-<hue> sites", () => {
    const found = findings(BARE_HUE);

    // Sorted string arrays, so a failure prints the offending line rather than
    // "Set { ... } !== Set { ... }" with both elided.
    expect(found.map(key).sort()).toEqual(ALLOWED.map(key).sort());
  });

  it("never reaches for room ink, because this module is not a room", () => {
    // `text-accent-ink` resolves to `--primary` outside a room: violet text in a
    // green module. The off-room class is `text-act-ink`. This is the single
    // assertion most likely to catch a well-meaning future sweep.
    expect(findings(ROOM_INK)).toEqual([]);
  });

  it("has no useRoomStyle call to justify room ink", () => {
    // The premise of the assertion above, checked rather than trusted - if this
    // module ever does become a room, that test needs to be revisited, not
    // deleted.
    const roomed = sourceFiles(ROOT, { dirs: [MODULE_DIR] }).filter((file) =>
      /\buseRoomStyle\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect(roomed).toEqual([]);
  });
});
