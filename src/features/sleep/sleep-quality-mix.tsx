import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

const BAR_AREA = 72;

/**
 * How many of the last 30 nights landed at each of the five quality levels
 * (#773) — check-in's distribution (#701), on sleep's own scale.
 *
 * Wraps `charts/bar-chart.tsx`, the way `mood-distribution.tsx` does. The
 * primitive knows about bars; this knows about sleep.
 *
 * **The ramp is gone, and it was not a preference.** This surface used to paint
 * each level in `hueRampClass("ink", quality)` over a `bg-muted/40` track.
 * Measured on that track, the five steps land at **1.23 / 1.55 / 2.11 / 3.08 /
 * 5.03** — so *Very poor*, *Poor* and *Fair* were all under 1.4.11's 3:1 floor,
 * on every one of the eight palettes, in both schemes. The track itself measured
 * **1.01–1.11** against the card it sat on, which is the same shape as #725's
 * `bg-muted` bar. The worst level was the faintest mark on the screen: a user
 * who slept badly for a month got the tallest bar and the least ink.
 *
 * **Uniform fill.** Every non-zero column takes `bg-primary`, which measures
 * **4.45–9.25** against the card across the sixteen palette/scheme pairs and is
 * already gated at 3:1 app-wide by the "accent as a mark" check in
 * `test/theme-contrast.test.ts`. A per-level ramp would encode *identity*, which
 * #691 forbids: the level is already carried by x-position and by a printed
 * word, so hue would be decoration wearing the clothes of data.
 *
 * That is also why nothing here depends on colour vision. Position, the level
 * word and the printed count are three non-colour cues, so the chart reads the
 * same in greyscale and under deuteranopia as it does in full colour.
 *
 * **Counts, not percentages** (#701): "33%" from three nights claims a precision
 * the data has not earned, and invites the evaluative phrasing the guardrails
 * rule out. No separate swatch legend — the columns label themselves.
 *
 * Columns run 1 → 5 left to right, the scale's own order everywhere else in the
 * product, so it reads as an axis rather than a league table. Not tappable: a
 * quality level is not an entity, and there is nowhere to navigate to.
 */
export function SleepQualityMix({ distribution }: { distribution: number[] }) {
  const { t } = useTranslation("sleep");
  const total = distribution.reduce((sum, count) => sum + count, 0);

  return (
    <Card variant="soft">
      <CardContent className="gap-3 pt-4 pb-4">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("chart.qualityMix")}
        </Text>
        {total === 0 ? (
          // Kept, unlike check-in's distribution, which its screen simply omits
          // at zero. That one rides a range the user chose; this one is a fixed
          // last-30-days, so a user whose nights are all older than the window
          // would otherwise meet five hairlines and five zeros with no way to
          // tell that from "the app lost my sleep".
          <Text variant="muted" className="text-sm">
            {t("chart.empty")}
          </Text>
        ) : (
          <BarChart
            barAreaHeight={BAR_AREA}
            // A level with no nights keeps its word and its 0, drawn as a 1px
            // hairline on the baseline — #691's "absence is transparent plus a
            // hairline", not a faint tint that would read as a small value. The
            // hairline is not carrying the count; the printed 0 is.
            zeroHeight={1}
            // Measured at 10px Noto Sans against the column width this chart
            // actually gets — 360dp less the screen's p-4 (32), the card's px-6
            // (48) and four gaps. At the primitive's default gap-2 that is
            // 49.6dp, which `Excellent` (41.7) and `Отлично` (42.0) clear but
            // 320dp phones do not: 41.6dp would break both mid-word. gap-1 buys
            // 52.8dp at 360 and 44.8dp at 320, so no word ever breaks.
            className="gap-1"
            // Which leaves exactly one label too wide for its column: Bulgarian
            // `Много лошо` at 60.7, wrapping at its space into 31.4 + 27.8. It
            // is the only wrap in either shipped locale — every English label
            // fits on one line, `Very poor` widest at 45.6. Reserving two lines
            // on ALL five keeps the bars on one baseline; without it that single
            // column's bar area lifts 13px above its neighbours. min-height
            // rather than height so a longer future translation misaligns
            // visibly instead of silently clipping its second line.
            labelClassName="w-full min-h-[26px] text-center leading-[13px]"
            bars={distribution.map((count, index) => {
              const quality = index + 1;
              const word = t(`quality.${quality}` as Parameters<typeof t>[0]);
              return {
                key: quality,
                value: count,
                topLabel: String(count),
                label: word,
                tintClass: count === 0 ? "bg-border" : "bg-primary",
                accessibilityLabel: t("chart.qualityColumn", { level: word, count }),
              };
            })}
          />
        )}
      </CardContent>
    </Card>
  );
}
