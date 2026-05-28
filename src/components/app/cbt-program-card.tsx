import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { HelpButton } from "@/src/components/app/help-button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { tintStripeColors } from "@/src/features/mindfulness/exercise-hue";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type TriggerRef,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import type { CbtProgramView, ProgramTaskView } from "@/src/features/cbt/derive-program";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface CbtProgramCardProps {
  program: CbtProgramView;
  isPending?: boolean;
  onStart: () => void;
  onAdvance: () => void;
  onAbandon?: () => void;
  onDismissStart?: () => void;
}

function TaskRow({ task }: { task: ProgramTaskView }) {
  const { t } = useTranslation("cbt");
  const label = t(task.labelKey);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(task.route)}
      className={
        task.done
          ? "flex-row items-center gap-3 rounded-lg border border-[hsl(var(--think)/0.25)] bg-[hsl(var(--think)/0.10)] p-3 active:bg-accent/40"
          : "flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-accent/40"
      }
      role="button"
    >
      <Icon
        name={task.done ? "check-circle" : "radio-button-unchecked"}
        className={task.done ? "size-5 text-think" : "size-5 text-muted-foreground"}
      />
      <Text className="flex-1 text-sm font-medium">{label}</Text>
      <Text variant="muted" className="text-xs">
        {task.current}/{task.target}
      </Text>
    </Pressable>
  );
}

export function CbtProgramCard({
  program,
  isPending = false,
  onStart,
  onAdvance,
  onAbandon,
  onDismissStart,
}: CbtProgramCardProps) {
  const { t } = useTranslation("cbt");
  const isDark = useAppColorScheme() === "dark";
  const [showEarlyAdvanceConfirm, setShowEarlyAdvanceConfirm] = useState(false);
  const triggerRef = useRef<TriggerRef>(null);

  // Graduated: the home screen shows ProgramGraduation separately
  if (program.status === "graduated") return null;

  // Not started: show the start card
  if (program.status === "not_started") {
    return (
      <View className="gap-3 rounded-2xl border border-think/30 bg-think/5 p-5">
        <View className="flex-row items-start gap-3">
          <Text variant="h3" className="flex-1 text-think">
            {t("program.startTitle")}
          </Text>
          <HelpButton helpKey="program" size={18} />
          {onDismissStart ? (
            <Pressable
              accessibilityLabel={t("program.dismissStartLabel")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onDismissStart}
              className="-mr-2 -mt-2 size-9 items-center justify-center rounded-full active:bg-think/10"
              role="button"
            >
              <Icon name="close" className="size-5 text-think" />
            </Pressable>
          ) : null}
        </View>
        <Text variant="muted">{t("program.startDescription")}</Text>
        <Button disabled={isPending} onPress={onStart}>
          <Text>{t("program.startCta")}</Text>
        </Button>
      </View>
    );
  }

  // In progress
  const { phase } = program;
  if (!phase) return null;

  const advanceCta = program.isLastPhase ? t("program.graduateCta") : t("program.advance");

  function handleAdvancePress() {
    if (program.phaseReady) {
      onAdvance();
    } else {
      setShowEarlyAdvanceConfirm(true);
    }
  }

  function handleEarlyAdvanceConfirm() {
    setShowEarlyAdvanceConfirm(false);
    onAdvance();
  }

  return (
    <>
      <ConfirmDialog
        visible={showEarlyAdvanceConfirm}
        isPending={false}
        title={t("program.advanceEarlyConfirmTitle")}
        message={t("program.advanceEarlyConfirmBody")}
        confirmLabel={t("program.advanceConfirm")}
        cancelLabel={t("program.advanceCancel")}
        onCancel={() => setShowEarlyAdvanceConfirm(false)}
        onConfirm={handleEarlyAdvanceConfirm}
        destructive={false}
      />

      <Card className="relative overflow-hidden gap-3 p-5">
        <LinearGradient
          colors={tintStripeColors("think", isDark)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3 }}
        />
        {/* Header */}
        <View className="gap-2">
          {/* Eyebrow row: route-icon glyph + uppercase label */}
          <View className="flex-row items-center gap-3">
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              className="h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[hsl(var(--think)/0.30)] bg-[hsl(var(--think)/0.12)]"
            >
              <Icon name="route" size={22} className="text-think" />
            </View>
            <Text variant="eyebrow" tint="think" className="flex-1">
              {t("program.heroTitle")}
            </Text>
            {onAbandon ? (
              <Popover>
                <PopoverTrigger asChild ref={triggerRef}>
                  <Pressable
                    accessibilityLabel={t("program.manageLabel")}
                    accessibilityRole="button"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    className="-mr-1 size-8 items-center justify-center rounded-full active:bg-think/10"
                    role="button"
                  >
                    <Icon name="settings" size={18} className="text-muted-foreground" />
                  </Pressable>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" className="w-52 p-1">
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => {
                      triggerRef.current?.close();
                      onAbandon();
                    }}
                    className="flex-row items-center gap-3 rounded-sm px-3 py-2 active:bg-accent"
                    role="button"
                  >
                    <Icon name="warning" className="size-4 text-destructive" />
                    <Text className="text-sm text-destructive">{t("program.abandon")}</Text>
                  </Pressable>
                </PopoverContent>
              </Popover>
            ) : null}
            <HelpButton helpKey="program" size={18} />
          </View>
          {/* Title row */}
          <View className="flex-row flex-wrap items-baseline gap-2">
            <Text variant="h3" className="text-think">
              {t(phase.themeLabelKey)}
            </Text>
            {phase.themeSubKey ? (
              <Text variant="muted" className="text-sm">
                · {t(phase.themeSubKey)}
              </Text>
            ) : null}
          </View>
          {phase.themeDescKey ? (
            <Text variant="muted" className="text-sm leading-5">
              {t(phase.themeDescKey)}
            </Text>
          ) : null}
        </View>

        {/* Milestones section */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-muted-foreground">
            {t("program.milestonesLabel")}
          </Text>
          {phase.milestones.map((milestone) => (
            <TaskRow key={milestone.key} task={milestone} />
          ))}
        </View>

        {/* Daily practice section */}
        {phase.dailyPractice ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground">
              {t("program.practiceLabel")}
            </Text>
            <TaskRow task={phase.dailyPractice} />
          </View>
        ) : (
          <Text variant="muted" className="text-sm">
            {t("program.noDailyPractice")}
          </Text>
        )}

        {/* Ready banner */}
        {program.phaseReady ? (
          <View className="rounded-lg border border-think/40 bg-think/10 px-4 py-3">
            <Text className="text-sm font-medium text-think">{t("program.ready")}</Text>
          </View>
        ) : null}

        {/* Advance button */}
        <Button onPress={handleAdvancePress} disabled={isPending} variant="tinted" tint="think">
          <Text>{advanceCta}</Text>
        </Button>
      </Card>
    </>
  );
}
