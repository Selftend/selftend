import { fieldGradient } from "@/src/lib/module-room";

import { CHROME_CLASSES, CHROME_MARK, CHROME_TEXT, neutralFieldGradient } from "./chrome";
import {
  HUE_ENCODINGS,
  hueEncoding,
  isPinnedEncoding,
  keepsHue,
  type HueEncodingId,
} from "./encoding";
import { DEFAULT_STYLE, STYLE_NAMES, THEME_TOKENS } from "./styles";

describe("the surfaces that keep hue", () => {
  // This list is the ruling in executable form, and an entry has to answer
  // "what does the user read off this colour that they could not read off its
  // icon and label?"
  //
  // It was four when #585 wrote it, because #558's table named four. #588 swept
  // the whole tree and found two more that answer the question - a colour the
  // user picked for their own breathing exercise, and the sleep tracker's 5-step
  // quality ramp. #558 never reviewed either surface; its rule admits both. The
  // list is asserted exactly rather than as a floor, so a new entry cannot
  // arrive without someone answering the question for it.
  // Down from six: "mood-scale" left with the 2a redesign — the bare-emoji
  // input control encodes selection in size and opacity, not hue —
  // "sleep-quality-ramp" left with the sleep redesign (#771/#855), which moved
  // the level into words and dot count on every surface that had worn the ramp,
  // and "mood-heatmap-ramp" left with #924, which re-tinted the ramp onto the
  // active style's accent so it names no hue at all.
  it("are exactly the three the rule admits", () => {
    expect(HUE_ENCODINGS.map((encoding) => encoding.id).sort()).toEqual([
      "breathing-exercise-colour",
      "breathing-pacer",
      "habit-colour",
    ]);
  });

  // The survivor of #588's two finds is a case where neutralising would have
  // removed a feature rather than simplified chrome - the exact words #558 used
  // to keep habit colours. Pinned by kind as well as by name, because getting
  // the kind wrong is the quiet failure: a categorical encoding that re-tints
  // repaints the user's own data.
  it("classifies the encoding #588 found the way the rule classifies its twin", () => {
    expect(isPinnedEncoding("breathing-exercise-colour")).toBe(true);
    expect(isPinnedEncoding("habit-colour")).toBe(true);
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
  // The `relative` kind has no members today: its last one, the mood ramp,
  // re-tinted all the way onto the style accent in #924 and left the registry
  // (a ramp means "worse → better" by depth, and says that just as well in
  // any palette — including the accent's own). Departed ids answer "not a
  // keeps-hue surface", same as any unknown id.
  it("the mood ramp left the registry when it re-tinted onto the accent (#924)", () => {
    expect(keepsHue("mood-heatmap-ramp")).toBe(false);
    expect(isPinnedEncoding("mood-heatmap-ramp")).toBe(false);
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

  // A COMPILE-time guard, which is the only kind that can catch this: whether
  // the ids are the four-way union or plain `string`, the runtime behaviour is
  // identical, so nothing observable fails when the type widens. Annotating
  // HUE_ENCODINGS as `readonly HueEncoding[]` widens it (the annotation is
  // checked against the literal but also erases it), and then every misspelled
  // surface id in the migrate batches compiles and silently answers "not
  // keeps-hue". If that regresses, `string extends HueEncodingId` becomes true
  // and this file stops compiling.
  it("keeps the id union narrow, so a misspelled surface id cannot compile", () => {
    type IdUnionIsNarrow = string extends HueEncodingId ? "widened" : "narrow";
    const narrow: IdUnionIsNarrow = "narrow";

    expect(narrow).toBe("narrow");
  });

  // The property that matters, and the one a delegation test could not see:
  // the neutral field follows the palette the user actually picked. Comparing
  // it against fieldGradient("primary") instead would have compared the
  // implementation with itself - both read the same fixed violet - and passed
  // while every migrated header stayed lilac on all eight palettes.
  it.each([true, false])("the neutral field pours the active accent (isDark=%s)", (isDark) => {
    for (const style of STYLE_NAMES) {
      const expected = Number.parseInt(THEME_TOKENS[style].light["--primary"], 10);
      for (const stop of neutralFieldGradient(style, isDark)) {
        expect(stop.startsWith(`hsl(${expected}, `)).toBe(true);
      }
    }
  });

  // Distinctness, not just "each is defined": if two palettes with different
  // accents poured the same field, the bug above would still be present and the
  // per-style assertion alone could not tell.
  it.each([true, false])("different accents pour different fields (isDark=%s)", (isDark) => {
    const byAccent = new Map<string, string>();

    for (const style of STYLE_NAMES) {
      const accent = THEME_TOKENS[style].light["--primary"].split(" ")[0];
      const field = neutralFieldGradient(style, isDark).join("|");
      const seen = byAccent.get(accent);
      if (seen === undefined) {
        byAccent.set(accent, field);
      } else {
        // Same accent hue must pour the same field...
        expect(field).toBe(seen);
      }
    }

    // ...and distinct accent hues must pour distinct fields.
    expect(new Set(byAccent.values()).size).toBe(byAccent.size);
  });

  // The default palette must not shift: quiet-lilac's neutral field is still
  // exactly the primary field that ships today (#500).
  it.each([true, false])("quiet-lilac still pours today's field (isDark=%s)", (isDark) => {
    expect(neutralFieldGradient(DEFAULT_STYLE, isDark)).toEqual(fieldGradient("primary", isDark));
  });
});
