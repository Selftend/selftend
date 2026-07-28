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
// Widening this gate is a per-module judgement, not a regex change - a
// directory joins it only once its sites have been classified. `src/features/act`
// came first (#409); the fourteen-area module tail follows below (#412). What is
// deliberately still outside is the hub - `src/features/home`, `src/components/app`
// and the `app/` routes - where a shared component renders both inside and
// outside rooms, so neither class is right for all of its call sites. Until
// those are classified, test/accent-ink-coverage.test.ts holds their line by
// refusing to let them grow.

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
  | "decorative"
  /**
   * The hue clears 1.4.3's 4.5:1 *on the surface this site actually sits on*.
   * Usually that means one of `be`, `ink` or `aqua` on a plain surface; where
   * it is a tint instead, the evidence says so and quotes the number measured
   * through the whole stack. There is no such thing as a hue that passes on
   * its own - `be` reads 4.86 on the app background, 4.55 on a `bg-be/10` chip
   * over a room card, and 4.22 on the same chip over the app background.
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

function findings(pattern: RegExp, dirs: string[] = [MODULE_DIR]): Finding[] {
  return sourceFiles(ROOT, { dirs }).flatMap((file) => {
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

// ---------------------------------------------------------------------------
// The module tail (#412)
// ---------------------------------------------------------------------------
//
// The fourteen small feature areas left over once #403's sweeps had landed -
// mostly one to three sites each, so this is breadth rather than depth. Four of
// them (gratitude, grounding, habits, journal) hold nothing at all now and are
// listed anyway, so that a new site there has to be classified rather than
// merely counted.
//
// Three things came out of classifying them, and none was a contrast number:
//
// 1. **Nine sites were inert**, and inert in a way that read as endorsement.
//    Seven passed a raw accent to `ToolStats`' `accentClassName` under
//    `tone="onField"`, where the prop is ignored outright and every value
//    renders white on the hue field; two set a `badgeClass` on module tiles
//    whose `badgeKey` is null, so the pill never renders. Nothing was visibly
//    wrong, and `accentClassName="text-think"` sat there looking like evidence
//    that `think` is a usable text colour when it reads 1.88:1. All nine now
//    carry the ink token they would need the moment anyone flipped the switch -
//    a change with no rendering effect at all, which is the point.
//
// 2. **Two sites genuinely failed** and were swept rather than classified: a
//    12px milestone in `be` on `bg-be/5` over the iris room (4.41), and the
//    selected 14px row in the breathing sounds sheet in `aqua` on `bg-aqua/10`
//    (4.27). Both are the trap #412 names - a passing hue stops passing on a
//    tint of itself.
//
// 3. **`mood` was never four sites.** The fourth was a comment *about* accent
//    ink, surfaced by a template-literal mis-parse in test/source-scan.ts that
//    stopped a `//` being read as a comment. Fixed there, with the parsing
//    pinned down in test/source-scan.test.ts.
//
// Contrast figures below are the raw published accent against each site's real
// backdrop, computed with the helper math in test/chip-contrast.test.ts. Light
// is the binding scheme throughout; dark is never the constraint for these.
// Room surfaces are the re-poured `--background` / `--card` from
// src/lib/module-room.ts, which is why the same `bg-be/10` chip reads 4.55 in
// mood's own room and 4.22 on the neutral app background.

/** Every area of the tail, including the four that now hold no sites. */
const TAIL_DIRS = [
  "src/features/breathing",
  "src/features/cbt",
  "src/features/gratitude",
  "src/features/grounding",
  "src/features/habits",
  "src/features/journal",
  "src/features/meditation",
  "src/features/mindfulness",
  "src/features/modules",
  "src/features/mood",
  "src/features/security",
  "src/features/settings",
  "src/features/sleep",
  "src/features/tools",
];

/**
 * Tail areas where no file calls `useRoomStyle`, so `--accent-ink` is never
 * poured and `text-accent-ink` would resolve to `--primary` - violet text in a
 * module that is not violet. Same trap as rule 2 for the ACT module above; the
 * suite checks the premise rather than trusting it.
 */
const ROOMLESS_TAIL_DIRS = [
  "src/features/cbt",
  "src/features/mindfulness",
  "src/features/modules",
  "src/features/security",
  "src/features/settings",
  "src/features/tools",
];

