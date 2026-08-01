import { THEME_VAR_NAMES } from "./contract";
import type { CoreHexes } from "./derive";
import {
  DEFAULT_STYLE,
  resolveStyle,
  STYLE_LABELS,
  STYLE_NAMES,
  STYLE_SOURCES,
  THEME_TOKENS,
} from "./styles";

// The palette set (#581). Contrast is gated separately and computed —
// test/theme-contrast.test.ts measures all 16 (style, scheme) pairs. What this
// file holds is the shape of the set: that eight exist, that they vary colour
// and nothing else, and that only the default is hand-authored.

const CORE_KEYS: (keyof CoreHexes)[] = ["bg", "surface", "border", "ink", "muted", "accent"];

describe("the palette set", () => {
  it("is the eight the spec names", () => {
    expect([...STYLE_NAMES].sort()).toEqual(
      [
        "amber-noir",
        "atlas",
        "deep-field",
        "glacier",
        "ink-ivory",
        "plum-manuscript",
        "quiet-lilac",
        "sage-garden",
      ].sort(),
    );
  });

  it("has a source and a resolved pair for every name, and no orphans", () => {
    expect(Object.keys(STYLE_SOURCES).sort()).toEqual([...STYLE_NAMES].sort());
    expect(Object.keys(THEME_TOKENS).sort()).toEqual([...STYLE_NAMES].sort());
  });

  it.each(STYLE_NAMES)("%s fills the whole contract in both schemes", (style) => {
    for (const scheme of ["light", "dark"] as const) {
      expect(Object.keys(THEME_TOKENS[style][scheme]).sort()).toEqual([...THEME_VAR_NAMES].sort());
      for (const value of Object.values(THEME_TOKENS[style][scheme])) {
        expect(value).toMatch(/^\d+ \d+% \d+%$/);
      }
    }
  });

  // Two palettes that resolved to the same tokens would be two entries in the
  // selector painting one app.
  it("no two styles resolve to the same light palette", () => {
    const seen = STYLE_NAMES.map((style) => JSON.stringify(THEME_TOKENS[style].light));

    expect(new Set(seen).size).toBe(STYLE_NAMES.length);
  });
});

describe("colours only", () => {
  // The owner ruled the style axis colours-only, overriding WikiCanvas's
  // per-style radius and serif. This holds structurally rather than by
  // discipline: a derived style authors six COLOURS, and there is no key for a
  // radius, a font, a spacing step or a control shape to arrive under.
  it.each(STYLE_NAMES)("%s authors nothing but colour", (style) => {
    const source = STYLE_SOURCES[style];

    if (source.kind === "derived") {
      for (const scheme of ["light", "dark"] as const) {
        expect(Object.keys(source[scheme]).sort()).toEqual([...CORE_KEYS].sort());
        for (const value of Object.values(source[scheme])) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
      return;
    }

    for (const scheme of ["light", "dark"] as const) {
      expect(Object.keys(source[scheme]).sort()).toEqual([...THEME_VAR_NAMES].sort());
    }
  });

  it("no style carries a radius, font, spacing or shape key anywhere", () => {
    const serialised = JSON.stringify(STYLE_SOURCES);

    for (const forbidden of ["radius", "font", "serif", "spacing", "shape", "controlShape"]) {
      expect(serialised).not.toContain(forbidden);
    }
  });
});

describe("authoring", () => {
  it("only the default style is hand-authored", () => {
    const authored = STYLE_NAMES.filter((style) => STYLE_SOURCES[style].kind === "authored");

    expect(authored).toEqual([DEFAULT_STYLE]);
  });

  // Seven palettes are six hexes each. Adding an eighth is choosing six colours,
  // not filling twenty tokens by hand — and if those six cannot clear the floors
  // the solver throws before a token table exists.
  it.each(STYLE_NAMES)("%s resolves to the same shape whichever way it was authored", (style) => {
    expect(resolveStyle(STYLE_SOURCES[style])).toEqual(THEME_TOKENS[style]);
  });
});

describe("palette names", () => {
  it("names every style", () => {
    expect(Object.keys(STYLE_LABELS).sort()).toEqual([...STYLE_NAMES].sort());
  });

  // Proper nouns, not i18n keys: the palettes are named things, and only the
  // chrome around them is translated (#583). A label that looked like a key
  // would be the first step toward translating them by accident.
  it.each(STYLE_NAMES)("%s has a proper-noun label, not a key", (style) => {
    expect(STYLE_LABELS[style]).toMatch(/^[A-Z]/);
    expect(STYLE_LABELS[style]).not.toMatch(/[.:_]/);
  });
});
