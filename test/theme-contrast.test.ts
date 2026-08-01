import {
  AA_TEXT,
  auditTokens,
  describeFinding,
  INK_TARGET,
  inkSurfaces,
  tripleToRgb,
  worstAgainst,
} from "@/src/lib/theme/contrast";
import { COLOR_SCHEMES } from "@/src/lib/theme/contract";
import { DESTRUCTIVE, deriveTokens } from "@/src/lib/theme/derive";
import { resolveStyle, STYLE_NAMES, STYLE_SOURCES, THEME_TOKENS } from "@/src/lib/theme/styles";

// The computed contrast gate (#580, resolved on #560).
//
// This suite replaces a model, not just a file. The gates it supersedes held ONE
// palette to AA with hand-measured numbers baked into their comments — "iris
// clears by 0.0023", "80% because 76% left a badge at 4.33". That precision is
// what caught #403 / #421 / #433, and it is also why it could not survive being
// multiplied by eight styles: the authoring cost multiplies, or the precision is
// lost.
//
// So nothing here writes a number down. Every style × scheme pair is re-measured
// from its own tokens on every run, which is 16x the coverage at less than the
// old authoring cost. A palette added in #581 is gated the moment it exists,
// with nobody remembering to extend a table.
//
// WHAT THIS GATE STRUCTURALLY CANNOT SEE, and what covers it instead: it reads
// tokens, so it is blind to a gradient painted by a SIBLING element, to a glyph
// held to the wrong floor, and to arbitrary-value classes (`text-[hsl(var(--x))]`)
// that no static gate can parse — the three shapes that actually shipped in #421
// and #433. Those are caught by rendering and measuring. That rendered probe runs
// on TWO palettes — the default plus one dark-first style — deliberately, not on
// all eight: the failure modes it catches are structural rather than
// palette-specific, so eight runs would buy repetition rather than coverage.
// Recorded here in the open, because a capped sweep should say what it capped.

describe("every shipped style clears its floors, computed", () => {
  it.each(STYLE_NAMES.flatMap((style) => COLOR_SCHEMES.map((scheme) => [style, scheme] as const)))(
    "%s %s passes every measured pairing",
    (style, scheme) => {
      const findings = auditTokens(THEME_TOKENS[style][scheme]);

      // The findings ride along in the message so a failure names the surface that
      // moved and by how much, rather than only that something regressed.
      expect({ style, scheme, failures: findings.map(describeFinding) }).toEqual({
        style,
        scheme,
        failures: [],
      });
    },
  );

  // Ruling 4: no style may fail, and there is no experimental escape. Asserted
  // rather than left to the loop above, which would pass vacuously if the style
  // table were ever emptied.
  it("gates at least one style, and every style in the table", () => {
    expect(STYLE_NAMES.length).toBeGreaterThan(0);
    expect(Object.keys(THEME_TOKENS).sort()).toEqual([...STYLE_NAMES].sort());
  });
});

