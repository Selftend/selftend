import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { ACT_PROGRAM } from "@/src/features/act/program-definition";
import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { metaForWidget } from "@/src/features/home/widget-registry";
import { useUserPreferences } from "@/src/features/settings/queries";
import { cn } from "@/lib/utils";

/**
 * A `Guided programmes` card: two lines, pressed whole, with an honest ordinal badge.
 *
 * **No fraction, in any form.** "4 of 12" was drawn, and the denominators are real
 * task-definition counts — but no per-task completion is persisted anywhere, and a
 * task-derived numerator would *fall overnight*, because four of CBT's twelve and four
 * of ACT's ten are daily practices that reset at midnight. A fraction on home is
 * legitimate exactly when the user wrote both numbers; a curriculum the product authored
 * is not that.
 *
 * **No progress bar, in any state.** Measured, a `bg-muted` track on this card's
 * `primary/5` wash reads 1.052:1 light and 1.209:1 dark — under 1.4.11's 3:1 — so at 0%
 * the drawn "Not started" apparatus is an invisible line beside a deficit label.
 *
 * **No task list and no CTA button.** The card presses whole; a button inside a pressable
 * card is two targets for one destination.
 *
 * Data is `useUserPreferences` only. Home no longer calls `program_widget_task_status` at
 * all — the RPC survives for `use-widget-snapshot-sync.ts`, which still renders the task
 * list on the Android launcher widget.
 */
export function ProgramWidget({ module, userId }: { module: "cbt" | "act"; userId: string }) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("navigation");
  const { t: tm } = useTranslation(module);
  const { data: preferences } = useUserPreferences(userId);

  const isCbt = module === "cbt";
  // From the catalogue, not restated here: `WIDGET_META` gained `route` in #972 precisely
  // so a destination lives in one place, and its filesystem test proves the path is served.
  const route = metaForWidget(`${module}-programme`)?.route ?? `/modules/${module}`;
  const startedAt = isCbt ? preferences?.cbtProgramStartedAt : preferences?.actProgramStartedAt;
  const completedAt = isCbt
    ? preferences?.cbtProgramCompletedAt
    : preferences?.actProgramCompletedAt;

  /**
   * ☠️ Gated on `startedAt && !completedAt`, never on `phaseIndex` alone: `abandonProgram`
   * nulls `started_at` but leaves `phase_index` where it was, so a user who quit in phase
   * four would otherwise be met with a cheerful "Phase 5 of 5".
   */
  const running = Boolean(startedAt) && !completedAt;
  const definitions = isCbt ? CBT_PROGRAM : ACT_PROGRAM;
  const phaseIndex = isCbt
    ? (preferences?.cbtProgramPhaseIndex ?? 0)
    : (preferences?.actProgramPhaseIndex ?? 0);
  const phase = definitions[Math.min(Math.max(phaseIndex, 0), definitions.length - 1)];

  const badge = running
    ? t("home.programme.phase", { current: phaseIndex + 1, total: definitions.length })
    : completedAt
      ? t("home.programme.complete")
      : null;

  // The running card names where you are; the other two states describe the module,
  // which collapses "never started" and "abandoned" into one rendering. That is what
  // makes re-pitching a dismissed programme impossible by construction rather than by
  // remembering to check a flag.
  const secondLine =
    running && phase ? tm(phase.themeLabelKey) : t(`home.widgets.${module}Programme.metaDesc`);
  const title = t(`home.widgets.${module}Programme.title`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge}, ${secondLine}` : `${title}, ${secondLine}`}
      testID={`programme-card-${module}`}
      onPress={() => pushWithOrigin(route as Href)}
      className={cn(
        "gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 active:bg-primary/10",
        Platform.select({ web: "hover:bg-primary/[0.08]" }),
      )}
    >
      <View className="flex-row items-center gap-2.5">
        <Icon name="school" className={cn("size-5 shrink-0", CHROME_MARK)} />
        <Text className="min-w-0 flex-1 text-[15px] font-semibold" numberOfLines={1}>
          {title}
        </Text>
        {badge ? (
          <Text
            testID={`programme-badge-${module}`}
            className="shrink-0 text-[12px] font-semibold text-primary-ink"
          >
            {badge}
          </Text>
        ) : null}
        <Icon
          name="chevron-right"
          accessibilityElementsHidden
          importantForAccessibility="no"
          className={cn("size-5 shrink-0", CHROME_MARK)}
        />
      </View>
      <Text variant="muted" testID={`programme-line-${module}`} className="text-[13px]">
        {secondLine}
      </Text>
    </Pressable>
  );
}
