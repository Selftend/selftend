import { CHROME_MARK, CHROME_TEXT, CHROME_WASH } from "@/src/lib/theme/chrome";

// Widget identity is icon and label (#587).
//
// This map used to hold nine tints, one per module, each a `chip` / `icon` /
// `ink` triple: a `bg-<hue>/10` chip with that module's glyph inside and that
// module's ink on the label beside it. Seven consumers spread it - the widget
// card header, the add-to-home popover, the add-widget modal, the config screen.
//
// The ruling on #558 is that a widget header chip is a badge like any other:
// what it distinguishes is which module a card belongs to, and the glyph plus
// the module's own name in the label beside it already do that. So the eight
// hues go, and what is left is the neutral chrome every other identity surface
// in the app now takes.
//
// What the collapse throws away, deliberately, is a large amount of per-hue
// contrast bookkeeping. The comment here used to run to sixty lines because the
// numbers were not uniform: the `icon` field measured 3.33-4.62 on a widget card
// but 2.72-3.80 on the config screen's selected row (a chip stacked on
// `bg-primary/10`) and in the add-widget modal's nested preview chip - so
// `mist`, `iris`, `act` and `clay` fell under WCAG 1.4.11's 3:1 on two of the
// five surfaces and had to be classified `decorative` rather than `icon`, i.e.
// exempt rather than passing. `think` was swept to ink outright at 1.90 falling
// to 1.56. The map also had to keep `icon` and `ink` apart, because a mark
// darkened to ink reads as disabled while text at the accent fails AA.
//
// None of that survives the neutral pair, because none of it was ever about
// widgets - it was about painting glyphs and small text in eight saturated
// colours on washes of those same colours. `text-muted-foreground` on `bg-muted`
// is a pairing the app holds to its floors everywhere.
//
// `destructive` stays, and it is why this module still exists rather than being
// deleted the way tool-accent.ts was: it is a semantic role, not a module hue.
// It means "this widget is about something going wrong", which is information
// the user reads off the colour, so neutralising it would delete a signal
// instead of a decoration.

export type WidgetTint =
  "primary" | "act" | "be" | "aqua" | "mist" | "iris" | "ink" | "clay" | "think" | "destructive";

interface TintClasses {
  /** The wash behind an identity glyph or a label pill. */
  chip: string;
  /** A non-text mark: the widget's module glyph. */
  icon: string;
  /** Small text drawn on `chip` - the module label, the add button. */
  ink: string;
}

/**
 * The one neutral triple every module tint resolves to. A constant rather than
 * nine identical rows, so "widget chrome changed" stays a one-line diff.
 *
 * `ink` is the FULL foreground, not the muted one, and that is measured rather
 * than chosen. `--muted-foreground` on `--muted` is the obvious pairing and it
 * does not clear AA across the eight palettes: it bottoms out at 4.27:1 on
 * sage-garden light, with amber-noir 4.52 and atlas 4.56 barely over. `ink` is
 * 10px uppercase text, so it owes 4.5:1, and `--foreground` on `--muted` never
 * drops below 9.57 in any palette or scheme. The glyph beside it keeps the muted
 * mark because a mark owes 1.4.11's 3:1, which 4.27 clears comfortably.
 */
const CHROME: TintClasses = {
  chip: CHROME_WASH,
  icon: CHROME_MARK,
  ink: CHROME_TEXT,
};

/**
 * The ticket the note above deferred to (#603), now closed.
 *
 * `destructive` has no `-ink` token of its own, so it was using the raw red for
 * BOTH the glyph and the label — and on its own /10 chip that label read 4.03:1,
 * below the 4.5 an 10px uppercase label owes.
 *
 * The fix is the split CHROME already makes, applied here: the LABEL takes
 * `--foreground` (9.27:1 at worst on this chip, across all eight palettes) and
 * the GLYPH keeps the red, because a mark owes 1.4.11's 3:1 and it measures 3.96
 * at worst. The chip itself stays red, so the destructive tint still reads as
 * destructive — only the text that has to be *read* moved off it.
 *
 * Note the surface matters: `bg-muted` is NOT an escape here. `text-destructive`
 * on `--muted` fails on twelve of the sixteen palette/scheme pairs (atlas dark
 * is 3.44), which is why the label moves to `--foreground` rather than the chip
 * moving to the neutral wash.
 */
const DESTRUCTIVE: TintClasses = {
  chip: "bg-destructive/10",
  icon: "text-destructive",
  ink: CHROME_TEXT,
};

export function tintClasses(tint: WidgetTint): TintClasses {
  return tint === "destructive" ? DESTRUCTIVE : CHROME;
}
