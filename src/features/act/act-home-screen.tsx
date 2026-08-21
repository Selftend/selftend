import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { PillarCard } from "@/src/components/app/pillar-card";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { Section } from "@/src/components/app/section";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { ActInfo } from "@/src/components/app/act-onboarding-modal";
import { ActProgramCard } from "@/src/components/app/act-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import {
  useChoicePointCount,
  useCommittedActionCount,
  useDefusionLogCount,
  useDefusionLogs,
} from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useLocaleFormats } from "@/src/lib/locale-format";

interface PillarTool {
  key: string;
  route: Href;
  icon: MaterialIconName;
  nameKey: string;
  descKey: string;
}

interface PillarDef {
  key: "foundation" | "bePresent" | "openUp" | "doWhatMatters";
  tools: PillarTool[];
}

// Pillar cards read their copy (title/sub/description) from the canonical
// `pillars` i18n block. The program also reads from `pillars`, not vice-versa.
// `pillars` also holds the badge letter plus the Foundation tool labels (choicePoint/dropAnchor).
const PILLARS: PillarDef[] = [
  {
    key: "foundation",
    tools: [
      {
        key: "choicePoint",
        route: "/modules/act/choice-point",
        icon: "alt-route",
        nameKey: "pillars.foundation.choicePoint.name",
        descKey: "pillars.foundation.choicePoint.desc",
      },
      {
        key: "dropAnchor",
        route: "/modules/act/connection/drop-anchor",
        icon: "anchor",
        nameKey: "pillars.foundation.dropAnchor.name",
        descKey: "pillars.foundation.dropAnchor.desc",
      },
    ],
  },
  {
    key: "bePresent",
    tools: [
      {
        key: "connection",
        route: "/modules/act/connection",
        icon: "radio-button-checked",
        nameKey: "principles.connection.name",
        descKey: "principles.connection.desc",
      },
      {
        key: "observingSelf",
        route: "/modules/act/observing-self",
        icon: "visibility",
        nameKey: "principles.observingSelf.name",
        descKey: "principles.observingSelf.desc",
      },
    ],
  },
  {
    key: "openUp",
    tools: [
      {
        key: "defusion",
        route: "/modules/act/defusion",
        icon: "filter-drama",
        nameKey: "principles.defusion.name",
        descKey: "principles.defusion.desc",
      },
      {
        key: "expansion",
        route: "/modules/act/expansion",
        icon: "open-in-full",
        nameKey: "principles.expansion.name",
        descKey: "principles.expansion.desc",
      },
    ],
  },
  {
    key: "doWhatMatters",
    tools: [
      {
        key: "values",
        route: "/modules/act/values",
        icon: "explore",
        nameKey: "principles.values.name",
        descKey: "principles.values.desc",
      },
      {
        key: "committedAction",
        route: "/modules/act/committed-action",
        icon: "directions-run",
        nameKey: "principles.committedAction.name",
        descKey: "principles.committedAction.desc",
      },
    ],
  },
];

export default function ActHomeScreen() {
  const { t } = useTranslation("act");
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: defusionLogs } = useDefusionLogs(userId, 50);
  const recentLogs = defusionLogs?.slice(0, 3) ?? [];

  // ☠️ Head counts, never `list.length`. `useChoicePoints` keeps its limit OUT of its
  // query key, so a client count shares the list screen's cache entry and renders 30;
  // the defusion list above is capped at 50, so a length read truncates there. Both are
  // wrong in the direction that makes a user's own history look smaller (#1378).
  //
  // Committed actions are counted at EVERY status: the sibling stats are past-tense
  // activity, and an active-only count would fall 1 → 0 when someone completes their
  // only action - a counter that goes down on success.
  const { data: choicePointCount } = useChoicePointCount(userId);
  const { data: defusionCount } = useDefusionLogCount(userId);
  const { data: committedActionCount } = useCommittedActionCount(userId);

  // Zero is an honest value for a head count, so all three always render - including for
  // a brand-new account, and including while a count is still loading. The number stays
  // in `value` and the noun in a count-pluralised `label` (#749's pattern B), which is
  // also what keeps the stat-shape guard green.
  const stats = [
    {
      value: String(choicePointCount ?? 0),
      label: t("home.statChoicePoints", { count: choicePointCount ?? 0 }),
    },
    {
      value: String(defusionCount ?? 0),
      label: t("home.statDefusion", { count: defusionCount ?? 0 }),
    },
    {
      value: String(committedActionCount ?? 0),
      label: t("home.statActions", { count: committedActionCount ?? 0 }),
    },
  ];

  const {
    program,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    advancePhase,
    dismissGraduation,
    promptDismissedAt,
    graduationDismissedAt,
    isUpdating,
  } = useActProgram(user?.id ?? null);

  const [forceInfo, setForceInfo] = useState(false);
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
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              addWidgetCategory="act"
              title={t("home.fullTitle")}
              tourScope="act"
              description={t("home.description")}
              stats={stats}
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
            {program.status === "graduated" ? (
              <ProgramGraduation
                namespace="act"
                lines={[
                  t("program.statChoicePoints", { count: program.summaryStats.choicePoints }),
                  t("program.statDefusion", { count: program.summaryStats.defusionLogs }),
                  t("program.statExpansion", { count: program.summaryStats.expansionLogs }),
                  t("program.statActions", { count: program.summaryStats.committedActions }),
                ]}
                dismissed={graduationDismissedAt != null}
                onDismiss={dismissGraduation}
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

            {/* Framework */}
            <View className="gap-6">
              <View>
                <Text variant="h2" className="text-xl font-bold tracking-tight">
                  {t("home.frameworkTitle")}
                </Text>
                <Text variant="muted" className="mt-1 text-sm leading-snug max-w-[60ch]">
                  {t("home.frameworkDescription")}
                </Text>
              </View>
              {PILLARS.map((pillar) => (
                <PillarCard
                  key={pillar.key}
                  letter={t(`pillars.${pillar.key}.letter`)}
                  title={t(`pillars.${pillar.key}.title`)}
                  kicker={t(`pillars.${pillar.key}.sub`)}
                  description={t(`pillars.${pillar.key}.description`)}
                  onToolPress={(toolKey) => {
                    const tool = pillar.tools.find((x) => x.key === toolKey);
                    if (tool?.route) router.push(tool.route);
                  }}
                >
                  {pillar.tools.map((tool) => (
                    <PillarCard.Tool
                      key={tool.key}
                      toolKey={tool.key}
                      icon={tool.icon}
                      name={t(tool.nameKey)}
                      desc={t(tool.descKey)}
                    />
                  ))}
                </PillarCard>
              ))}
            </View>

            {/* Recent defusion logs. The heading was a plain 14px text node with no role
                at all, so this page had no outline for a screen reader to navigate by;
                `Section` carries the same quiet eyebrow as a real level-3 heading (#1378). */}
            <Section
              ruled={false}
              className="gap-3 py-0"
              title={t("home.recentDefusionTitle")}
              action={
                defusionLogs && defusionLogs.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/modules/act/defusion")}
                  >
                    <Text className="text-sm text-foreground">{t("home.viewAllDefusion")}</Text>
                  </Pressable>
                ) : null
              }
            >
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
                        {formatDateTime(log.createdAt)}
                        {log.fusionLevelBefore !== null && log.fusionLevelAfter !== null
                          ? `  ·  ${log.fusionLevelBefore} → ${log.fusionLevelAfter}`
                          : null}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Section>

            <CrisisSupportCallout />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
