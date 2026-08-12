import { readFileSync } from "node:fs";
import { join } from "node:path";

import { groundingTechniques } from "@/src/constants/grounding";
import { exerciseHue, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { MEDITATION_PRACTICES } from "@/src/features/meditation/practices";
import { HUE_NAMES } from "@/src/lib/design-tokens";
import { sourceFiles, stripComments } from "@/test/source-scan";

// The call-site half of the accent-ink work (#368/#403/#412).
// `test/theme-token-sync.test.ts` certifies that the *tokens* are legible;
// nothing certified that call sites actually reach for them. This suite closes
// that, area by area, for the areas listed in CLASSIFIED_AREAS below.
//
// Two rules, and the second is the one this module exists to remember:
//
// 1. Small text in a hue must not sit on the raw `text-<hue>` accent - the
//    accent is tuned for fills, borders and icons, and fails AA as text
//    (act is 3.64:1 on `--background`). #406 swept 29 such sites in act alone.
//
// 2. **Whether an area is a room decides which ink is even legal**, and the
//    areas here answer that differently:
//
//    - `src/features/act` and `src/features/home` are not rooms - with one
//      file-level exception since Wave C (#493): `act-home-screen.tsx` wears
//      the act room. Beyond that screen, `act`'s room is `src/features/habits/`
//      (see the header of test/chip-contrast.test.ts: "Every habit screen wears
//      the act room"), and the home hub is not a room at all - it shows every
//      module's hue side by side, so there is no single hue to pour. No *other*
//      file under either calls `useRoomStyle`, which the assertions below check
//      rather than trust. So outside ROOMED_HOMES `--accent-ink` is never
//      poured and resolves to `--primary`: `text-accent-ink` in either area
//      renders violet text on a green card, and the correct off-room class is
//      `text-<hue>-ink`.
//    - `src/components/app` renders both inside and outside rooms, so neither
//      class is right for all of its call sites - each one is judged on the
//      surface its actual callers give it.
//    - `app/` is mixed: the two breathing routes do call `useRoomStyle`, so
//      room ink is legitimate there and only there.
//    - The module tail contains real rooms - habits wears act, meditation wears
//      iris - so room ink is legitimate in those too.
//
//    That is why the room-ink assertions below are scoped to ROOMLESS_AREAS,
//    whose premise the suite checks rather than trusts, instead of being swept
//    across everything.
//
// Every surviving occurrence in a classified area is enumerated in ALLOWED with
// the surface it actually sits on and the contrast it measures there, keyed on
// the source line so that editing the line forces the judgement to be re-read.
//
// With the module tail classified (#412), every area is now enumerated here and
// test/accent-ink-coverage.test.ts - the counting ratchet that held the
// unclassified areas at their current size - is gone. Its one surviving
// guarantee moved here: `no bare accent survives outside a classified area`
// below, which is what stops a new `text-<hue>` appearing somewhere this file
// never looks (src/lib, src/components/ui, src/providers).

const ROOT = join(__dirname, "..");

/** Where the accent classes are defined; its shape is asserted, not swept. */
const TOKENS_FILE = "src/lib/design-tokens.ts";

const ACT_DIR = "src/features/act";
const HOME_DIR = "src/features/home";

/**
 * The areas whose survivors are fully enumerated below. `app` is the whole
 * route tree; the four do not overlap, so no file is scanned twice.
 */
const CLASSIFIED_AREAS = [ACT_DIR, HOME_DIR, "src/components/app", "app"] as const;

/**
 * The subset of those that contain no room at all, and so may never use
 * `text-accent-ink`. `src/components/app` and `app/` are deliberately absent:
 * the shared components render from inside rooms as well as outside, and the
 * two breathing routes under `app/` are rooms. See rule 2 above.
 */
const ROOMLESS_AREAS = [ACT_DIR, HOME_DIR] as const;

/**
 * The Wave-C exception (#493): the act module home became a room - it wears
 * the act room - so exactly that file may call `useRoomStyle` and use room
 * ink. Every *other* file in its directory stays off-room, which is why the
 * room-less assertions exclude this file instead of dropping the directory
 * wholesale: dropping the dir would stop the suite seeing a `text-accent-ink`
 * added to any of the twenty screens around it that still resolve it to
 * `--primary`. The cbt home briefly sat here too; #500 un-roomed it (its
 * field pours from primary and the default violet surfaces ARE its room).
 */
const ROOMED_HOMES = ["src/features/act/act-home-screen.tsx"] as const;

/**
 * A bare hue accent used as a color, in EITHER form the codebase writes it:
 *
 *   text-act                    the plain class
 *   text-[hsl(var(--act))]      the arbitrary-value class
 *
 * but not `text-act-ink` and not `text-accent-ink`. The trailing guard rejects
 * any further word character or hyphen, which is what keeps `text-act-ink` out -
 * `\b` would not, since the hyphen in `act-ink` is itself a word boundary.
 *
 * The second alternative is not decoration. `TINT_TEXT` used to hold the raw
 * accents in exactly that form, and because `text-` is followed by `[` rather
 * than a hue name, the original pattern never matched: ~78 sites - including the
 * signed-out landing page, where nine of ten labels measured below AA - were
 * absent from the census, absent from the allowlist, and unable to make the
 * ratchet grow, while every suite passed (#421). A gate that cannot see a whole
 * spelling of the thing it gates is not a gate.
 *
 * Runs against `stripComments` output, which keeps string literals (class names
 * live inside them) and blanks prose, so a class named in a comment is not a
 * finding.
 */
const HUE_ALT = HUE_NAMES.join("|");
const BARE_HUE = new RegExp(
  String.raw`text-(?:(${HUE_ALT})(?![\w-])|\[hsl\(var\(--(${HUE_ALT})\)\)\])`,
  "g",
);

/** Room ink, which the room-less areas must never use - see rule 2 above. */
const ROOM_INK = /text-accent-ink(?![\w-])/g;

/**
 * Why a site is allowed to keep the raw accent. These four are the whole
 * vocabulary; a site that fits none of them is not classified, it is swept to
 * `text-<hue>-ink`.
 *
 * There is deliberately no "it is never rendered" reason. A dead class is not
 * an accessibility argument, it is a bet that the code path stays dead - see
 * the note above COMPONENTS_APP_SITES for the one place that bet was taken and
 * then withdrawn.
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

// ---------------------------------------------------------------------------
// src/features/act (#403, #409)
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
// EMPTIED by #588.
//
// Thirteen classified sites lived here: the ACT screens' green glyphs and
// separators, the onboarding modals' hue icons, program-graduation's heading.
// Every one was decorative - a dot, a chevron, a check beside a label that
// already said the thing - which is what "the remaining decorative hue" means.
// The array stays so the area stays scanned: a hue returning to src/features/act
// has to be classified rather than merely counted.
const ACT_SITES: AllowedSite[] = [];

// ---------------------------------------------------------------------------
// src/components/app and app/ (#412)
//
// The hard area, and the reason it was classified last: these components take
// their hue as a prop (ToolStats, ProgramCard) or hard-code one (the onboarding
// modals), and render from several rooms *and* from the room-less hub. A site's
// correct class therefore depends on its call sites, not on the component. Each
// entry below names the callers it was traced to and quotes the worst surface
// any of them renders it on.
//
// Three findings did the work, and each is load-bearing for the numbers:
//
// 1. **The onboarding modals mount outside every room.** Each home screen
//    renders them as a *sibling* of the roomed SafeAreaView, not a child:
//
//      <>
//        <SleepOnboarding ... />                        <- here
//        <SafeAreaView style={roomStyle}> ... </SafeAreaView>
//      </>
//
//    (src/features/sleep/sleep-tracker-screen.tsx:72, and the same shape in
//    habits-home-screen.tsx:118, grounding-home-screen.tsx:56 and
//    mood-tracker-screen.tsx:156.) So no room pour is in scope, on any
//    platform, from any caller: the shell's own `bg-background` is the neutral
//    app surface, and `text-accent-ink` inside one of these modals would
//    resolve to `--primary` - violet - exactly as in the ACT module. The
//    hard-coded `text-be` is the platform-stable choice, and the suite below
//    pins that these files never reach for room ink.
//
//    Worth stating because the nesting could easily change: a Modal would *not*
//    have saved it either. nativewind inherits variables through a React
//    context provider on native (react-native-css-interop's
//    runtime/native/render-component.js wraps VariableContext.Provider), which
//    a <Modal> preserves, but on web `vars()` emits inline CSS custom
//    properties and react-native-web's Modal portals its children to
//    document.body (exports/Modal/ModalPortal.js), outside the room root. So a
//    modal nested inside a room would read the pour on native and the neutral
//    tokens on web. Two platforms, two colours - keep them mounted outside.
//
// 2. **ProgramCard and ProgramGraduation are always off-room.** Their only
//    callers are act-home-screen.tsx and the cbt-home tree, neither of which
//    calls useRoomStyle (nor does any layout above them; `app/` calls it only
//    in the two breathing routes). Their surfaces are the neutral
//    `--background` / `--card` and washes over them.
//
// 3. **ToolStats ignores `accentClassName` when `tone="onField"`** - that
//    branch paints white ink on the hue field and never reads the prop
//    (src/components/app/tool-stats.tsx:48-75). All eight ToolStats call sites
//    app-wide pass `tone="onField"`, so the prop is dead at every one of them.
//    A class change there is a silent no-op that looks like a fix. The site in
//    this area is classified `inert` on that basis, and the premise is asserted
//    below so the classification fails loudly if the branch ever starts
//    reading the prop.
//
// Figures are the raw accent against each site's real backdrop, same helper
// math as above; tints are composited in sRGB (`alpha*hue + (1-alpha)*base`),
// which reproduces the published `bg-act/5` 3.45 and `bg-card` 3.95 exactly.
// Light is the binding scheme everywhere below.
//
//   neutral `--background`  260 28% 96% light / 260 20% 9% dark
//   neutral `--card`        260 28% 99% light / 260 16% 16% dark
// The breathing route's `accentClassName` used to be classified here as an
// `inert` raw accent - dead because `tone="onField"` never reads the prop, and
// left alone on the grounds that "fixing" a dead string reads as a fix. The
// module-tail work (#412) took the opposite and better line: it swept all nine
// dead accents onto ink tokens and added the app-wide assertion below that
// every `accentClassName` literal *is* an ink token. That makes the value safe
// whether or not the prop is ever read, instead of safe only while it is not,
// so the exemption is gone rather than merely re-keyed.
// EMPTIED by #588, for the same reason as ACT_SITES above.
const COMPONENTS_APP_SITES: AllowedSite[] = [];

// ---------------------------------------------------------------------------
// src/features/home (#412, emptied by #587)
//
// This block held 27 classified sites and the three helpers that generated them
// - SIDEBAR_ACCENT, WIDGET_TINT, WIDGET_HEADER - all of the same shape: an
// `<Icon>` glyph inside a `bg-<hue>/10` chip of its own hue, in the sidebar, in
// tool-accent.ts, in widget-tint.ts and in the nine widget headers.
//
// Every one of them was module identity, and module identity is icon and label
// now (#558). tool-accent.ts is deleted, widget-tint.ts resolves every module
// tint to one neutral triple, and the widget headers take `bg-muted` /
// `text-muted-foreground`. There is nothing left in src/features/home for this
// gate to classify, which is why the array below is empty rather than removed:
// the directory stays in the scan, so a hue returning here has to be classified
// rather than merely counted.
//
// The measurements are kept here because they are the argument for the change,
// not merely a record of the old state. The accent on `bg-<hue>/10` was never
// uniform - it depended on what the chip itself sat on:
//
//   accent on `bg-<hue>/10` over ...   worst      best
//   `--card` (widget cards, sidebar)   iris 3.32  ink 4.62
//   `--popover` (add-to-home popover)  iris 3.32  ink 4.62
//   `--background` (config screen)     iris 3.08  ink 4.28
//   `bg-primary/10` (selected row)     iris 2.72  ink 3.77
//   chip nested in chip (preview)      iris 2.79  ink 3.80
//
// Two sites never survived the measurement at all and were swept rather than
// classified: tool-accent.ts's `gratitude` and widget-tint.ts's `think`, both
// 1.90:1, both moved to `text-think-ink`. Tinting a surface with a hue costs
// that hue its own contrast on it, so "be passes" was never a fact about `be` -
// and eight hues on eight washes of themselves is eight separate facts to keep
// true. The neutral pair is one.
// ---------------------------------------------------------------------------

const HOME_SITES: AllowedSite[] = [];

const ALLOWED: AllowedSite[] = [...ACT_SITES, ...HOME_SITES, ...COMPONENTS_APP_SITES];

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

function findingsIn(pattern: RegExp, files: readonly string[]): Finding[] {
  return files.flatMap((file) => {
    const stripped = stripComments(readFileSync(join(ROOT, file), "utf8"));
    return stripped.split("\n").flatMap((line, index) => {
      pattern.lastIndex = 0;
      return pattern.test(line) ? [{ file, line: index + 1, snippet: normalize(line) }] : [];
    });
  });
}

function findings(
  pattern: RegExp,
  dirs: readonly string[],
  exclude: readonly string[] = [],
): Finding[] {
  return findingsIn(pattern, sourceFiles(ROOT, { dirs: [...dirs], exclude: [...exclude] }));
}

/**
 * A measured contrast figure, in either notation this file uses: `3.95:1`, or
 * `3.45 light / 8.66 dark` where the scheme is named instead of the `:1`.
 *
 * Deliberately not a bare `\d\.\d\d`. The evidence strings are thick with WCAG
 * references - 1.4.11, 1.4.3 - and a looser pattern would let "clears 1.4.11's
 * 3:1" stand in for a measurement, which is exactly the copy-paste this test
 * exists to catch.
 */
const CITES_RATIO = /\d\.\d\d:1|\d\.\d\d (?:light|dark)/;

/** `file::snippet`, the identity the allowlist is keyed on. */
const key = (site: { file: string; snippet: string }): string => `${site.file}::${site.snippet}`;

describe("classified areas keep the raw hue accent only where it is evidenced", () => {
  it("has exactly the classified set of bare text-<hue> sites", () => {
    const found = findings(BARE_HUE, CLASSIFIED_AREAS);

    // Sorted string arrays, so a failure prints the offending line rather than
    // "Set { ... } !== Set { ... }" with both elided.
    expect(found.map(key).sort()).toEqual(ALLOWED.map(key).sort());
  });

  it("gives every allowed site a reason and measured evidence", () => {
    // The allowlist is only worth what its justifications are worth: an entry
    // added with an empty reason would otherwise pass the set comparison above
    // and quietly widen the gate. Evidence has to cite a ratio, which is the
    // one part a copy-paste of a neighbouring entry tends to drop.
    //
    // No exemptions. There was briefly one, for an `inert` reason that claimed
    // a site had no surface to measure; dropping that reason closed the only
    // way into this list without a number.
    const unjustified = ALLOWED.filter(
      (site) => site.evidence.trim().length < 40 || !CITES_RATIO.test(site.evidence),
    ).map(key);

    expect(unjustified).toEqual([]);
  });
});

describe("act and home are not rooms, apart from the act home itself", () => {
  it("never reaches for room ink outside the roomed home", () => {
    // `text-accent-ink` resolves to `--primary` outside a room: violet text in a
    // green module. The off-room class is `text-<hue>-ink`. This is the single
    // assertion most likely to catch a well-meaning future sweep.
    expect(findings(ROOM_INK, ROOMLESS_AREAS, ROOMED_HOMES)).toEqual([]);
  });

  it("has no useRoomStyle call outside the roomed home to justify room ink", () => {
    // The premise of the assertion above, checked rather than trusted - a new
    // room in either area needs a ROOMED_HOMES entry, not a deleted test.
    const roomed = sourceFiles(ROOT, {
      dirs: [...ROOMLESS_AREAS],
      exclude: [...ROOMED_HOMES],
    }).filter((file) =>
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
// mostly one to three sites each, so this is breadth rather than depth. Five of
// them (gratitude, grounding, habits, journal, tools) hold nothing at all now
// and are listed anyway, so that a new site there has to be classified rather
// than merely counted. `tools` emptied last, in #421, when the hub stopped
// carrying its own hue map and read src/features/home/tool-accent.ts instead.
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
 * Tail areas where no file calls `useRoomStyle`. (The cbt home briefly wore
 * the think room in Wave C; #500 un-roomed it, so cbt is fully room-less
 * again.) In these areas `--accent-ink` is never poured and
 * `text-accent-ink` would resolve to `--primary` - violet text in a module
 * that is not violet. Same trap as rule 2 for the ACT module above; the suite
 * checks the premise rather than trusting it.
 */
const ROOMLESS_TAIL_DIRS = [
  "src/features/cbt",
  "src/features/mindfulness",
  "src/features/modules",
  "src/features/security",
  "src/features/settings",
  "src/features/tools",
];

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

// EMPTIED by #588: the module tail's last bare accents - breathing's stepper
// arrows and sound checks, meditation's chevron, the settings cards' icons,
// sleep's filled star, the mood week strip's today marker - are all neutral now.
// Now fully empty, as of #774. The single survivor was sleep's filled star -
// `text-ink` on a 32px glyph, kept because an ordered 1-5 input is an encoding
// and not chrome. #774 replaced that instrument outright: five named options
// (`quality-scale.tsx`) where the words carry the order, so the control no
// longer encodes anything in a hue and reaches for the certified chip stops via
// `chipHsl("ink")` instead of a bare accent class. `quality-tint.ts` held the
// `sleep-quality-ramp` encoding for the display surfaces until those dropped
// the ramp too (#772/#773/#775) and #855 deleted the orphaned helper - sleep
// now encodes nothing in hue at all.
//
// An empty list is the goal state, not a gap: the assertion below still runs, so
// a new bare `text-<hue>` anywhere in the tail fails until it is justified here.
const ALLOWED_TAIL: AllowedSite[] = [];

/**
 * Every `accentClassName` literal in the app. `ToolStats` renders it at 13px
 * and 11px, so it must be an ink token. It used to be `text-accent-ink` inside a
 * room of that hue and `text-<hue>-ink` anywhere else; the prop's own doc said
 * so, and seven call sites disagreed with it in silence because `tone="onField"`
 * ignores the value entirely (#412).
 *
 * `accent` left the alternation with `--accent-ink` itself (#589). The hue inks
 * stay listed because the four keeps-hue surfaces may still legitimately reach
 * one, and `primary` joins them as the neutral form every former room-less site
 * now takes.
 */
const ACCENT_PROP = /accentClassName=\{?"([^"]*)"/g;
const INK_TOKEN = new RegExp(String.raw`^text-(primary|${HUE_NAMES.join("|")})-ink$`);

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
    // ROOMED_HOMES excludes nothing under these dirs today (the act home
    // lives outside the tail), but stays wired so a future roomed home in
    // the tail is a one-line entry, not a rediscovery of this scan.
    expect(findings(ROOM_INK, ROOMLESS_TAIL_DIRS, ROOMED_HOMES)).toEqual([]);
  });

  it("has no useRoomStyle call in those areas to justify room ink", () => {
    // The premise of the assertion above. A new room in one of these areas
    // needs a ROOMED_HOMES entry, not a deleted test.
    const roomed = sourceFiles(ROOT, {
      dirs: ROOMLESS_TAIL_DIRS,
      exclude: [...ROOMED_HOMES],
    }).filter((file) =>
      /\buseRoomStyle\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );

    expect(roomed).toEqual([]);
  });

  it("passes only ink tokens to any surviving accentClassName, app-wide", () => {
    // Vacuous since #733 deleted the prop's only consumer, and kept anyway: the
    // rule ("if a component takes a colour class for small text, it takes an ink
    // token") outlives ToolStats, and the assertion below is what stops this one
    // passing silently for the wrong reason.
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

describe("no bare accent survives outside a classified area", () => {
  // Inherited from test/accent-ink-coverage.test.ts, which this replaces. That
  // suite counted survivors per area and refused to let any area grow; once
  // every area was classified its budget emptied and the counting had nothing
  // left to say. This is the one guarantee that outlived it, and it is the
  // stronger half: the areas enumerated above are asserted exactly, and
  // everywhere else must hold none at all.
  //
  // Without it, `text-<hue>` could reappear somewhere neither gate looks -
  // src/lib, src/components/ui, src/providers, src/hooks - and both suites
  // would still be green.
  const CLASSIFIED = [...CLASSIFIED_AREAS, ...TAIL_DIRS];

  it("finds bare accents where it expects them, so the filter is not vacuous", () => {
    // INVERTED by #588. This used to demand more than 30 bare accents app-wide,
    // because with a long allowlist "none outside the classified areas" would
    // pass trivially if the scanner broke. There are no classified areas left -
    // the sweep took all of them - so the vacuity guard has to point at the one
    // file that still names hues by construction: design-tokens.ts, where
    // TINT_ACCENT lives until #589 deletes it.
    //
    // A floor rather than an exact count, because TINT_ACCENT's shape is asserted
    // directly below and pinning the number twice would just make one of them a
    // copy. What this has to catch is the scanner reading nothing at all.
    // A positive control rather than a count. design-tokens.ts held the last
    // bare hue accents in the tree until #589 deleted TINT_ACCENT, so there is
    // no file left to point at - and "nothing anywhere" is exactly what a broken
    // scanner also returns. Running the pattern over a known-bad line proves it
    // still matches.
    expect(`text-act`.match(BARE_HUE)).not.toBeNull();
    expect(`text-act-ink`.match(BARE_HUE)).toBeNull();
  });

  it("holds none anywhere else", () => {
    const stray = findingsIn(BARE_HUE, sourceFiles(ROOT, { dirs: ["app", "src"] }))
      .filter((finding) => !CLASSIFIED.some((dir) => finding.file.startsWith(`${dir}/`)))
      // design-tokens.ts DEFINES the accent classes; TINT_ACCENT necessarily
      // names all eight. Its shape is asserted directly below instead, the way
      // the driver gate excludes the module that defines the driver.
      .filter((finding) => finding.file !== TOKENS_FILE)
      .map((finding) => `${finding.file}:${finding.line} ${finding.snippet}`);

    // Classify the area it landed in - add its directory above and enumerate
    // its sites - rather than deleting the line from this list.
    expect(stray).toEqual([]);
  });

  it("no longer needs to let design-tokens.ts through at all", () => {
    // The file-level exclusion above is now belt with no braces needed. It was
    // there because TINT_ACCENT necessarily named all eight hues as text, and
    // excluding by FILE would have let a THIRD map ride through in silence -
    // #421's hole re-opened one file over. With both maps deleted, the file
    // writes no bare hue text at all, which is the stronger statement.
    //
    // The encoding palette it still holds is `bg-<hue>/[alpha]` ramp classes,
    // which BARE_HUE does not match: it looks for hue TEXT.
    const inTokens = findingsIn(BARE_HUE, sourceFiles(ROOT, { dirs: ["app", "src"] }))
      .filter((finding) => finding.file === TOKENS_FILE)
      .map((finding) => finding.snippet.trim())
      .sort();

    expect(inTokens).toEqual([]);
  });
});

// INVERTED by #589: there are no tint maps left to keep apart.
//
// This suite pinned the shape of TINT_TEXT and TINT_ACCENT - every hue to its
// ink in the first, the published accent in the second except `think`, no
// arbitrary values in either, and `primary` taking ink as text while keeping the
// accent as a mark. It existed because excluding design-tokens.ts from the sweep
// above would otherwise re-open #421's hole, where TINT_TEXT held raw accents as
// arbitrary values and fed ~78 sites through Text's `tint` prop.
//
// Both maps are deleted. The hole they guarded is closed differently now: the
// test above pins every bare-hue line in the file, and the eslint rule added by
// this ticket fails a build that paints a hue as chrome anywhere in the tree.
describe("the tint maps are gone", () => {
  it("design-tokens.ts declares neither TINT_TEXT nor TINT_ACCENT", () => {
    // Read from source rather than imported: a deleted export cannot be named in
    // an import statement, so the assertion has to look at the file.
    const source = stripComments(readFileSync(join(ROOT, TOKENS_FILE), "utf8"));

    expect(source).not.toMatch(/\bexport const TINT_TEXT\b/);
    expect(source).not.toMatch(/\bexport const TINT_ACCENT\b/);
    expect(source).not.toMatch(/\bexport const MARK_WASH_ALPHAS\b/);
  });

  it("still declares the encoding palette the keeps-hue surfaces read", () => {
    // The other direction, because deleting too much here is the failure that
    // takes a scale away from a user rather than a decoration.
    const source = stripComments(readFileSync(join(ROOT, TOKENS_FILE), "utf8"));

    expect(source).toMatch(/\bexport const HUE_RAMP_CLASSES\b/);
    expect(source).toMatch(/\bexport const HUE_TRIPLES\b/);
    expect(source).toMatch(/\bexport function hueRampClass\b/);
  });
});

// The mark floor in test/theme-token-sync.test.ts measures every tint on
// MARK_WASH_ALPHAS and nothing else. That set is only the truth because the
// files painting a TINT_ACCENT glyph happen to wash at 0.05 / 0.07 / 0.10 — an
// assumption the floor cannot check about itself. A fifth consumer, or a denser
// wash under an existing glyph, leaves that suite green while the glyph goes
// illegible, which is the exact shape of the hole #433 came through: every gate
// in this workstream checked spelling, none checked the surface.
//
// So the consumer list is DERIVED here (every non-test file under app/ and src/
// that names TINT_ACCENT) rather than typed out, and every tint wash any of them
// paints has to be classified by what sits on it. A new wash fails until someone
// says which — and if the answer is "a mark", MARK_WASH_ALPHAS has to grow and
// the floor re-measures it.
// SUPERSEDED by #589. #587 inverted this suite to assert that TINT_ACCENT had
// no consumers left - the precondition this ticket deletes the map on. The map
// is deleted, so "no consumers" is now true by construction and there is nothing
// for a scan to say. What replaces it is the assertion that the DECLARATION is
// gone, in "the tint maps are gone" above.

describe("the shared hue map is reached only by the hues it was measured against", () => {
  // The hue map is total over HUE_NAMES, but only some of those hues are ever
  // *selected* by configuration, and each classification above is a statement
  // about the surfaces its hue actually lands on. Nothing tied those statements
  // to the config, so a new practice or technique could pick a hue whose entry
  // says "unreachable" and no test would notice - the allowlist is keyed on the
  // map's source lines, which such a change does not touch.
  //
  // This is also the assertion that would have caught the `think` defect: the
  // fourth step of 5-4-3-2-1 has always been `hue: "think"`, and
  // grounding-session.tsx paints the *step* hue rather than the technique's, so
  // the entry claiming think was unreachable was wrong the day it was written.
  const reachable = new Set<ExerciseHue>([
    ...groundingTechniques.map((technique) => technique.hue),
    ...groundingTechniques.flatMap((technique) => technique.steps.map((step) => step.hue)),
    ...MEDITATION_PRACTICES.map((practice) => practice.hue),
  ]);

  it("selects exactly the hues these classifications cover", () => {
    // `act` is the only hue no config selects, which is what its entry claims.
    // Adding a hue here means re-reading that hue's row against the badge and
    // the practice chip before changing this list.
    expect([...reachable].sort()).toEqual(["aqua", "be", "clay", "ink", "iris", "mist", "think"]);
  });

  // INVERTED by #588. This asked whether a reachable hue reached a bare accent
  // that failed the decorative reading - `think` at 1.72:1 as a 48px glyph on
  // HueIconBadge, which the 5-4-3-2-1 technique's fourth step really did paint.
  //
  // The badge takes the app accent now and `exerciseHue(hue).classes` is gone,
  // so no configured hue reaches a class at all. That is the stronger statement
  // and it is what this asserts. It fails on the old behaviour, where every
  // definition carried a five-name class map.
  it("reaches no chrome class at all, for any configured hue", () => {
    for (const hue of reachable) {
      expect(Object.keys(exerciseHue(hue))).toEqual(["hsl"]);
    }
  });
});

describe("the onboarding modals mount outside every room", () => {
  /** Every file that renders the shared onboarding shell. */
  const shellUsers = sourceFiles(ROOT, { dirs: ["src/components/app"] }).filter((file) =>
    /\bRichOnboardingShell\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
  );

  it("finds the modal files it is meant to police", () => {
    // A rename that emptied this list would make the assertion below vacuous.
    expect(shellUsers.length).toBeGreaterThanOrEqual(8);
  });

  it("never reaches for room ink", () => {
    // Every home screen mounts its modal as a sibling of the roomed
    // SafeAreaView, so `--accent-ink` is never poured over these subtrees and
    // `text-accent-ink` would render violet. If a modal is ever nested inside a
    // room instead, this test should be revisited rather than deleted - and
    // note that nesting alone would still not make room ink safe, because the
    // pour crosses a Modal on native (React context) but not on web (the RNW
    // Modal portals to document.body, escaping the inline CSS variables).
    expect(findingsIn(ROOM_INK, shellUsers)).toEqual([]);
  });
});

// This used to be "the ToolStats accent is dead at every call site": all eight
// callers passed `tone="onField"`, the one branch that ignored `accentClassName`,
// and several comments in this file explain a sweep by leaning on that fact.
//
// #733 removed the premise rather than the risk. `ToolStats` is deleted; the
// design colours stat values `--foreground`, so `ModuleHomeHeader` renders them
// from a token instead of from a caller-supplied class. What replaces the old
// assertion is stronger than it was: the prop cannot be dead-or-alive at a call
// site that does not exist, so the gate is now that no call site exists.
describe("the ToolStats accent is gone rather than merely dead (#733)", () => {
  const sources = sourceFiles(ROOT, { dirs: ["app", "src"] }).map((file) => ({
    file,
    source: stripComments(readFileSync(join(ROOT, file), "utf8")),
  }));

  it("renders ToolStats nowhere", () => {
    const callers = sources
      .filter(({ source }) => source.includes("<ToolStats"))
      .map((s) => s.file);

    expect(callers).toEqual([]);
  });

  it("names accentClassName nowhere", () => {
    // The acceptance criterion itself: the prop is gone from the codebase, not
    // just unread. That is what takes the text-<hue>-on-background pattern -
    // which fails AA on four of the seven hues bare (#403) - out of the header.
    const named = sources
      .filter(({ source }) => source.includes("accentClassName"))
      .map((s) => s.file);

    expect(named).toEqual([]);
  });

  it('names tone="onField" nowhere', () => {
    // The field is gone, so its white-ink tone has nothing left to paint on.
    const onField = sources
      .filter(({ source }) => source.includes(`tone="onField"`))
      .map((s) => s.file);

    expect(onField).toEqual([]);
  });
});
