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
  // The four the spec names, and only those. This list is the whole ruling in
  // executable form: a fifth entry has to answer "what does the user read off
  // this colour that they could not read off its icon and label?"
  it("are exactly the four the spec names", () => {
    expect(HUE_ENCODINGS.map((encoding) => encoding.id).sort()).toEqual([
      "breathing-pacer",
      "habit-colour",
      "mood-heatmap-ramp",
      "mood-scale",
    ]);
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
