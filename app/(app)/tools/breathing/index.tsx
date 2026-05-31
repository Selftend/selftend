import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HelpSheet } from "@/src/components/app/help-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import {
  Pattern478Diagram,
  PatternBoxDiagram,
  PatternCoherentDiagram,
} from "@/src/features/breathing/pattern-diagrams";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { breathingPatterns } from "@/src/constants/breathing";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

export default function BreathingScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useBreathingSessions(user?.id ?? null, 7);
  const [helpOpen, setHelpOpen] = useState(false);

  const lastSession = sessions && sessions.length > 0 ? sessions[0] : null;
  const recentCount = sessions?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-4">
        <ModuleHomeHeader
          addWidgetCategory="breathing"
          hue="aqua"
          icon="air"
          moduleLabel={null}
          title={t("breathing.title")}
          description={t("breathing.tagline")}
          actions={[
            { type: "notifications", targetKey: "breathing" },
            {
              type: "info",
              onPress: () => setHelpOpen(true),
              accessibilityLabel: t("breathing.helpLabel"),
            },
          ]}
          meta={
            <ToolStats
              accentClassName="text-aqua"
              items={[
                {
                  value: t("breathing.hero.patterns", { count: breathingPatterns.length }),
                  label: "",
                },
                { value: t("breathing.hero.recentSessions", { count: recentCount }), label: "" },
              ]}
            />
          }
        />

        <HelpSheet helpKey="breathing" visible={helpOpen} onDismiss={() => setHelpOpen(false)} />

        {lastSession ? (
          <Card spine="aqua" className="px-5 py-4">
            <Text variant="eyebrow">{t("breathing.recentEyebrow")}</Text>
            <View className="mt-1.5 flex-row items-center justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-sm font-semibold">
                  {t(`breathing.exercises.${lastSession.exerciseName}.title`)}
                </Text>
                <Text variant="muted" className="text-xs">
                  · {t("breathing.minutes", { value: lastSession.durationMinutes })}
                </Text>
              </View>
              <Text variant="muted" className="text-xs">
                {t("breathing.recentCount", { count: sessions!.length })}
              </Text>
            </View>
          </Card>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text variant="h2" className="text-xl font-bold tracking-tight border-0 pb-0">
              {t("breathing.choosePatternTitle")}
            </Text>
            <Text variant="muted" className="text-xs">
              {t("breathing.choosePatternHint")}
            </Text>
          </View>

          <PatternRow
            Diagram={PatternBoxDiagram}
            title={t("breathing.exercises.box-breathing.title")}
            desc={t("breathing.exercises.box-breathing.shortDescription")}
            meta={t("breathing.exercises.box-breathing.meta")}
            onPress={() => router.push("/tools/breathing/box-breathing")}
          />
          <PatternRow
            Diagram={Pattern478Diagram}
            title={t("breathing.exercises.4-7-8.title")}
            desc={t("breathing.exercises.4-7-8.shortDescription")}
            meta={t("breathing.exercises.4-7-8.meta")}
            onPress={() => router.push("/tools/breathing/4-7-8")}
          />
          <PatternRow
            Diagram={PatternCoherentDiagram}
            title={t("breathing.exercises.coherent-breathing.title")}
            desc={t("breathing.exercises.coherent-breathing.shortDescription")}
            meta={t("breathing.exercises.coherent-breathing.meta")}
            onPress={() => router.push("/tools/breathing/coherent-breathing")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PatternRowProps {
  Diagram: React.ComponentType;
  title: string;
  desc: string;
  meta: string;
  onPress: () => void;
}

function PatternRow({ Diagram, title, desc, meta, onPress }: PatternRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-xl border border-border bg-card p-4 active:bg-accent/30"
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        className="h-[72px] w-[88px] items-center justify-center rounded-[10px] bg-[hsl(var(--aqua)/0.06)]"
      >
        <Diagram />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row flex-wrap items-center gap-2.5">
          <Text className="text-[15px] font-semibold tracking-tight">{title}</Text>
          <View className="rounded-full bg-muted/60 px-2 py-0.5">
            <Text variant="muted" className="text-[11px] font-semibold tabular-nums">
              {meta}
            </Text>
          </View>
        </View>
        <Text variant="muted" className="mt-1 text-[13px] leading-snug">
          {desc}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} className="text-muted-foreground" />
    </Pressable>
  );
}
