import { useId, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { DetailRow } from "@/src/components/app/detail-row";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { STAGES } from "@/src/features/meditation/stages";
import {
  useMeditationProgramState,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useSession } from "@/src/providers/session-provider";

const PHASE_HEADERS: {
  startStage: number;
  titleKey: string;
}[] = [
  { startStage: 1, titleKey: "module.stages.phaseNovice" },
  { startStage: 4, titleKey: "module.stages.phaseSkilled" },
  { startStage: 7, titleKey: "module.stages.phaseTransition" },
  { startStage: 8, titleKey: "module.stages.phaseAdept" },
];

const MILESTONE_AFTER: Record<number, string> = {
  3: "module.stages.milestone1Title",
  6: "module.stages.milestone2Title",
  7: "module.stages.milestone3Title",
  10: "module.stages.milestone4Title",
};

/**
 * The ten stages as one readable spine (#787).
 *
 * Ten cards became ten hairline rows that expand where they sit. The screen this
 * replaces made reading a stage a round trip: tap a card, land on a detail
 * screen, come back, tap the next. Comparing two stages - which is most of what
 * this page is for - meant four navigations. The detail screen is gone (#851):
 * everything it held - goal, obstacles, skills, mastery, reflection prompts -
 * renders in the expansion, so the spine is the whole reference.
 *
 * **The stage stays user-declared.** `Set as my current stage` is an explicit
 * button and must not become an inference from sit count or duration. A product
 * that decides which stage a practice has reached is grading it, which is the
 * one thing the ten-stage framework is not for.
 */
export default function MeditationStagesScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: programState } = useMeditationProgramState(userId);
  const upsertProgramState = useUpsertMeditationProgramState(userId);
  const currentStage = programState?.currentStage ?? 1;

  // One open at a time: two expanded stages push the rest of the spine off the
  // screen, and the point of the spine is that it can be read at a glance.
  const [openStage, setOpenStage] = useState<number | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-4">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <View className="gap-2">
            <ScreenHeader title={t("module.stages.title")} />
            {/*
              The drawn subtitle ends "- you are not behind". That clause is cut:
              it is the product advertising its own restraint, which #711 forbids,
              and it is reassurance against a punishment this product does not
              have - naming it plants the idea it exists. The first two clauses
              are the record and they stay.
            */}
            <Text variant="muted">{t("module.stages.subtitle")}</Text>
          </View>

          <View>
            {STAGES.map((stage) => {
              const phaseHeader = PHASE_HEADERS.find((p) => p.startStage === stage.number);
              const milestoneKey = MILESTONE_AFTER[stage.number];
              return (
                <View key={stage.number}>
                  {phaseHeader ? (
                    <Text
                      role="heading"
                      aria-level={2}
                      className="pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      {t(phaseHeader.titleKey as Parameters<typeof t>[0])}
                    </Text>
                  ) : null}

                  <StageRow
                    stage={stage}
                    isCurrent={stage.number === currentStage}
                    expanded={openStage === stage.number}
                    isPending={upsertProgramState.isPending}
                    onToggle={() =>
                      setOpenStage((open) => (open === stage.number ? null : stage.number))
                    }
                    onSetCurrent={() => upsertProgramState.mutate({ currentStage: stage.number })}
                  />

                  {milestoneKey ? (
                    <View className="mt-1.5 flex-row items-center gap-3 rounded-lg bg-muted px-3 py-3">
                      {/*
                        Chrome, not the module hue. The design fills this
                        `iris/0.07` and inks the flag and the text
                        `hsl(var(--iris))`; the wash is far under 3:1 against the
                        background and the ink is the shape #368 measured at
                        3.81:1. A milestone is a fact about the framework, not
                        the module's identity (#588/#691).
                      */}
                      <Icon aria-hidden name="flag" className="size-4 text-muted-foreground" />
                      <Text className="flex-1 text-[12.5px] font-semibold text-foreground">
                        {t(milestoneKey as Parameters<typeof t>[0])}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StageRowProps {
  stage: (typeof STAGES)[number];
  isCurrent: boolean;
  expanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  onSetCurrent: () => void;
}

/**
 * One stage: a numbered disc, its name, a `Where you are` pill when it is the
 * declared stage, and a disclosure chevron.
 *
 * The chevron is a **glyph swap, not a rotation** (#716). The design animates a
 * 200ms rotate; the motion decision admits none, and a rotating chevron is the
 * kind that has to be suppressed again under reduce-motion.
 *
 * Expanded content is **unmounted** when collapsed rather than hidden, matching
 * `Disclosure`: a hidden-but-mounted subtree keeps its button in the tab order,
 * so ten collapsed stages would leave ten invisible `Set as my current stage`
 * buttons for a keyboard user to walk through.
 */
function StageRow({
  stage,
  isCurrent,
  expanded,
  isPending,
  onToggle,
  onSetCurrent,
}: StageRowProps) {
  const { t } = useTranslation("meditation");
  const contentId = useId();

  return (
    <View className="border-t border-border">
      {/*
        No `spaceKeyActivationProps`: React Native Web already activates
        `role="button"` on Space, on key UP, so the helper's keyDown handler
        would toggle twice per press and leave the row exactly as it was.
      */}
      <Pressable
        accessibilityRole="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onToggle}
        className="flex-row items-center gap-4 py-3.5 active:opacity-70"
        role="button"
        testID={`stage-row-${stage.number}`}
      >
        {/*
          Filled for the declared stage, outlined for the rest. That is a
          luminance and shape difference, not a colour one, so it survives
          greyscale and every CVD - the disc carries real state and may not
          rest on hue alone.
        */}
        <View
          className={cn(
            "size-7 shrink-0 items-center justify-center rounded-full border",
            isCurrent ? "border-primary bg-primary" : "border-border bg-card",
          )}
        >
          <Text
            className={cn(
              "text-xs font-bold tabular-nums",
              isCurrent ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {stage.number}
          </Text>
        </View>

        <Text className={cn("flex-1 text-[14.5px]", isCurrent ? "font-semibold" : "font-medium")}>
          {t(stage.shortTitleKey as Parameters<typeof t>[0])}
        </Text>

        {isCurrent ? (
          // Chrome, as the overview's stage badge is (#588): `text-primary-ink`
          // on the neutral wash, never the drawn `iris` on an `iris/0.1` fill.
          <View className="shrink-0 rounded-full bg-muted px-2 py-0.5">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
              {t("module.stages.currentStageBadge")}
            </Text>
          </View>
        ) : null}

        <Icon
          aria-hidden
          name={expanded ? "expand-less" : "expand-more"}
          className="size-5 shrink-0 text-muted-foreground"
        />
      </Pressable>

      {expanded ? (
        <View nativeID={contentId} className="pb-5 pl-11">
          {/*
            `DetailRow`, not a local 78px column. The design draws 78px, which is
            under the same pressure that killed check-in's 110px one: `Obstacles`
            and `bg`'s `Препятствия` wrap against it at 360dp. The shared row
            already stacks its label above its content below the breakpoint and
            only takes a column once there is width for one.
          */}
          <DetailRow label={t("module.stages.goalLabel")}>
            <Text className="text-[14.5px] leading-6">
              {t(stage.goalKey as Parameters<typeof t>[0])}
            </Text>
          </DetailRow>
          <DetailRow label={t("module.stages.obstaclesLabel")}>
            <Text variant="muted" className="text-[14.5px] leading-6">
              {t(stage.obstaclesKey as Parameters<typeof t>[0])}
            </Text>
          </DetailRow>
          <DetailRow label={t("module.stages.masteryLabel")}>
            <Text variant="muted" className="text-[14.5px] leading-6">
              {t(stage.masteryKey as Parameters<typeof t>[0])}
            </Text>
          </DetailRow>
          <DetailRow label={t("module.stages.skillsLabel")}>
            <Text variant="muted" className="text-[14.5px] leading-6">
              {t(stage.skillsKey as Parameters<typeof t>[0])}
            </Text>
          </DetailRow>
          <DetailRow label={t("module.stages.promptsLabel")}>
            <View className="gap-1">
              {stage.reflectionPromptKeys.map((key) => (
                <Text key={key} variant="muted" className="text-[14.5px] leading-6">
                  • {t(key as Parameters<typeof t>[0])}
                </Text>
              ))}
            </View>
          </DetailRow>

          <View className="gap-3 pt-4">
            {isCurrent ? (
              // Present but inert, so the row that is already your stage says so
              // rather than offering an action that would do nothing.
              <Text variant="muted" className="text-[13px] font-semibold">
                {t("module.stages.alreadyCurrent")}
              </Text>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="self-start"
                disabled={isPending}
                onPress={onSetCurrent}
              >
                <Text>{t("module.stages.switchTo")}</Text>
              </Button>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