const HUE_MAP = "src/features/mindfulness/exercise-hue.ts";
const SETTINGS = "src/features/settings/components";
const BREATHING = "src/features/breathing";

/**
 * The shared hue map's `text` member, which every entry below shares. It is the
 * *accent* member of a record that also carries `ink` - and `ink` is what the
 * two consumers use for actual text (meditation-practices-section renders its
 * step numerals in `hue.classes.ink`). `classes.text` itself reaches exactly
 * two call sites, both aria-hidden `<Icon>` glyphs paired with a text label:
 *
 *   HueIconBadge (grounding intro/session/done) - a 32-48px glyph on a 0.14
 *   tint of its own hue over the app background, in a container its own doc
 *   calls decorative.
 *
 *   meditation-practices-section - a 20px glyph on `bg-<hue>/15` over `bg-card`.
 *
 * Four of the eight land under 1.4.11's 3:1 on the badge (iris 2.95, clay 3.01,
 * mist 2.96, act 3.12). They stay because the glyph is decoration under 1.4.3:
 * `<Icon>` is `aria-hidden` + `accessibilityElementsHidden` by default, and
 * every one of the three badge sites repeats the glyph's meaning in adjacent
 * text (technique title, step counter, done heading). That is the exemption -
 * not the number.
 */
const HUE_MAP_ICON = "shared hue map, consumed only by aria-hidden <Icon> glyphs";

