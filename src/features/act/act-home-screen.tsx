import { router, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { PillarCard } from "@/src/components/app/pillar-card";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ContentSheet } from "@/src/components/app/content-sheet";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { ActInfo } from "@/src/components/app/act-onboarding-modal";
import { ActProgramCard } from "@/src/components/app/act-program-card";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { useDefusionLogs } from "@/src/features/act/queries";
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
  const roomStyle = useRoomStyle("act");
  // Scroll position feeding the field parallax (#492).
  const scrollY = useSharedValue(0);
  const onFieldScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const { t } = useTranslation("act");
  const { formatDateTime } = useLocaleFormats();
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
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <AnimatedScrollView
          contentContainerClassName="grow p-4"
          onScroll={onFieldScroll}
          scrollEventThrottle={16}
        >
          {/* The field + sheet escape the scroll padding so the act field runs
              edge to edge (Wave C homes-get-fields, #493); the sheet re-adds
              the inset for its sections. */}
          <View className="-mx-4 -mt-4">
            <ModuleHomeHeader
              variant="field"
              fieldParallax={scrollY}
              addWidgetCategory="act"
              hue="act"
              icon="explore"
              moduleLabel={t("common:beta")}
              title={t("home.fullTitle")}
              tourScope="act"
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
            <ContentSheet className="px-4">
              <View className="gap-6">
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
                    onDismissStart={
                      program.status === "not_started" ? dismissProgramPrompt : undefined
                    }
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
                      tint="act"
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
                        <Text className="text-sm text-act-ink">{t("home.viewAllDefusion")}</Text>
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
                            {formatDateTime(log.createdAt)}
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
            </ContentSheet>
          </View>
        </AnimatedScrollView>
      </SafeAreaView>
    </>
  );
}
