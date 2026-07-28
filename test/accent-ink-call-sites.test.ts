import { readFileSync } from "node:fs";
import { join } from "node:path";

import { HUE_NAMES } from "@/src/lib/design-tokens";
import { sourceFiles, stripComments } from "@/test/source-scan";

// The call-site half of the accent-ink work (#368/#403/#412).
// `test/theme-token-sync.test.ts` certifies that the *tokens* are legible;
// nothing certified that call sites actually reach for them. This suite closes
// that, area by area, for the areas listed in MODULE_DIRS.
//
// Two rules, and the second is the one this module exists to remember:
//
// 1. Small text in a hue must not sit on the raw `text-<hue>` accent - the
//    accent is tuned for fills, borders and icons, and fails AA as text
//    (act is 3.64:1 on `--background`). #406 swept 29 such sites in act.
//
// 2. **Neither area here is a room.** `act`'s room is `src/features/habits/`
//    (see the header of test/chip-contrast.test.ts: "Every habit screen wears
//    the act room"), and the home hub is not a room at all - it shows every
//    module's hue side by side, so there is no single hue to pour. No file
//    under `src/features/act/` or `src/features/home/` calls `useRoomStyle`.
//    So `--accent-ink` is never poured here and resolves to `--primary`:
//    `text-accent-ink` in either area renders violet text on a green card. The
//    correct off-room class is `text-<hue>-ink`.
//
// Scoped to named directories on purpose. Most `text-<hue>` sites app-wide are
// room-less too, but the shared components in `src/components/app` render both
// inside and outside rooms, so neither class is right for all of their call
// sites. Widening this gate is a per-module judgement, not a regex change -
// add a directory here only once its sites have been classified, and delete
// that area's row from test/accent-ink-coverage.test.ts in the same change.

const ROOT = join(__dirname, "..");

const ACT_DIR = "src/features/act";
const HOME_DIR = "src/features/home";

/** Areas whose surviving `text-<hue>` sites are fully enumerated below. */
const MODULE_DIRS = [ACT_DIR, HOME_DIR];

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

/** Room ink, which these modules must never use - see rule 2 above. */
const ROOM_INK = /text-accent-ink(?![\w-])/g;

/**
 * Why a site is allowed to keep the raw accent. These four are the whole
 * vocabulary; a site that fits none of them is not classified, it is swept to
 * `text-<hue>-ink`.
 */
type Reason =
  /**
   * Non-text glyph carrying information: WCAG 1.4.11's floor of 3:1, not
   * 1.4.3's 4.5:1, *and* colour must not be the only channel the information
   * travels on.
   */
  | "icon"
  /**
   * Pure decoration under WCAG 1.4.3 and outside 1.4.11 entirely: conveys
   * nothing, has no function, and so has no floor to clear. The strongest
   * claim of the four and the easiest to make dishonestly - it has to be true
   * that a user who never sees the mark loses nothing.
   */
  | "decorative"
  /** >=24px regular or >=18.66px bold, so 3:1 applies and this hue clears it. */
  | "large-text"
  /**
   * `be`, `ink` or `aqua` clearing 4.5:1 as small text - and only on a plain
   * surface. Every hue including these three fails on a `bg-<hue>/10` tint of
   * itself, so this is a claim about a surface, never about a hue.
   */
  | "passing-hue";

interface AllowedSite {
  file: string;
  /** The source line, whitespace-collapsed. See `normalize`. */
  snippet: string;
  reason: Reason;
  /** Measured contrast against the surface the site actually sits on. */
  evidence: string;
}

