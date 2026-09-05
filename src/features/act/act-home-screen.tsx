import { type Href } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ScrollView, View } from "react-native";
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
import { ShowAllLink } from "@/src/components/app/show-all-link";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { ActInfo } from "@/src/components/app/act-onboarding-modal";
import { ActProgramCard } from "@/src/components/app/act-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { DefusionLogRow } from "@/src/features/act/defusion-log-row";
import {
  useChoicePointCount,
  useCommittedActionCount,
  useDefusionLogCount,
  useDefusionLogs,
} from "@/src/features/act/queries";
import { useActProgram } from "@/src/features/act/use-act-program";
import { useSession } from "@/src/providers/session-provider";

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
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("act");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: defusionLogs } = useDefusionLogs(userId, 50);
  const recentLogs = defusionLogs?.slice(0, 3) ?? [];

  // Head counts, never `list.length` - see `countRows` for why a client-side count of
  // either list reads back a wrong, too-small number (#1378).
  const { data: choicePointCount } = useChoicePointCount(userId);
  const { data: defusionCount } = useDefusionLogCount(userId);
  // Every status, not just the active ones: an active-only count falls 1 → 0 when
  // someone completes their only action, and a counter that goes down on success reads
  // as punishment for finishing.
  const { data: committedActionCount } = useCommittedActionCount(userId);

  // Zero is an honest value for a head count, so all three always render - a brand-new
  // account sees three zeroes rather than an empty header.
  //
  // ☠️ An unresolved count is NOT zero. `?? 0` in the value would tell a user with 200
  // choice points they had none for as long as the query was in flight - the same
  // history-looks-smaller lie the head counts exist to prevent. It renders an em dash
  // until it knows, as gratitude's header does; only the label falls back to 0, because
  // it needs some count to pluralise against and the plural form is the right guess.
  //
  // The number stays in `value` and the noun in a count-pluralised `label` (#749's
  // pattern B), which is also what keeps the stat-shape guard green.
  const statValue = (count: number | undefined) =>
    count === undefined ? t("home.statLoadingValue") : String(count);

  const stats = [
    {
      value: statValue(choicePointCount),
      label: t("home.statChoicePoints", { count: choicePointCount ?? 0 }),
    },
    {
      value: statValue(defusionCount),
      label: t("home.statDefusion", { count: defusionCount ?? 0 }),
    },
    {
      value: statValue(committedActionCount),
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

            {/* Framework.

                ⚠️ This heading stays at level 2 on purpose. #1378 asks for "every section
                heading … with a level-3 role", but it is the ROLE-LESS one that ticket is
                about: this is already a real heading, and it introduces the four pillars
                below it. Flattening it to 3 would put it on a level with the section it
                contains and leave the page with no outline structure at all - the opposite
                of what the ticket wants. The outline reads h1 → h2 → h3. */}
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
                    if (tool?.route) pushWithOrigin(tool.route);
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
                  <ShowAllLink label={t("home.viewAllDefusion")} route="/modules/act/defusion" />
                ) : null
              }
            >
              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.noDefusionLogs")}</Text>
              ) : (
                <View>
                  {recentLogs.map((log) => (
                    <DefusionLogRow
                      key={log.id}
                      log={log}
                      onPress={() =>
                        pushWithOrigin({
                          pathname: "/modules/act/defusion/[id]",
                          params: { id: log.id },
                        })
                      }
                    />
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
