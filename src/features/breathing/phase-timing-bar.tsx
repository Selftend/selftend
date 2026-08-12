// The proportional cycle preview shared by session setup (`4b`) and the
// new-pattern editor (`4d`) - one bar per phase, each flexed to its share of
// the cycle, optionally with the phase name and length beneath it.
//
// ⚠️ A zero-length phase COLLAPSES OUT ENTIRELY - no segment, no label, no gap.
// This is the common case, not an edge case: coherent breathing is 5.5 / 0 /
// 5.5 / 0, so two of its four phases do not exist. Rendering them as
// zero-width slivers would leave two hairlines and two empty label columns
// that mean nothing.

import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import type { BreathingPhase } from "@/src/constants/breathing";
import { breathingChipColors } from "@/src/features/breathing/exercise-colors";
import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";
import { cycleSeconds } from "@/src/features/breathing/cycle-math";
import { useColorSchemeName } from "@/src/lib/color-scheme";

/**
 * A phase's weight in the bar. Inhale and exhale carry the pattern's colour at
 * two strengths; the holds are neutral, because a hold is the absence of
 * movement and colouring it the same hue would say it is a third kind of
 * breath.
 */
function segmentAlpha(label: BreathingPhase["label"]): "strong" | "soft" | "neutral" {
  if (label === "inhale") return "strong";
  if (label === "exhale") return "soft";
  return "neutral";
}

export function PhaseTimingBar({
  phases,
  color,
  showLabels = false,
}: {
  phases: BreathingPhase[];
  color: BreathingExerciseColor;
  /** `4b` names each phase under its segment; `4d`'s live preview does not. */
  showLabels?: boolean;
}) {
  const { t } = useTranslation("cbt");
  const scheme = useColorSchemeName();
  const chip = breathingChipColors(color, scheme);

  const active = phases.filter((p) => p.durationSeconds > 0);
  const total = cycleSeconds(active);

  if (active.length === 0 || total <= 0) {
    // Nothing to draw a proportion of. The editor reaches this while the user
    // steps every phase down to zero; the bar goes quiet rather than dividing
    // by zero or rendering four equal segments that imply a pattern.
    return <View testID="breathing-timing-bar-empty" className="h-2.5 rounded-full bg-muted/60" />;
  }

  return (
    <View className="gap-3">
      <View testID="breathing-timing-bar" className="h-2.5 flex-row items-stretch gap-1">
        {active.map((phase, i) => {
          const weight = segmentAlpha(phase.label);
          return (
            <View
              key={`${phase.label}-${i}`}
              // The neutral hold rides a utility class rather than a raw colour
              // literal, so a palette retune reaches it; only the two hue stops
              // need a computed value, and those come from the chip recipe.
              className={weight === "neutral" ? "bg-muted-foreground/25" : undefined}
              style={{
                flexGrow: phase.durationSeconds,
                flexShrink: 1,
                flexBasis: 0,
                borderRadius: 999,
                ...(weight === "strong"
                  ? { backgroundColor: chip.ink }
                  : weight === "soft"
                    ? { backgroundColor: chip.border }
                    : {}),
              }}
            />
          );
        })}
      </View>

      {showLabels ? (
        <View className="flex-row gap-1">
          {active.map((phase, i) => (
            <View
              key={`${phase.label}-${i}`}
              style={{ flexGrow: phase.durationSeconds, flexShrink: 1, flexBasis: 0, minWidth: 0 }}
              className="gap-0.5"
            >
              <Text className="text-[12.5px] font-semibold" numberOfLines={1}>
                {t(`breathing.phases.${phase.label}`)}
              </Text>
              <Text variant="muted" className="text-xs tabular-nums" numberOfLines={1}>
                {t("breathing.builder.seconds", { value: phase.durationSeconds })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The phase counts as they read on an overview row: `4 · 4 · 4 · 4s`, zeros
 * dropped. A plain string rather than a component - the row lays it out.
 */
export function phaseCountsLabel(phases: BreathingPhase[]): string {
  return `${phases
    .filter((p) => p.durationSeconds > 0)
    .map((p) => p.durationSeconds)
    .join(" · ")}s`;
}

/** The pattern's colour as a dot, for the overview's hairline rows. */
export function PatternDot({ color }: { color: BreathingExerciseColor }) {
  const scheme = useColorSchemeName();
  const chip = breathingChipColors(color, scheme);
  return (
    <View
      testID="breathing-pattern-dot"
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: chip.ink }}
    />
  );
}

/**
 * The play glyph that ends a pattern row. Muted, matching the phase-counts
 * caption beside it - the pattern's colour lives in the leading dot alone, so
 * the row states its colour once instead of bracketing itself in it (#925).
 */
export function PatternPlayGlyph() {
  return (
    <Icon
      testID="breathing-pattern-play"
      name="play-arrow"
      size={20}
      className="text-muted-foreground"
    />
  );
}
