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
import { useColorSchemeName } from "@/src/lib/color-scheme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type TriggerRef,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import type { HelpKey } from "@/src/features/help/help-content";
import type { ProgramStatus, ProgramTaskView } from "@/src/features/modules/program-types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

type ProgramCardView = {
  status: ProgramStatus;
  isLastPhase: boolean;
  phaseReady: boolean;
  phase: {
    themeLabelKey: string;
    themeSubKey?: string;
    themeDescKey?: string;
    milestones: ProgramTaskView[];
    dailyPractice: ProgramTaskView | null;
  } | null;
};

// One programme card, one colour (#587).
//
// This map used to hold two entries, `act` and `primary`, and they were the same
// eleven class strings with the hue swapped - a green ACT programme card and a
// violet CBT one. That is module identity by colour, which the ruling on #558
// replaces with icon and label, and it was the loudest survivor of the batch:
// the ACT card renders on the ACT home directly beside pillar cards this same
// change made neutral.
//
// Collapsing it needed no new classes. The `primary` row was already the neutral
// form - the app accent rather than a module's hue - so what is left below is
// that row, unchanged, and the `act` twin is gone. Its contrast argument carries
// over verbatim because the surface did not move.
const ACCENT_CLASSES = {
  startContainer: "gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5",
  startTitle: "flex-1 text-primary",
  dismissActive: "-mr-2 -mt-2 size-9 items-center justify-center rounded-full active:bg-primary/10",
  dismissIcon: "size-5 text-primary",
  eyebrowGlyphBox:
    "h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[hsl(var(--primary)/0.30)] bg-[hsl(var(--primary)/0.12)]",
  routeIcon: "text-primary",
  manageActive: "-mr-1 size-8 items-center justify-center rounded-full active:bg-primary/10",
  phaseTitle: "text-primary",
  readyBanner: "rounded-lg border border-primary/40 bg-primary/10 px-4 py-3",
  // 14px on a `primary/10` wash inside a `primary/5` container reads 4.13:1 with
  // the raw accent, so it takes the ink `primary` gained in #421 §3. The `act`
  // twin this replaces made the same move in #403 for the same reason.
  readyText: "text-sm font-medium text-primary-ink",
  taskRowDone:
    "flex-row items-center gap-3 rounded-lg border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.10)] p-3 active:bg-accent/40",
  taskRowDoneIcon: "size-5 text-primary",
};

/**
 * The stripe and the eyebrow take the app accent, not a module hue. Spelled
 * `"primary"` at each call site rather than hoisted to a constant, so the static
 * gate can see the argument - see pillar-card.tsx for the miss that taught this.
 */

function TaskRow({ task, ns }: { task: ProgramTaskView; ns: string }) {
  const { t } = useTranslation(ns);
  const label = t(task.labelKey);
  // A program task can sit outside its own module - CBT's programme sends the user
  // to `/tools/check-in/new`, whose Up climbs to `/tools` - so the row records
  // where it left from (#1265, O3). An on-trail task records too and costs
  // nothing: the off-trail test runs at the destination, and leaving the
  // judgement to each call site is what makes an Origin rule fail invisibly.
  const pushWithOrigin = usePushWithOrigin();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => pushWithOrigin(task.route)}
      className={
        task.done
          ? ACCENT_CLASSES.taskRowDone
          : "flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-accent/40"
      }
      role="button"
    >
      <Icon
        name={task.done ? "check-circle" : "radio-button-unchecked"}
        className={task.done ? ACCENT_CLASSES.taskRowDoneIcon : "size-5 text-muted-foreground"}
      />
      <Text className="flex-1 text-sm font-medium">{label}</Text>
      <Text variant="muted" className="text-xs">
        {task.current}/{task.target}
      </Text>
    </Pressable>
  );
}

interface ProgramCardProps {
  program: ProgramCardView;
  ns: string;
  helpKey: HelpKey;
  isPending?: boolean;
  onStart: () => void;
  onAdvance: () => void;
  onAbandon?: () => void;
  onDismissStart?: () => void;
}

export function ProgramCard({
  program,
  ns,
  helpKey,
  isPending = false,
  onStart,
  onAdvance,
  onAbandon,
  onDismissStart,
}: ProgramCardProps) {
  const { t } = useTranslation(ns);
  const isDark = useColorSchemeName() === "dark";
  const [showEarlyAdvanceConfirm, setShowEarlyAdvanceConfirm] = useState(false);
  const triggerRef = useRef<TriggerRef>(null);

  // Graduated: the home screen shows ProgramGraduation separately
  if (program.status === "graduated") return null;

  // Not started: show the start card
  if (program.status === "not_started") {
    return (
      <View className={ACCENT_CLASSES.startContainer}>
        <View className="flex-row items-start gap-3">
          <Text variant="h3" className={ACCENT_CLASSES.startTitle}>
            {t("program.startTitle")}
          </Text>
          <HelpButton helpKey={helpKey} size={18} />
          {onDismissStart ? (
            <Pressable
              accessibilityLabel={t("program.dismissStartLabel")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onDismissStart}
              className={ACCENT_CLASSES.dismissActive}
              role="button"
            >
              <Icon name="close" className={ACCENT_CLASSES.dismissIcon} />
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
          colors={tintStripeColors("primary", isDark)}
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
              className={ACCENT_CLASSES.eyebrowGlyphBox}
            >
              <Icon name="route" size={22} className={ACCENT_CLASSES.routeIcon} />
            </View>
            <Text variant="eyebrow" className="flex-1">
              {t("program.heroTitle")}
            </Text>
            {onAbandon ? (
              <Popover>
                <PopoverTrigger asChild ref={triggerRef}>
                  <Pressable
                    accessibilityLabel={t("program.manageLabel")}
                    accessibilityRole="button"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    className={ACCENT_CLASSES.manageActive}
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
            <HelpButton helpKey={helpKey} size={18} />
          </View>
          {/* Title row */}
          <View className="flex-row flex-wrap items-baseline gap-2">
            <Text variant="h3" className={ACCENT_CLASSES.phaseTitle}>
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
            <TaskRow key={milestone.key} task={milestone} ns={ns} />
          ))}
        </View>

        {/* Daily practice section */}
        {phase.dailyPractice ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted-foreground">
              {t("program.practiceLabel")}
            </Text>
            <TaskRow task={phase.dailyPractice} ns={ns} />
          </View>
        ) : (
          <Text variant="muted" className="text-sm">
            {t("program.noDailyPractice")}
          </Text>
        )}

        {/* Ready banner */}
        {program.phaseReady ? (
          <View className={ACCENT_CLASSES.readyBanner}>
            <Text className={ACCENT_CLASSES.readyText}>{t("program.ready")}</Text>
          </View>
        ) : null}

        {/* Advance button */}
        <Button onPress={handleAdvancePress} disabled={isPending} variant="tinted">
          <Text>{advanceCta}</Text>
        </Button>
      </Card>
    </>
  );
}
