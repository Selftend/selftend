import { readFileSync } from "node:fs";
import { join } from "node:path";

import { groundingTechniques } from "@/src/constants/grounding";
import { exerciseHue, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { MEDITATION_PRACTICES } from "@/src/features/meditation/practices";
import { HUE_NAMES, TINT_ACCENT, TINT_TEXT } from "@/src/lib/design-tokens";
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
//    - `src/features/act` and `src/features/home` are not rooms. `act`'s room
//      is `src/features/habits/` (see the header of test/chip-contrast.test.ts:
//      "Every habit screen wears the act room"), and the home hub is not a room
//      at all - it shows every module's hue side by side, so there is no single
//      hue to pour. No file under either calls `useRoomStyle`, which the
//      assertions below check rather than trust. So `--accent-ink` is never
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
const COMPONENTS_APP_SITES: AllowedSite[] = [
  {
    file: "app/(app)/tools/breathing/index.tsx",
    snippet: `<Icon name="air" className="size-6 text-aqua" />`,
    reason: "icon",
    evidence:
      "air glyph (24px) on a bg-aqua/10 well over the aqua room's card " +
      '(Card variant="soft" keeps bg-card; tint colours only its shadow): ' +
      "4.63 light / 5.57 dark. This screen genuinely is the aqua room " +
      '(useRoomStyle("aqua"), line 70), and it clears 4.5 even as text. ' +
      "Paired with the 'Start session' label, and <Icon> is aria-hidden.",
  },
  {
    file: "src/components/app/grounding-onboarding-modal.tsx",
    snippet: `<Icon name="anchor" className="size-5 text-be" />`,
    reason: "passing-hue",
    evidence:
      "be on the neutral `--background`: 4.86 light / 7.65 dark - full AA small " +
      "text, so the exemption does not lean on the icon floor at all. The " +
      "surface is neutral from both callers (grounding-home-screen, which is " +
      "the clay room but mounts the modal outside it, and the room-less " +
      "cbt-home); on the clay room's background it would still be 4.81.",
  },
  {
    file: "src/components/app/habits-onboarding-modal.tsx",
    snippet: `<Icon name="loop" className="size-5 text-be" />`,
    reason: "passing-hue",
    evidence:
      "be on the neutral `--background`: 4.86 light / 7.65 dark. Callers are " +
      "habits-home-screen (act room, modal mounted outside it), cbt-home and " +
      "app/(app)/tools/habits/onboarding.tsx, both room-less. Worst surface of " +
      "the three is the neutral one quoted; the act room's background is 4.91.",
  },
  {
    file: "src/components/app/habits-onboarding-modal.tsx",
    snippet: `<Icon name="badge" className="size-5 text-act" />`,
    reason: "icon",
    evidence:
      "badge glyph (20px) on a bg-act/5 card over the neutral background: 3.45 " +
      "light / 8.66 dark. Clears 1.4.11's 3:1, not 4.5 - it stays as an icon " +
      "exemption. <Icon> is aria-hidden and the adjacent CardTitle carries the " +
      "meaning, so the hue is decoration on a labelled row.",
  },
  {
    file: "src/components/app/module-home-header.tsx",
    snippet: `? "text-act"`,
    reason: "icon",
    evidence:
      "The program header action's glyph (20px) on the neutral `--background`: " +
      "3.64 light / 9.30 dark. Only act-home-screen.tsx:179 and " +
      "cbt-home-screen.tsx:103 pass a `program` action, both on the non-field " +
      "header and both room-less, so this is the only surface it renders on. " +
      "The `onField` branch above it takes white ink instead, so the field " +
      "header never reaches this line. Pressable carries accessibilityLabel.",
  },
  {
    file: "src/components/app/program-card.tsx",
    snippet: `startTitle: "flex-1 text-act",`,
    reason: "large-text",
    evidence:
      'Applied to <Text variant="h3"> (line 158) = text-2xl, 24px, with no ' +
      "fontSize override in tailwind.config.js - 1.4.3's large-text floor of " +
      "3:1 applies. On the bg-act/5 start container over the neutral " +
      "background: 3.45 light / 8.66 dark. Off-room at both callers (act-home, " +
      "cbt-home); only the `act` tint is a hue, `primary` is not.",
  },
  {
    file: "src/components/app/program-card.tsx",
    snippet: `dismissIcon: "size-5 text-act",`,
    reason: "icon",
    evidence:
      "close glyph (20px) on the bg-act/5 start container over the neutral " +
      "background: 3.45 light / 8.66 dark. The dismiss Pressable carries " +
      "accessibilityLabel `program.dismissStartLabel`, so nothing is signalled " +
      "by hue alone.",
  },
  {
    file: "src/components/app/program-card.tsx",
    snippet: `routeIcon: "text-act",`,
    reason: "icon",
    evidence:
      "route glyph (size={22}) inside the eyebrow glyph box, bg-act/12 over the " +
      "neutral card: 3.44 light / 6.15 dark - the lowest figure in this area, " +
      "still clear of 3:1. The box itself is accessibilityElementsHidden + " +
      'importantForAccessibility="no", and the eyebrow text beside it carries ' +
      "the label, so it is decoration by construction.",
  },
  {
    file: "src/components/app/program-card.tsx",
    snippet: `phaseTitle: "text-act",`,
    reason: "large-text",
    evidence:
      'Applied to <Text variant="h3"> (line 271) = text-2xl, 24px, so the 3:1 ' +
      "large-text floor applies. On the neutral card: 3.95 light / 7.79 dark.",
  },
  {
    file: "src/components/app/program-card.tsx",
    snippet: `taskRowDoneIcon: "size-5 text-act",`,
    reason: "icon",
    evidence:
      "check-circle (20px) on the completed task row's bg-act/10 over the " +
      "neutral card: 3.52 light / 6.44 dark. Done/not-done is carried by the " +
      "glyph as well as the hue (check-circle vs radio-button-unchecked, line " +
      "111) and by the `current/target` count in the same row.",
  },
  {
    file: "src/components/app/program-graduation.tsx",
    snippet: `<Text variant="h3" className="text-be">`,
    reason: "large-text",
    evidence:
      "text-2xl, 24px, on the bg-be/5 panel over the neutral background: 4.54 " +
      "light / 7.15 dark. Clears the 3:1 large-text floor with room to spare, " +
      "and in fact clears 4.5 as well - but it is quoted as large-text because " +
      "the 4.54 is a margin of 0.04 on a tint, not the flat `be` 4.86. " +
      "Off-room at both callers (act-home-screen, cbt-program-section).",
  },
  {
    file: "src/components/app/program-graduation.tsx",
    snippet: `<Icon name="check-circle" className="size-4 text-be" />`,
    reason: "icon",
    evidence:
      "check-circle (16px) on the same bg-be/5 panel: 4.54 light / 7.15 dark. " +
      "Purely a bullet for the stat line beside it; <Icon> is aria-hidden.",
  },
  {
    file: "src/components/app/rich-onboarding-shell.tsx",
    snippet: `<Icon name={icon} className="size-4 text-be" />`,
    reason: "icon",
    evidence:
      "OnboardingInfoRow's glyph (16px) on its bg-be/15 tile over the neutral " +
      "background: 3.93 light / 6.00 dark. This is the trap in #412's note - be " +
      "is 4.86 flat but only 3.93 on a /15 wash of itself, so it is an icon " +
      "exemption, not a passing hue. Used by the grounding, habits, mood and " +
      "sleep modals, all of which mount outside their caller's room, so the " +
      "neutral base is the only one; the worst room base (ink) would be 3.80, " +
      "still over 3:1. Each row pairs the glyph with a title and body.",
  },
  {
    file: "src/components/app/sleep-onboarding-modal.tsx",
    snippet: `<Icon name="bedtime" className="size-5 text-be" />`,
    reason: "passing-hue",
    evidence:
      "be on the neutral `--background`: 4.86 light / 7.65 dark. Callers are " +
      "sleep-tracker-screen (ink room, modal mounted outside it) and the " +
      "room-less cbt-home; on the ink room's background it would be 4.70.",
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
 * The widget tints. The bare accent this row classifies is the map's `icon`
 * field, and its five consumers are all the same thing: a module identity glyph
 * sitting beside that module's own name in text. None of them lets the tint
 * carry state or information, and `<Icon>` is `aria-hidden` by default
 * (src/components/react-native-reusables/icon.tsx), so assistive tech never
 * reaches it either. That puts these outside 1.4.11, which exempts graphics
 * that are decorative rather than "required to understand the content".
 *
 * The map's other two consumers paint *text* in the tint - WidgetCardHeader's
 * module label and add-widget-modal's add button - and neither is covered by
 * this row. Both take the map's `ink` field instead, so neither reaches the
 * bare accent at all. That split is the point: a consumer that wants this tint
 * as text does not get to borrow the decorative exemption.
 *
 * The `icon` sites are classified `decorative` and not `icon` on purpose,
 * because on two of the five the number does *not* clear 3:1 - the config
 * screen's selected row stacks the chip on `bg-primary/10`, and the add-widget
 * preview block nests a chip inside a chip. Calling these `icon` would assert a
 * floor they do not meet.
 *
 * **The row is invalidated by any consumer that makes this tint mean
 * something, or that paints it as text.** That is the change this comment
 * exists to catch - and because the gate below only sees the literal class
 * names in widget-tint.ts, not the call sites that spread them, catching it is
 * a review job, not a regex one.
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

function findings(pattern: RegExp, dirs: readonly string[]): Finding[] {
  return findingsIn(pattern, sourceFiles(ROOT, { dirs: [...dirs] }));
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

describe("act and home are not rooms", () => {
  it("never reaches for room ink, because neither area is a room", () => {
    // `text-accent-ink` resolves to `--primary` outside a room: violet text in a
    // green module. The off-room class is `text-<hue>-ink`. This is the single
    // assertion most likely to catch a well-meaning future sweep.
    expect(findings(ROOM_INK, ROOMLESS_AREAS)).toEqual([]);
  });

  it("has no useRoomStyle call to justify room ink", () => {
    // The premise of the assertion above, checked rather than trusted - if
    // either area ever does become a room, that test needs to be revisited,
    // not deleted.
    const roomed = sourceFiles(ROOT, { dirs: [...ROOMLESS_AREAS] }).filter((file) =>
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
    reason: "decorative",
    evidence: `${HUE_MAP_ICON}. Reached by the breath-awareness practice (3.15:1 on bg-mist/15 over bg-card) and, as a practice hue, by the meditation badge (2.96:1 on bg-mist/14 over the app background). The badge figure is under 1.4.11's 3:1, so this is decorative rather than icon - exempt, not passing.`,
  },
  {
    file: HUE_MAP,
    snippet: `text: "text-iris",`,
    reason: "decorative",
    evidence: `${HUE_MAP_ICON}. The only hue reaching both consumers - body-scan practice (3.14:1 on bg-iris/15 over bg-card) and the 5-4-3-2-1 grounding technique (2.94:1 on bg-iris/14 over the app background). The badge figure is under 1.4.11's 3:1, so this is decorative rather than icon - exempt, not passing.`,
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
  // `think` has no row here any more: its `text` member is the ink token, so
  // there is no bare accent left to classify. The entry that used to sit here
  // called it "unreachable today, and the one entry that must stay that way",
  // and that was wrong on the first half - the 5-4-3-2-1 technique's fourth
  // step is `hue: "think"`, and grounding-session.tsx passes the step hue, not
  // the technique's, into HueIconBadge. It was rendering at 1.72:1.
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
    // If the scan itself broke, the assertion below would pass by finding
    // nothing anywhere rather than nothing *outside* the classified areas.
    expect(
      findingsIn(BARE_HUE, sourceFiles(ROOT, { dirs: ["app", "src"] })).length,
    ).toBeGreaterThan(30);
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
});

describe("the tint maps keep text and marks apart (#421)", () => {
  // The blind spot that made this necessary: TINT_TEXT held the raw accents as
  // arbitrary values, feeding ~78 sites through `Text`'s `tint` prop - the
  // signed-out landing page among them, where nine of ten labels measured below
  // AA. Excluding the defining file from the sweep above would re-open exactly
  // that hole, so the two maps are asserted by shape here rather than trusted.

  it("TINT_TEXT resolves every hue to its ink, never to the accent", () => {
    for (const hue of HUE_NAMES) {
      expect(TINT_TEXT[hue]).toBe(`text-${hue}-ink`);
    }
  });

  it("TINT_ACCENT resolves every hue to the published accent", () => {
    for (const hue of HUE_NAMES) {
      expect(TINT_ACCENT[hue]).toBe(`text-${hue}`);
    }
  });

  it("neither map writes a hue as an arbitrary value", () => {
    // The spelling the gates could not see. Plain classes only, so a future
    // reader of either map is also readable by the scan.
    const written = [...Object.values(TINT_TEXT), ...Object.values(TINT_ACCENT)];

    expect(written.filter((cls) => cls.includes("hsl(var("))).toEqual([]);
  });

  it("primary is the only tint with no ink, and is tracked separately", () => {
    // `primary` is not a hue; it measures 4.41:1 on bg-primary/10 and is #422.
    expect(TINT_TEXT.primary).toBe("text-primary");
    expect(TINT_ACCENT.primary).toBe("text-primary");
  });
});

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

  it("never reaches a bare accent that fails the decorative reading outright", () => {
    // Every reachable hue paints HueIconBadge, whose glyph is aria-hidden and
    // sits beside the technique or practice name - decorative, so 1.4.11 does
    // not bind. `think` is excluded anyway because a 1.72:1 mark is invisible
    // rather than merely exempt, and it is the one hue whose `text` member is
    // the ink token for that reason.
    const bareAccent = [...reachable].filter(
      (hue) => !exerciseHue(hue).classes.text.endsWith("-ink"),
    );

    expect(bareAccent).not.toContain("think");
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

describe("the ToolStats accent is dead at every call site", () => {
  // The premise behind the claim, made throughout this file and #412's notes,
  // that `accentClassName` is dead at every call site: it is dead only because
  // all eight callers pass `tone="onField"`, the one branch that ignores the
  // prop. src/components/app/tool-stats.test.tsx proves the branch ignores it;
  // nothing proved which tone the callers pass.
  //
  // The ink-token rule below already makes every value safe if the prop wakes
  // up, so this is no longer what stops a raw accent going live. It is here to
  // keep the *stated reason* true: several comments explain a sweep by saying
  // the prop is never read, and that sentence quietly stops being a fact the
  // day a screen passes a different tone. Then it should be re-read, which is
  // what a failure here forces.
  const callers = sourceFiles(ROOT, { dirs: ["app", "src"] })
    .map((file) => ({ file, source: stripComments(readFileSync(join(ROOT, file), "utf8")) }))
    .filter(({ source }) => source.includes("<ToolStats"))
    .map(({ file, source }) => ({
      file,
      rendered: source.split("<ToolStats").length - 1,
      onField: source.split(`tone="onField"`).length - 1,
    }));

  it("finds the call sites it is meant to police", () => {
    // A rename would empty this list and make the assertion below vacuous.
    const total = callers.reduce((sum, c) => sum + c.rendered, 0);
    expect(total).toBe(8);
  });

  it("passes tone='onField' at every one of them", () => {
    // Counted per file rather than parsed: a ToolStats that takes any other
    // tone - or a computed one - leaves the two counts unequal here.
    const mismatched = callers
      .filter((c) => c.rendered !== c.onField)
      .map((c) => `${c.file}: ${c.rendered} rendered, ${c.onField} on the field`);

    expect(mismatched).toEqual([]);
  });
});