const ALLOWED_TAIL: AllowedSite[] = [
  // --- src/features/mindfulness: the shared hue map -------------------------
  {
    file: HUE_MAP,
    snippet: `text: "text-mist",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Reached by the breath-awareness practice: 3.15:1 on bg-mist/15 over bg-card.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-iris",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. The only hue reaching both consumers - body-scan practice (3.14:1 on bg-iris/15 over bg-card) and the 5-4-3-2-1 grounding technique (2.95:1 on the badge, decorative).`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-be",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Reached by the loving-kindness practice: 4.22:1 on bg-be/15 over bg-card.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-ink",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Reached by the observing-thoughts practice: 4.31:1 on bg-ink/15 over bg-card.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-act",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Unreachable today: act is neither a grounding technique hue (iris/aqua/clay) nor a practice hue (mist/iris/be/ink). Kept because the map is a total record over HUE_NAMES; it would read 3.12:1 on the badge.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-clay",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Reached by the body-scan grounding technique: 3.01:1 on the badge.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-think",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Unreachable today, and the one entry that must stay that way: think reads 1.72:1 on the badge and 1.84:1 on the chip, failing 1.4.11 outright. A new technique or practice in think would need the ink member, not this one.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-aqua",`,
    reason: "icon",
    evidence: `${HUE_MAP_ICON}. Reached by the cold-water grounding technique: 4.05:1 on the badge.`,
  },

  // --- src/features/settings: section-card badges ---------------------------
  {
    file: `${SETTINGS}/account-card.tsx`,
    snippet: `iconClassName="text-clay"`,
    reason: "icon",
    evidence:
      "20px glyph in a 36px badge, bg-[hsl(var(--clay)/0.10)] over the bg-card section: 3.39:1. " +
      "The badge wrapper is accessibilityElementsHidden and the section title sits beside it.",
  },
  {
    file: `${SETTINGS}/onboarding-card.tsx`,
    snippet: `iconClassName="text-iris"`,
    reason: "icon",
    evidence:
      "20px glyph on bg-[hsl(var(--iris)/0.10)] over bg-card: 3.32:1. Badge is a11y-hidden.",
  },
  {
    file: `${SETTINGS}/reminders-card.tsx`,
    snippet: `iconClassName="text-be"`,
    reason: "icon",
    evidence: "20px glyph on bg-[hsl(var(--be)/0.10)] over bg-card: 4.55:1. Badge is a11y-hidden.",
  },
  {
    file: `${SETTINGS}/security-section.tsx`,
    snippet: `iconClassName="text-iris"`,
    reason: "icon",
    evidence:
      "20px glyph on bg-[hsl(var(--iris)/0.10)] over bg-card: 3.32:1. Badge is a11y-hidden.",
  },
  {
    file: `${SETTINGS}/support-card.tsx`,
    snippet: `iconClassName="text-aqua"`,
    reason: "icon",
    evidence:
      "20px glyph on bg-[hsl(var(--aqua)/0.10)] over bg-card: 4.61:1. Badge is a11y-hidden.",
  },

  // --- src/features/breathing ----------------------------------------------
  {
    file: `${BREATHING}/breathing-exercise-editor-screen.tsx`,
    snippet: `<Text className="text-base text-aqua">▲</Text>`,
    reason: "passing-hue",
    evidence:
      "16px stepper glyph on the aqua room background - the screen is useRoomStyle('aqua'), so " +
      "its bg-background re-resolves to the room pour: 4.86:1, clearing 1.4.3 as text and not " +
      "relying on the non-text floor. The wrapping Pressable carries its own accessibilityLabel " +
      "('<phase> +'), so the glyph is not the accessible name.",
  },
  {
    file: `${BREATHING}/breathing-exercise-editor-screen.tsx`,
    snippet: `<Text className="text-base text-aqua">▼</Text>`,
    reason: "passing-hue",
    evidence: "Decrement twin of the site above: 4.86:1 on the aqua room background.",
  },
  {
    file: `${BREATHING}/sounds-sheet.tsx`,
    snippet: `{active ? <Icon name="check" className="size-4 text-aqua" /> : null}`,
    reason: "icon",
    evidence:
      "16px check glyph on bg-aqua/10 over the sheet's bg-background: 4.27:1, clearing 1.4.11. " +
      "Selection is carried by accessibilityRole='radio' + aria-checked and by the label's " +
      "font-semibold, so the tint is not the only channel. The label beside it is real text and " +
      "took the ink token instead (#412) - the same 4.27 that passes here fails 1.4.3 there.",
  },

  // --- src/features/mood ----------------------------------------------------
  {
    file: "src/features/mood/mood-week-hero.tsx",
    snippet: `className={cn("text-[11px] font-semibold", isToday && "text-be")}`,
    reason: "passing-hue",
    evidence:
      "11px weekday letter for today, on a bg-be/10 cell inside the hero card. WeekHero renders " +
      "only from mood-tracker-screen, which is useRoomStyle('be'), and its Card is variant='soft' " +
      "(the tint colours the shadow, not the fill) - so the backdrop is the be room's card: " +
      "4.55:1. The same chip over the neutral app background would be 4.22 and would fail.",
  },
  {
    file: "src/features/mood/mood-week-hero.tsx",
    snippet: `<Text className="text-[13px] text-be">`,
    reason: "passing-hue",
    evidence:
      "13px emotion chip label on bg-be/10 over the same be room card: 4.55:1. Measured through " +
      "the tint, not assumed from be's 4.86 on a plain surface.",
  },

  // --- src/features/tools: three tiles, one identical line ------------------
  {
    file: "src/features/tools/tools-screen.tsx",
    snippet: `iconColor: "text-be",`,
    reason: "icon",
    evidence:
      "Mood tile. 24px glyph on bg-be/15 inside a bg-card tile: 4.22:1. The tile's name and stat " +
      "are separate text; the hue only tints the glyph.",
  },
  {
    file: "src/features/tools/tools-screen.tsx",
    snippet: `iconColor: "text-be",`,
    reason: "icon",
    evidence: "Grounding tile. Same treatment and surface as the mood tile: 4.22:1.",
  },
  {
    file: "src/features/tools/tools-screen.tsx",
    snippet: `iconColor: "text-be",`,
    reason: "icon",
    evidence: "Sleep tile. Same treatment and surface as the mood tile: 4.22:1.",
  },

  // --- src/features/cbt: shared-tool pills ----------------------------------
  {
    file: "src/features/cbt/cbt-home/shared-tools-row.tsx",
    snippet: `act: "text-act",`,
    reason: "icon",
    evidence:
      "13px pill glyph on bg-card: 3.95:1. Decorative - the tool's name sits beside it. This map's " +
      "third entry already takes the ink token because think reads 2.03:1 here.",
  },
  {
    file: "src/features/cbt/cbt-home/shared-tools-row.tsx",
    snippet: `be: "text-be",`,
    reason: "icon",
    evidence: "13px pill glyph on bg-card: 5.26:1, which would clear 1.4.3 too.",
  },

  // --- src/features/security: the lock gate ---------------------------------
  {
    file: "src/features/security/app-lock-gate.tsx",
    snippet: `<Icon name="lock" size={36} className="text-iris" />`,
    reason: "icon",
    evidence:
      "Privacy cover shown when the app leaves the foreground. 36px glyph on " +
      "bg-[hsl(var(--iris)/0.12)] over bg-background: 3.01:1. The whole cover is " +
      "accessibilityElementsHidden, so the glyph carries nothing to assistive tech.",
  },
  {
    file: "src/features/security/app-lock-gate.tsx",
    snippet: `<Icon name="lock" size={36} className="text-iris" />`,
    reason: "icon",
    evidence:
      "The locked screen itself, same glyph and surface: 3.01:1. Its badge wrapper is " +
      "accessibilityElementsHidden and lock.title/lock.description carry the meaning as text.",
  },

  // --- one-site areas -------------------------------------------------------
  {
    file: "src/features/meditation/meditation-home-screen.tsx",
    snippet: `<Icon name="chevron-right" size={20} className="text-iris" />`,
    reason: "icon",
    evidence:
      "20px affordance chevron on the iris room card - Card variant='soft' is a plain bg-card, " +
      "the tint only colours its shadow: 3.72:1. The row's label and its Pressable role carry the " +
      "meaning; the chevron repeats it.",
  },
  {
    file: "src/features/modules/dbt-module-screen.tsx",
    snippet: `<Icon name="anchor" className="size-7 text-be" />`,
    reason: "icon",
    evidence:
      "28px glyph on bg-be/15 inside a bg-be/5 card over the app background: 3.95:1. " +
      "dbt.statusTitle and dbt.statusBody sit beside it as text.",
  },
  {
    file: "src/features/sleep/star-rating.tsx",
    snippet: `className={filled ? "text-ink" : "text-muted-foreground"}`,
    reason: "icon",
    evidence:
      "32px star on the ink room background (sleep-log-screen is useRoomStyle('ink')): 4.71:1. " +
      "Filled and empty differ by glyph - star vs star-outline - and each Pressable carries " +
      "accessibilityRole='radio' with aria-checked, so the fill colour is not the only channel.",
  },
];

/**
 * Every `accentClassName` literal in the app. `ToolStats` renders it at 13px
 * and 11px, so it must be an ink token: `text-accent-ink` inside a room of that
 * hue, `text-<hue>-ink` anywhere else. The prop's own doc says so, and seven
 * call sites disagreed with it in silence because `tone="onField"` ignores the
 * value entirely (#412).
 */
const ACCENT_PROP = /accentClassName=\{?"([^"]*)"/g;
const INK_TOKEN = new RegExp(String.raw`^text-(accent|${HUE_NAMES.join("|")})-ink$`);

describe("the module tail keeps the raw hue accent only where it is justified (#412)", () => {
  it("has exactly the classified set of bare text-<hue> sites", () => {
    const found = findings(BARE_HUE, TAIL_DIRS);

    expect(found.map(key).sort()).toEqual(ALLOWED_TAIL.map(key).sort());
  });

  it("gives every classified site a measured contrast figure", () => {
    // A reason without a number is the thing #412 exists to stop: "judged safe
    // by whoever swept the area" with the reasoning left unwritten.
    const unevidenced = ALLOWED_TAIL.filter((site) => !/\d\.\d{2}:1/.test(site.evidence)).map(key);

    expect(unevidenced).toEqual([]);
  });

  it("never reaches for room ink in the areas that are not rooms", () => {
    expect(findings(ROOM_INK, ROOMLESS_TAIL_DIRS)).toEqual([]);
  });

  it("has no useRoomStyle call in those areas to justify room ink", () => {
    // The premise of the assertion above. If one of these areas becomes a room,
    // revisit that test rather than deleting it.
    const roomed = sourceFiles(ROOT, { dirs: ROOMLESS_TAIL_DIRS }).filter((file) =>
      /\buseRoomStyle\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );

    expect(roomed).toEqual([]);
  });

  it("passes only ink tokens to ToolStats' accentClassName, app-wide", () => {
    const wrong = sourceFiles(ROOT, { dirs: ["app", "src"] }).flatMap((file) => {
      const stripped = stripComments(readFileSync(join(ROOT, file), "utf8"));
      return [...stripped.matchAll(ACCENT_PROP)]
        .map((match) => match[1])
        .filter((value) => !INK_TOKEN.test(value))
        .map((value) => `${file}: ${value}`);
    });

    expect(wrong).toEqual([]);
  });
});