// ---------------------------------------------------------------------------
// src/features/act
//
// Contrast figures are the raw `--act` accent against each site's real backdrop,
// computed with the helper math in test/chip-contrast.test.ts. Light is the
// binding scheme in every case; dark is quoted where it is the same surface.
//
//   `bg-card`             3.95 light / 7.79 dark
//   `bg-act/5` over page  3.45 light / 8.66 dark
//
// Both clear 1.4.11's 3:1. Neither clears 1.4.3's 4.5:1 - which is why every
// site below has to earn its exemption on grounds other than the number.
// ---------------------------------------------------------------------------
const ACT_SITES: AllowedSite[] = [
  {
    file: `${ACT_DIR}/act-choice-point-new-screen.tsx`,
    snippet: `className={inputValue.trim() ? "size-6 text-act" : "size-6 text-muted-foreground"}`,
    reason: "icon",
    evidence:
      "add-circle glyph on bg-card, 3.95:1. Enabled/disabled is not carried by " +
      "color alone - the wrapping Pressable takes `disabled={!inputValue.trim()}`.",
  },
  {
    file: `${ACT_DIR}/act-committed-action-detail-screen.tsx`,
    snippet: `newStepText.trim() ? "text-act" : "text-muted-foreground",`,
    reason: "icon",
    evidence:
      "add-circle glyph (size-6) on bg-card, 3.95:1. Disabled state is on the " +
      "Pressable, not just the tint.",
  },
  {
    file: `${ACT_DIR}/act-committed-action-detail-screen.tsx`,
    snippet: `step.isCompleted ? "text-act" : "text-muted-foreground",`,
    reason: "icon",
    evidence:
      "check-circle / radio-button-unchecked (size-5) on bg-card, 3.95:1. The " +
      "checked state is exposed via accessibilityRole='checkbox' + aria-checked, " +
      "and repeated visually as line-through + muted on the step label, so the " +
      "hue is not the only channel.",
  },
  {
    file: `${ACT_DIR}/act-values-screen.tsx`,
    snippet: `className={cn("size-4", hasEntry ? "text-muted-foreground" : "text-act")}`,
    reason: "icon",
    evidence:
      "add / chevron-right (size-4) on bg-card, 3.95:1. The two states differ by " +
      "glyph, not only by color.",
  },
  {
    file: `${ACT_DIR}/act-connection-new-screen.tsx`,
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

// ---------------------------------------------------------------------------
// src/features/home (#412)
//
// All 27 survivors here were the same shape: an `<Icon>` glyph inside a
// `bg-<hue>/10` chip of its own hue. That surface is the trap #412 names -
// tinting a surface with a hue costs that hue's own contrast on it, so "be
// passes" is never a fact about `be`. Measured with the helper math in
// test/room-contrast.test.ts (`compositeOver` then `contrastRatio`); light mode
// binds everywhere, dark is 4.93:1 at worst.
//
//   accent on `bg-<hue>/10` over ...   worst      best
//   `--card` (widget cards, sidebar)   iris 3.32  ink 4.62
//   `--popover` (add-to-home popover)  iris 3.32  ink 4.62
//   `--background` (config screen)     iris 3.08  ink 4.28
//   `bg-primary/10` (selected row)     iris 2.72  ink 3.77
//   chip nested in chip (preview)      iris 2.79  ink 3.80
//
// Two sites did not survive the measurement and were swept rather than
// classified, so they are deliberately absent below:
//
//   tool-accent.ts  `gratitude` -> icon: "text-think-ink"   was 1.90:1
//   widget-tint.ts  `think`     -> icon: "text-think-ink"   was 1.90:1
//
// `text-accent-ink` was never an option for either: the home hub is not a room
// (asserted below), so it would have resolved to violet.
// ---------------------------------------------------------------------------

/**
 * The sidebar's per-tool accents. One consumer,
 * src/components/app/sidebar-nav.tsx, which paints the glyph `accent.icon` when
 * the row is active and `text-muted-foreground` when it is not - so unlike the
 * widget-tint map below, this tint *is* a state indicator and owes 1.4.11's
 * 3:1. It clears it on the only surface it reaches: `bg-<hue>/10` over the
 * sidebar's `bg-card`. Active is also carried by the chip fill, by the ink
 * label, and by `aria-current="page"`, so colour is not the sole channel.
 */
const SIDEBAR_ACCENT = (hue: string, ratio: string): Omit<AllowedSite, "snippet"> => ({
  file: `${HOME_DIR}/tool-accent.ts`,
  reason: "icon",
  evidence:
    `Sidebar nav glyph (size-6), ${hue} accent on bg-${hue}/10 over bg-card: ` +
    `${ratio}:1 light, above 1.4.11's 3:1. Active state is duplicated by the ` +
    `chip fill, the ink label and aria-current="page", so the tint is not the ` +
    `only channel. This is the map's sole consumer - a second one on a darker ` +
    `surface would have to be re-measured.`,
});

/**
 * The widget tints. Seven consumers, and not one of them lets this tint carry
 * state or information: every site is a module identity glyph sitting beside
 * that module's own name in text, and `<Icon>` is `aria-hidden` by default
 * (src/components/react-native-reusables/icon.tsx), so assistive tech never
 * reaches it either. That puts these outside 1.4.11, which exempts graphics
 * that are decorative rather than "required to understand the content".
 *
 * They are classified `decorative` and not `icon` on purpose, because on two of
 * the seven consumers the number does *not* clear 3:1 - the config screen's
 * selected row stacks the chip on `bg-primary/10`, and the add-widget preview
 * block nests a chip inside a chip. Calling these `icon` would assert a floor
 * they do not meet.
 *
 * **The row is invalidated by any consumer that makes this tint mean
 * something.** That is the change this comment exists to catch.
 */
const WIDGET_TINT = (hue: string, best: string, worst: string): Omit<AllowedSite, "snippet"> => ({
  file: `${HOME_DIR}/widget-tint.ts`,
  reason: "decorative",
  evidence:
    `Module identity glyph in a bg-${hue}/10 chip, always beside that module's ` +
    `name in text, and aria-hidden - a user who never sees it loses nothing. ` +
    `${hue} accent on its own /10 chip measures ${best}:1 over bg-card and ` +
    `${worst}:1 at worst (the config screen's selected row, chip over ` +
    `bg-primary/10). The low end is below 1.4.11's 3:1, which is why this is ` +
    `decorative rather than icon: it is exempt, not passing.`,
});

/**
 * A widget card's own header glyph. One surface each - the chip over the
 * `Card`'s `bg-card` - and every one of them clears 3:1 there, so these take
 * the stronger `icon` reading rather than leaning on decoration.
 */
const WIDGET_HEADER = (
  widget: string,
  hue: string,
  ratio: string,
  glyph: string,
): Omit<AllowedSite, "snippet"> => ({
  file: `${HOME_DIR}/widgets/${widget}.tsx`,
  reason: "icon",
  evidence:
    `${glyph} glyph (size-5) in a bg-${hue}/10 chip over bg-card: ${ratio}:1 ` +
    `light, clear of 1.4.11's 3:1 (dark is higher). Static branding beside the ` +
    `widget title - it encodes no state, and the title names the module, so ` +
    `colour carries nothing on its own.`,
});

const HOME_SITES: AllowedSite[] = [
  // --- tool-accent.ts: the sidebar's per-tool accents -----------------------
  {
    ...SIDEBAR_ACCENT("act", "3.52"),
    snippet: `"module-act": { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("be", "4.55"),
    snippet: `mood: { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("be", "4.55"),
    snippet: `"self-care": { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("act", "3.52"),
    snippet: `habits: { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("aqua", "4.61"),
    snippet: `breathing: { chip: "bg-aqua/10", icon: "text-aqua", ink: "text-aqua-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("iris", "3.32"),
    snippet: `meditation: { chip: "bg-iris/10", icon: "text-iris", ink: "text-iris-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("ink", "4.62"),
    snippet: `journal: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("ink", "4.62"),
    snippet: `sleep: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },`,
  },
  {
    ...SIDEBAR_ACCENT("clay", "3.39"),
    snippet: `grounding: { chip: "bg-clay/10", icon: "text-clay", ink: "text-clay-ink" },`,
  },

  // --- widget-tint.ts: the widget identity tints ----------------------------
  {
    ...WIDGET_TINT("act", "3.52", "2.87"),
    snippet: `act: { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },`,
  },
  {
    ...WIDGET_TINT("be", "4.55", "3.71"),
    snippet: `be: { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },`,
  },
  {
    ...WIDGET_TINT("aqua", "4.61", "3.76"),
    snippet: `aqua: { chip: "bg-aqua/10", icon: "text-aqua", ink: "text-aqua-ink" },`,
  },
  {
    ...WIDGET_TINT("mist", "3.33", "2.72"),
    snippet: `mist: { chip: "bg-mist/10", icon: "text-mist", ink: "text-mist-ink" },`,
  },
  {
    ...WIDGET_TINT("iris", "3.32", "2.72"),
    snippet: `iris: { chip: "bg-iris/10", icon: "text-iris", ink: "text-iris-ink" },`,
  },
  {
    ...WIDGET_TINT("ink", "4.62", "3.77"),
    snippet: `ink: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },`,
  },
  {
    ...WIDGET_TINT("clay", "3.39", "2.77"),
    snippet: `clay: { chip: "bg-clay/10", icon: "text-clay", ink: "text-clay-ink" },`,
  },

  // --- widgets/: one header glyph each --------------------------------------
  {
    ...WIDGET_HEADER("breathing-widget", "aqua", "4.61", "air"),
    snippet: `<Icon name="air" className="size-5 text-aqua" />`,
  },
  {
    ...WIDGET_HEADER("grounding-log-widget", "clay", "3.39", "history"),
    snippet: `accentTextClass="text-clay"`,
    evidence:
      "history glyph (size-5) in a bg-clay/10 chip over bg-card: 3.39:1 light, " +
      "clear of 1.4.11's 3:1. The prop is named accentTextClass but its one use " +
      "in session-log-widget.tsx is `<Icon className={`size-5 ${accentTextClass}`} />` " +
      "- a glyph, not text. If it ever reaches a <Text>, 4.5:1 applies and clay " +
      "misses it; the accompanying accentBgClass keeps the two in step.",
  },
  {
    ...WIDGET_HEADER("habits-widget", "act", "3.52", "directions-run"),
    snippet: `<Icon name="directions-run" className="size-5 text-act" />`,
  },
  {
    ...WIDGET_HEADER("journal-week-widget", "ink", "4.62", "edit-note"),
    snippet: `<Icon name="edit-note" className="size-5 text-ink" />`,
  },
  {
    ...WIDGET_HEADER("meditation-widget", "iris", "3.32", "self-improvement"),
    snippet: `<Icon name="self-improvement" className="size-5 text-iris" />`,
  },
  {
    ...WIDGET_HEADER("mood-checkin-widget", "be", "4.55", "mood"),
    snippet: `<Icon name="mood" className="size-5 text-be" />`,
  },
  {
    ...WIDGET_HEADER("mood-trend-widget", "be", "4.55", "show-chart"),
    snippet: `<Icon name="show-chart" className="size-5 text-be" />`,
  },
  {
    ...WIDGET_HEADER("routines-widget", "iris", "3.32", "repeat"),
    snippet: `<Icon name="repeat" className="size-5 text-iris" />`,
  },
  {
    ...WIDGET_HEADER("sleep-widget", "ink", "4.62", "bedtime"),
    snippet: `<Icon name="bedtime" className="size-5 text-ink" />`,
  },
];

const ALLOWED: AllowedSite[] = [...ACT_SITES, ...HOME_SITES];

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
  return sourceFiles(ROOT, { dirs: MODULE_DIRS }).flatMap((file) => {
    const stripped = stripComments(readFileSync(join(ROOT, file), "utf8"));
    return stripped.split("\n").flatMap((line, index) => {
      pattern.lastIndex = 0;
      return pattern.test(line) ? [{ file, line: index + 1, snippet: normalize(line) }] : [];
    });
  });
}

/** `file::snippet`, the identity the allowlist is keyed on. */
const key = (site: { file: string; snippet: string }): string => `${site.file}::${site.snippet}`;

describe("act and home keep the raw hue accent only where it is not text", () => {
  it("has exactly the classified set of bare text-<hue> sites", () => {
    const found = findings(BARE_HUE);

    // Sorted string arrays, so a failure prints the offending line rather than
    // "Set { ... } !== Set { ... }" with both elided.
    expect(found.map(key).sort()).toEqual(ALLOWED.map(key).sort());
  });

  it("gives every allowed site a reason and measured evidence", () => {
    // The allowlist is only worth what its justifications are worth: an entry
    // added with an empty reason would otherwise pass the set comparison above
    // and quietly widen the gate. Evidence has to cite a ratio, which is the
    // one part a copy-paste of a neighbouring entry tends to drop.
    const unjustified = ALLOWED.filter(
      (site) => site.evidence.trim().length < 40 || !/\d\.\d\d:1/.test(site.evidence),
    ).map(key);

    expect(unjustified).toEqual([]);
  });

  it("never reaches for room ink, because neither module is a room", () => {
    // `text-accent-ink` resolves to `--primary` outside a room: violet text in a
    // green module. The off-room class is `text-<hue>-ink`. This is the single
    // assertion most likely to catch a well-meaning future sweep.
    expect(findings(ROOM_INK)).toEqual([]);
  });

  it("has no useRoomStyle call to justify room ink", () => {
    // The premise of the assertion above, checked rather than trusted - if
    // either module ever does become a room, that test needs to be revisited,
    // not deleted.
    const roomed = sourceFiles(ROOT, { dirs: MODULE_DIRS }).filter((file) =>
      /\buseRoomStyle\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect(roomed).toEqual([]);
  });
});
