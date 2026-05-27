import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { HelpSheet } from "@/src/components/app/help-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { breathingPatterns } from "@/src/constants/breathing";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import { useSession } from "@/src/providers/session-provider";

export default function BreathingScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useBreathingSessions(user?.id ?? null, 7);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <ModuleHomeHeader
            addWidgetCategory="breathing"
            title={t("breathing.title")}
            hue="aqua"
            icon="air"
            description={t("breathing.description")}
            actions={[
              { type: "notifications", targetKey: "breathing" },
              { type: "info", onPress: () => setHelpOpen(true) },
            ]}
            meta={
              <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                <Text variant="muted" className="text-xs">
                  <Text className="text-xs font-bold text-aqua">
                    {t("breathing.hero.patterns", { count: breathingPatterns.length })}
                  </Text>
                </Text>
                <Text variant="muted" className="text-xs">
                  <Text className="text-xs font-bold text-aqua">
                    {t("breathing.hero.recentSessions", { count: (sessions ?? []).length })}
                  </Text>
                </Text>
              </View>
            }
          />
          <HelpSheet helpKey="breathing" visible={helpOpen} onDismiss={() => setHelpOpen(false)} />

          {sessions && sessions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("mindfulness.streakTitle")}</CardTitle>
                <CardDescription>
                  {t("breathing.recentCount", { count: sessions.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-1">
                  {sessions.slice(0, 3).map((s) => (
                    <Text key={s.id} variant="muted" className="text-sm">
                      • {t(`breathing.exercises.${s.exerciseName}.title`)} ·{" "}
                      {t("breathing.minutes", { value: s.durationMinutes })}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          <View className="gap-3">
            <Text variant="h3">{t("breathing.choose")}</Text>
            {breathingPatterns.map((pattern) => (
              <AccessibleCardLink
                key={pattern.slug}
                title={t(`breathing.exercises.${pattern.slug}.title`)}
                description={t(`breathing.exercises.${pattern.slug}.shortDescription`)}
                onPress={() => router.push(`/tools/breathing/${pattern.slug}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
