import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { HelpButton } from "@/src/components/app/help-button";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { ActInfo } from "@/src/components/app/act-onboarding-modal";
import { ActProgramCard } from "@/src/components/app/act-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { useDefusionLogs } from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import type { ACTPrinciple } from "@/src/features/act/types";
import type { HelpKey } from "@/src/features/help/help-content";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface PrincipleCard {
  key: ACTPrinciple;
  icon: MaterialIconName;
  route: Href | null;
  helpKey: HelpKey;
}

const PRINCIPLE_CARDS: PrincipleCard[] = [
  { key: "defusion", icon: "filter-drama", route: "/modules/act/defusion", helpKey: "defusion" },
  { key: "expansion", icon: "open-in-full", route: "/modules/act/expansion", helpKey: "expansion" },
  {
    key: "connection",
    icon: "radio-button-checked",
    route: "/modules/act/connection",
    helpKey: "connection",
  },
  {
    key: "observingSelf",
    icon: "visibility",
    route: "/modules/act/observing-self",
    helpKey: "observingSelf",
  },
  { key: "values", icon: "explore", route: "/modules/act/values", helpKey: "values" },
  {
    key: "committedAction",
    icon: "directions-run",
    route: "/modules/act/committed-action",
    helpKey: "committedAction",
  },
];

export default function ActHomeScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: defusionLogs } = useDefusionLogs(userId, 50);
  const recentLogs = defusionLogs?.slice(0, 3) ?? [];

  const {
    program,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    advancePhase,
    promptDismissedAt,
    isUpdating,
  } = useActProgram(user?.id ?? null);

  const [forceInfo, setForceInfo] = useState(false);
  const [graduationDismissed, setGraduationDismissed] = useState(false);
  const [abandonConfirmVisible, setAbandonConfirmVisible] = useState(false);

  return (
    <>
      <ConfirmDialog
        visible={abandonConfirmVisible}
        isPending={isUpdating}
        title={t("program.abandonTitle")}
        message={t("program.abandonDescription")}
        confirmLabel={t("program.abandonConfirm")}
        cancelLabel={t("program.abandonCancel")}
        onCancel={() => setAbandonConfirmVisible(false)}
        onConfirm={() => {
          abandonProgram();
          setAbandonConfirmVisible(false);
        }}
      />
      <ActInfo
        visible={forceInfo}
        onComplete={() => setForceInfo(false)}
        onDismiss={() => setForceInfo(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                addWidgetCategory="act"
                hue="act"
                icon="explore"
                moduleLabel={null}
                title={t("home.fullTitle")}
                description={t("home.description")}
                actions={[
                  { type: "notifications", targetKey: "act" },
                  ...(program.status === "not_started"
                    ? [
                        {
                          type: "program" as const,
                          onPress: showProgramPrompt,
                          accessibilityLabel: t("program.showPromptLabel"),
                        },
                      ]
                    : []),
                  { type: "info", onPress: () => setForceInfo(true) },
                ]}
              />
              <Text variant="eyebrow" tint="primary">
                {t("module.authorEyebrow")}
              </Text>
            </View>

            {program.status === "graduated" ? (
              <ProgramGraduation
                namespace="act"
                lines={[
                  t("program.statChoicePoints", { count: program.summaryStats.choicePoints }),
                  t("program.statDefusion", { count: program.summaryStats.defusionLogs }),
                  t("program.statExpansion", { count: program.summaryStats.expansionLogs }),
                  t("program.statActions", { count: program.summaryStats.committedActions }),
                ]}
                dismissed={graduationDismissed}
                onDismiss={() => setGraduationDismissed(true)}
                onReplay={replayProgram}
              />
            ) : program.status === "not_started" && promptDismissedAt ? null : (
              <ActProgramCard
                program={program}
                isPending={isUpdating}
                onStart={startProgram}
                onAdvance={advancePhase}
                onDismissStart={program.status === "not_started" ? dismissProgramPrompt : undefined}
                onAbandon={
                  program.status === "in_progress"
                    ? () => setAbandonConfirmVisible(true)
                    : undefined
                }
              />
            )}

            {/* Quick actions */}
            <View className="gap-3">
              <Text variant="h3">{t("home.quickActionsTitle")}</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button onPress={() => router.push("/modules/act/defusion/new")}>
                    <Icon name="filter-drama" className="size-4 text-primary-foreground" />
                    <Text>{t("home.defuseThought")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    variant="secondary"
                    onPress={() => router.push("/tools/mood-tracker/new")}
                  >
                    <Text>{t("home.logMood")}</Text>
                  </Button>
                </View>
              </View>
            </View>

            {/* Six principles */}
            <View className="gap-3">
              <View>
                <Text variant="h2" className="text-xl font-bold tracking-tight">
                  {t("home.principlesTitle")}
                </Text>
                <Text variant="muted" className="mt-1 text-sm leading-snug max-w-[60ch]">
                  {t("home.principlesDescription")}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2.5">
                {PRINCIPLE_CARDS.map((card) => (
                  <PrincipleTile key={card.key} card={card} icon={card.icon} />
                ))}
              </View>
            </View>

            {/* Recent defusion logs */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("home.recentDefusionTitle")}
                </Text>
                {defusionLogs && defusionLogs.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/modules/act/defusion")}
                  >
                    <Text className="text-sm text-act">{t("home.viewAllDefusion")}</Text>
                  </Pressable>
                ) : null}
              </View>

              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.noDefusionLogs")}</Text>
              ) : (
                <View className="gap-2">
                  {recentLogs.map((log) => (
                    <View key={log.id} className="rounded-lg border border-border bg-card p-3">
                      <Text className="font-medium" numberOfLines={2}>
                        {log.fusedThought}
                      </Text>
                      <Text variant="muted" className="mt-1 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                        {log.fusionLevelBefore !== null && log.fusionLevelAfter !== null
                          ? `  ·  ${log.fusionLevelBefore} → ${log.fusionLevelAfter}`
                          : null}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <CrisisSupportCallout />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PrincipleTile({ card, icon }: { card: PrincipleCard; icon: MaterialIconName }) {
  const { t } = useTranslation("act");
  const available = card.route !== null;

  const tileContent = (
    <View
      className={cn(
        "gap-2 rounded-xl border border-border bg-card p-4",
        !available && "opacity-60",
      )}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        className={cn(
          "h-8 w-8 items-center justify-center rounded-lg",
          available ? "bg-act/10" : "bg-muted",
        )}
      >
        <Icon
          name={icon}
          size={18}
          className={cn(available ? "text-act" : "text-muted-foreground")}
        />
      </View>
      <Text className="text-sm font-semibold">{t(`principles.${card.key}.name`)}</Text>
      <Text variant="muted" className="text-xs leading-snug">
        {t(`principles.${card.key}.desc`)}
      </Text>
      {!available ? (
        <Text className="text-xs text-muted-foreground">{t("home.comingSoon")}</Text>
      ) : null}
    </View>
  );

  return (
    <View className="relative basis-[calc(50%-5px)]">
      {available ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(`principles.${card.key}.name`)}
          accessibilityHint={t(`principles.${card.key}.desc`)}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => router.push(card.route!)}
          className="active:opacity-80"
        >
          {tileContent}
        </Pressable>
      ) : (
        tileContent
      )}
      <View className="absolute right-1 top-1">
        <HelpButton helpKey={card.helpKey} size={18} />
      </View>
    </View>
  );
}