describe("solved and authored inks are held to different targets, on purpose", () => {
  // A SOLVED ink stops at 5.0 rather than 4.5 for headroom: at a 4.5 target the
  // tightest style lands on 4.51, so the next retune breaks the build.
  it.each(STYLE_NAMES)("%s: a derived scheme clears the solver's target", (style) => {
    const source = STYLE_SOURCES[style];
    if (source.kind !== "derived") {
      expect(source.kind).toBe("authored");
      return;
    }

    for (const scheme of COLOR_SCHEMES) {
      const tokens = resolveStyle(source)[scheme];
      const worst = worstAgainst(
        tripleToRgb(tokens["--primary-ink"]),
        inkSurfaces(tokens["--primary"], tokens["--background"], tokens["--card"]),
      );

      expect({ style, scheme, ratio: worst.ratio >= INK_TARGET }).toEqual({
        style,
        scheme,
        ratio: true,
      });
    }
  });

  // An AUTHORED ink is held to the 4.5 floor it actually owes and no higher.
  // quiet-lilac's dark ink measures 4.71 on the nested chip — legible, below the
  // solver's headroom target, and deliberately left alone: solving it would move
  // the light ink from L28 to L50 and visibly change the shipping app, which the
  // pixel-identical guarantee forbids.
  it.each(COLOR_SCHEMES)("quiet-lilac's authored %s ink clears AA as authored", (scheme) => {
    const tokens = THEME_TOKENS["quiet-lilac"][scheme];
    const worst = worstAgainst(
      tripleToRgb(tokens["--primary-ink"]),
      inkSurfaces(tokens["--primary"], tokens["--background"], tokens["--card"]),
    );

    expect(worst.ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

// The mutation check #580 asks for, as a permanent test rather than a one-off
// experiment: a palette whose accent cannot carry its own ink must fail the
// gate. Without this, a gate that silently stopped measuring would look exactly
// like a gate with nothing to report.
describe("a palette that would fail does fail", () => {
  // deep-field's teal, the accent that broke the old fixed recipe — its L is
  // already 27%, so "fix L to 28%" LIGHTENED it, to 4.13 / 3.81 / 3.17.
  const DEEP_FIELD_LIGHT = {
    bg: "#eef1f6",
    surface: "#ffffff",
    border: "#dde3ee",
    ink: "#131722",
    muted: "#5c6784",
    accent: "#0c7d76",
  };

  it("the old fixed 28% recipe fails on deep-field, which is why it was replaced", () => {
    const solved = deriveTokens(DEEP_FIELD_LIGHT, "light");
    const pinnedToTheOldRecipe = {
      ...solved,
      "--primary-ink": `${solved["--primary"].split(" ").slice(0, 2).join(" ")} 28%`,
    };

    expect(auditTokens(pinnedToTheOldRecipe).map((f) => f.check)).toEqual(["primary ink"]);
    // And the solver is what fixes it — same accent, same surfaces.
    expect(auditTokens(solved, INK_TARGET)).toEqual([]);
  });

  // The destructive pair, which the audit did not measure at all until now. The
  // red is one shared value for all eight styles, but the surfaces under it are
  // authored per style - so a shared red is only as legible as the darkest card
  // it lands on. Pinning it back to the shared value reproduces the failure.
  it.each([
    ["sage-garden", "dark"],
    ["plum-manuscript", "dark"],
  ] as const)("%s %s fails on the raw shared destructive red", (style, scheme) => {
    const solved = THEME_TOKENS[style][scheme];
    const pinnedToTheSharedRed = { ...solved, "--destructive": DESTRUCTIVE[scheme].color };

    expect(auditTokens(pinnedToTheSharedRed).map((f) => f.check)).toEqual(["destructive ink"]);
    // And solving is what fixes it - same red, same surfaces, lightness only.
    expect(auditTokens(solved)).toEqual([]);
  });

  // The solve must stay a nudge, not a repaint: a "danger red" that has been
  // walked far enough to clear anything is no longer the danger red.
  it("moves the destructive red by only a few points of lightness", () => {
    for (const style of STYLE_NAMES) {
      for (const scheme of COLOR_SCHEMES) {
        const [h, s, l] = THEME_TOKENS[style][scheme]["--destructive"].split(" ");
        const [sharedH, sharedS, sharedL] = DESTRUCTIVE[scheme].color.split(" ");

        // Hue and saturation are untouched - only lightness may move.
        expect([h, s]).toEqual([sharedH, sharedS]);
        expect(Math.abs(parseInt(l, 10) - parseInt(sharedL, 10))).toBeLessThanOrEqual(6);
      }
    }
  });

  it("perturbing an accent until it cannot carry a label fails the gate", () => {
    const tokens = {
      ...THEME_TOKENS["quiet-lilac"].light,
      // A gold light enough that neither its own ink nor any neutral saves the
      // pairings the app paints with it.
      "--primary": "50 90% 70%",
    };

    expect(auditTokens(tokens).length).toBeGreaterThan(0);
  });
});
