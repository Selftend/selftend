import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { HelpButton } from "@/src/components/app/help-button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type TriggerRef,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import type { ProgramTaskView } from "@/src/features/cbt/derive-program";
import type { HelpKey } from "@/src/features/help/help-content";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

// Structural shape shared by CbtProgramView and ActProgramView.
type ProgramView = {
  status: "not_started" | "in_progress" | "graduated";
  weeks: {
    key: string;
    themeLabelKey: string;
    tasks: ProgramTaskView[];
  }[];
  currentWeekIndex: number;
  totalWeeks: number;
  weeksComplete: number;
};

interface ProgramHeroProps {
  isPending?: boolean;
  program: ProgramView;
  namespace?: string;
  onAbandon?: () => void;
  onDismissStart?: () => void;
  onStart: () => void;
}

function TaskRow({ task, namespace }: { task: ProgramTaskView; namespace: string }) {
  const { t } = useTranslation(namespace);
  const label = t(task.labelKey);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(task.route)}
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-accent/40"
      role="button"
    >
      <Icon
        name={task.done ? "check-circle" : "radio-button-unchecked"}
        className={task.done ? "size-5 text-act" : "size-5 text-muted-foreground"}
      />
      <Text className="flex-1 text-sm font-medium">{label}</Text>
      <Text variant="muted" className="text-xs">
        {task.current}/{task.target}
      </Text>
    </Pressable>
  );
}

export function ProgramHero({
  isPending = false,
  program,
  namespace = "cbt",
  onAbandon,
  onDismissStart,
  onStart,
}: ProgramHeroProps) {
  const { t } = useTranslation(namespace);
  const [showOthers, setShowOthers] = useState(false);
  const programHelpKey: HelpKey = namespace === "act" ? "actProgram" : "program";
  const triggerRef = useRef<TriggerRef>(null);

  if (program.status === "graduated") return null;

  if (program.status === "not_started") {
    return (
      <View className="gap-3 rounded-2xl border border-act/30 bg-act/5 p-5">
        <View className="flex-row items-start gap-3">
          <Text variant="h3" className="flex-1 text-act">
            {t("program.startTitle")}
          </Text>
          <HelpButton helpKey={programHelpKey} size={18} />
          {onDismissStart ? (
            <Pressable
              accessibilityLabel={t("program.dismissStartLabel")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onDismissStart}
              className="-mr-2 -mt-2 size-9 items-center justify-center rounded-full active:bg-act/10"
              role="button"
            >
              <Icon name="close" className="size-5 text-act" />
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

  const current = program.weeks[program.currentWeekIndex];
  const otherWeeks = program.weeks.filter((_, i) => i !== program.currentWeekIndex);
  const doneCount = current.tasks.filter((task) => task.done).length;

  return (
    <View className="gap-3 rounded-2xl border border-act/30 bg-act/5 p-5">
      <View className="gap-1">
        <View className="flex-row items-start gap-2">
          <Text variant="h3" className="flex-1 text-act">
            {t("program.heroTitle")} - {t(current.themeLabelKey)}
          </Text>
          {onAbandon ? (
            <Popover>
              <PopoverTrigger asChild ref={triggerRef}>
                <Pressable
                  accessibilityLabel={t("program.manageLabel")}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  className="-mr-1 -mt-1 size-8 items-center justify-center rounded-full active:bg-act/10"
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
          <HelpButton helpKey={programHelpKey} size={18} />
        </View>
        <Text variant="muted" className="text-sm">
          {t("program.weekProgress", {
            current: program.currentWeekIndex + 1,
            total: program.totalWeeks,
          })}
          {" - "}
          {t("program.weekTasksDone", { done: doneCount, total: current.tasks.length })}
        </Text>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-2 rounded-full bg-act"
          style={{ width: `${(program.weeksComplete / program.totalWeeks) * 100}%` }}
        />
      </View>

      <View className="gap-2">
        {current.tasks.map((task) => (
          <TaskRow key={task.key} task={task} namespace={namespace} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => setShowOthers((prev) => !prev)}
        className="flex-row items-center gap-2"
        role="button"
      >
        <Icon
          name={showOthers ? "expand-less" : "expand-more"}
          className="size-5 text-muted-foreground"
        />
        <Text variant="muted" className="text-sm">
          {t("program.otherWeeks")}
        </Text>
      </Pressable>

      {showOthers ? (
        <View className="gap-2">
          {otherWeeks.map((week) => (
            <View key={week.key} className="gap-2 rounded-lg border border-border p-3">
              <Text className="text-sm font-semibold">{t(week.themeLabelKey)}</Text>
              {week.tasks.map((task) => (
                <TaskRow key={task.key} task={task} namespace={namespace} />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
