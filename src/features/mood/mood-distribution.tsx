import { useTranslation } from "react-i18next";

import { BarChart } from "@/src/components/charts/bar-chart";
import type { MoodDistribution } from "@/src/features/mood/summaries";

interface MoodDistributionChartProps {
  counts: MoodDistribution;
}

/**
 * How many check-ins landed at each of the five levels, over the shared range
 * (#737, decided on #701 and #700).
 *
 * Wraps `charts/bar-chart.tsx` the way `mood-heatmap.tsx` wraps
 * `charts/heatmap.tsx`: the primitive knows about bars, this knows about mood.
 *
 * **Not the design's stacked pill.** #691 made a non-colour ordinal cue
 * mandatory, and a 10px pill separates adjacent levels by colour alone at
 * 1.28-1.51 against each other (1.16-1.25 under deuteranopia). Five columns
 * encode the level three ways instead - position, a printed word, and a printed
 * count - so the chart stays readable in greyscale, which per #691's
 * measurements is the only way this data can be read at all.
 *
 * **Uniform fill, not the ramp.** `bg-primary` is the same token the trend line
 * above resolves to (`useAccentHsl()` reads `--primary`, which a room does NOT
 * re-pour), so the two charts agree. A per-level ramp would encode *identity*,
 * which #691 forbids, and would render level 1 at `RAMP_ALPHAS[0]` ~ 1.26 -
 * making the tallest bar of someone's worst month the faintest thing on screen.
 *
 * **Counts, not percentages.** "33%" from three check-ins claims a precision the
 * data has not earned, and invites evaluative phrasing the guardrails rule out.
 *
 * Columns run 1 -> 5 left to right, matching `MOOD_EMOJI_BY_SCORE` and the
 * picker, so it reads as an axis rather than a league table. Not tappable: a
 * mood level is not an entity, and #696 declined history filters, so there is
 * nowhere to go.
 */
export function MoodDistributionChart({ counts }: MoodDistributionChartProps) {
  const { t } = useTranslation("mood");

  return (
    <BarChart
      barAreaHeight={72}
      // A level with no check-ins keeps its label and its 0, drawn as a 1px
      // hairline on the baseline - #691's "absence is transparent plus a
      // hairline", not a faint tint that would read as a small value.
      zeroHeight={1}
      bars={counts.map((count, index) => {
        const score = index + 1;
        const word = t(`checkin.scaleLabels.${score}`);
        return {
          key: score,
          value: count,
          topLabel: String(count),
          label: word,
          tintClass: count === 0 ? "bg-border" : "bg-primary",
          accessibilityLabel: t("distribution.column", { level: word, count }),
        };
      })}
    />
  );
}
