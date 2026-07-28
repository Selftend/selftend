import { readFileSync } from "node:fs";
import { join } from "node:path";

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
// 2. **The ACT module is not the act room.** `act`'s room is
//    `src/features/habits/` (see the header of test/chip-contrast.test.ts:
//    "Every habit screen wears the act room"). No file under
//    `src/features/act/`, and no route under `app/(app)/modules/act/`, calls
//    `useRoomStyle`. So `--accent-ink` is never poured here and resolves to
//    `--primary`: `text-accent-ink` in this module renders violet text on a
//    green screen. The correct off-room class is `text-act-ink`.
//
// Every surviving occurrence in a classified area is enumerated in ALLOWED with
// the surface it actually sits on and the contrast it measures there, keyed on
// the source line so that editing the line forces the judgement to be re-read.
// Adding an area here means classifying its sites first, then deleting its row
// from test/accent-ink-coverage.test.ts - the ratchet that holds every
// not-yet-classified area at its current count.

const ROOT = join(__dirname, "..");

const ACT_DIR = "src/features/act";

/**
 * The areas whose survivors are fully enumerated below. `app` is the whole
 * route tree; the three do not overlap, so no file is scanned twice.
 */
const CLASSIFIED_AREAS = [ACT_DIR, "src/components/app", "app"] as const;

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

/** Room ink, which the ACT module must never use - see rule 2 above. */
const ROOM_INK = /text-accent-ink(?![\w-])/g;

/** Why a site is allowed to keep the raw accent. */
type Reason =
  /** Non-text glyph: WCAG 1.4.11 floor of 3:1, not 1.4.3's 4.5:1. */
  | "icon"
  /** Pure decoration under WCAG 1.4.3: conveys nothing, has no function. */
  | "decorative"
  /** >=24px regular or >=18.66px bold, so 1.4.3's large-text floor of 3:1 applies. */
  | "large-text"
  /** A hue that clears 4.5:1 as small text on the surface this site sits on. */
  | "passing-hue"
  /** The class never reaches a rendered element on any code path. */
  | "inert";

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
const COMPONENTS_APP_SITES: AllowedSite[] = [
  {
    file: "app/(app)/tools/breathing/index.tsx",
    snippet: `accentClassName="text-aqua"`,
    reason: "inert",
    evidence:
      'Passed with `tone="onField"` (line 101), the branch that renders white ' +
      "ink on the aqua field and never reads `accentClassName` - so this class " +
      "paints nothing. No surface to measure. Left as-is rather than swept: " +
      "changing it would be a no-op that reads as a fix. If the prop is ever " +
      "made live for onField, the premise test below fails and this row must be " +
      "re-judged against the field gradient, not the room surface.",
  },
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

const ALLOWED: AllowedSite[] = [...ACT_SITES, ...COMPONENTS_APP_SITES];

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
    // Guards the allowlist against a row added with an empty justification -
    // the whole point of #412 is that the judgement is written down.
    const thin = ALLOWED.filter((site) => site.evidence.trim().length < 40).map(key);
    expect(thin).toEqual([]);
  });
});

describe("src/features/act is not the act room", () => {
  it("never reaches for room ink, because this module is not a room", () => {
    // `text-accent-ink` resolves to `--primary` outside a room: violet text in a
    // green module. The off-room class is `text-act-ink`. This is the single
    // assertion most likely to catch a well-meaning future sweep.
    expect(findings(ROOM_INK, [ACT_DIR])).toEqual([]);
  });

  it("has no useRoomStyle call to justify room ink", () => {
    // The premise of the assertion above, checked rather than trusted - if this
    // module ever does become a room, that test needs to be revisited, not
    // deleted.
    const roomed = sourceFiles(ROOT, { dirs: [ACT_DIR] }).filter((file) =>
      /\buseRoomStyle\b/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect(roomed).toEqual([]);
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
