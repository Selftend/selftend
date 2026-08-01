import { fieldGradient } from "@/src/lib/module-room";

import { CHROME_CLASSES, CHROME_MARK, CHROME_TEXT, neutralFieldGradient } from "./chrome";
import { HUE_ENCODINGS, hueEncoding, isPinnedEncoding, keepsHue } from "./encoding";

describe("the surfaces that keep hue", () => {
  // This list is the ruling in executable form, and an entry has to answer
  // "what does the user read off this colour that they could not read off its
  // icon and label?"
  //
  // It was four when #585 wrote it, because #558's table named four. #588 swept
  // the whole tree and found two more that answer the question - a colour the
  // user picked for their own breathing exercise, and the sleep tracker's 5-step
  // quality ramp. #558 never reviewed either surface; its rule admits both. The
  // list is asserted exactly rather than as a floor, so a seventh cannot arrive
  // without someone answering the question for it.
  it("are exactly the six the rule admits", () => {
    expect(HUE_ENCODINGS.map((encoding) => encoding.id).sort()).toEqual([
      "breathing-exercise-colour",
      "breathing-pacer",
      "habit-colour",
      "mood-heatmap-ramp",
      "mood-scale",
      "sleep-quality-ramp",
    ]);
  });

  // The two #588 added are both cases where neutralising would have removed a
  // feature rather than simplified chrome - the exact words #558 used to keep
  // habit colours. Pinned by kind as well as by name, because getting the kind
  // wrong is the quiet failure: a categorical encoding that re-tints repaints
  // the user's own data.
  it("classifies the two #588 found the way the rule classifies their twins", () => {
    expect(isPinnedEncoding("breathing-exercise-colour")).toBe(true);
    expect(isPinnedEncoding("habit-colour")).toBe(true);
    expect(isPinnedEncoding("sleep-quality-ramp")).toBe(false);
    expect(isPinnedEncoding("mood-heatmap-ramp")).toBe(false);
  });

  it.each(HUE_ENCODINGS)("$id says what the user reads off it", ({ reads, kind }) => {
    expect(reads.length).toBeGreaterThan(10);
    expect(["relative", "categorical"]).toContain(kind);
  });

  // The cases the ruling exists to exclude. Every one of them "distinguishes
  // items in a set", which is explicitly not enough.
  it.each([
    "module-badge",
    "sidebar-icon",
    "room-envelope",
    "field-gradient",
    "tool-badge",
    "section-rule",
    "card-border",
    "grounding-technique",
    "mindfulness-stripe",
    "single-series-chart",
  ])("%s does not keep hue", (id) => {
    expect(keepsHue(id)).toBe(false);
  });

  it("reports nothing for an unknown id rather than guessing", () => {
    expect(hueEncoding("not-a-surface")).toBeUndefined();
    expect(isPinnedEncoding("not-a-surface")).toBe(false);
  });
});

describe("relative encodings may re-tint, categorical ones are pinned", () => {
  // A ramp means "worse → better" by depth, and says that just as well in any
  // palette.
  it.each(["mood-heatmap-ramp", "mood-scale"])("%s is relative", (id) => {
    expect(hueEncoding(id)?.kind).toBe("relative");
    expect(isPinnedEncoding(id)).toBe(false);
  });

  // These two are the user's own data wearing a colour. Re-tinting them would
  // repaint a habit the user painted green because they tried a palette —
  // quiet, uncorrelated, and impossible for them to attribute.
  it.each(["habit-colour", "breathing-pacer"])("%s is pinned", (id) => {
    expect(hueEncoding(id)?.kind).toBe("categorical");
    expect(isPinnedEncoding(id)).toBe(true);
  });

  it("every encoding is one or the other, never unclassified", () => {
    for (const encoding of HUE_ENCODINGS) {
      expect(isPinnedEncoding(encoding.id)).toBe(encoding.kind === "categorical");
    }
  });
});

describe("the neutral chrome primitives", () => {
  it("name a role rather than a colour", () => {
    // If these ever spell a hue, the sweep has replaced one literal with
    // another instead of removing the hue from chrome.
    for (const className of CHROME_CLASSES) {
      expect(className).not.toMatch(/\b(mist|iris|be|ink|act|clay|think|aqua)\b(?!-)/);
    }
  });

  it("are all distinct, so no two roles are secretly the same knob", () => {
    // CHROME_MARK and CHROME_MUTED_TEXT deliberately share a value today; the
    // rest must not collapse.
    expect(new Set(CHROME_CLASSES).size).toBeGreaterThanOrEqual(CHROME_CLASSES.length - 1);
  });

  it("chrome text and chrome marks are not the same emphasis", () => {
    expect(CHROME_TEXT).not.toBe(CHROME_MARK);
  });

  // Delegation, not a second formula: the primary field already ships (#500) and
  // is already held to the same contrast floors as every hue field.
  it.each([true, false])("the neutral field is the primary field (isDark=%s)", (isDark) => {
    expect(neutralFieldGradient(isDark)).toEqual(fieldGradient("primary", isDark));
  });
});
