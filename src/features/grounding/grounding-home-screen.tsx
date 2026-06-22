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
import { TechniqueCard } from "@/src/features/grounding/technique-card";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { ToolStats } from "@/src/components/app/tool-stats";
import { GroundingOnboarding } from "@/src/components/app/grounding-onboarding-modal";
import { groundingTechniques } from "@/src/constants/grounding";
import { useGroundingSessions } from "@/src/features/grounding/queries";
import { useSession } from "@/src/providers/session-provider";

export default function GroundingHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: sessions } = useGroundingSessions(userId, 7);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  return (
    <>
      <GroundingOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-4">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                addWidgetCategory="grounding"
                title={t("grounding.title")}
                hue="clay"
                icon="anchor"
                moduleLabel={null}
                description={t("grounding.description")}
                actions={[
                  { type: "notifications", targetKey: "grounding" },
                  { type: "info", onPress: () => setForceOnboarding(true) },
                ]}
                meta={
                  <ToolStats
                    accentClassName="text-clay"
                    items={[
                      {
                        value: t("grounding.hero.techniques", {
                          count: groundingTechniques.length,
                        }),
                        label: "",
                      },
                      {
                        value: `${t("grounding.hero.takes")} ${t("grounding.hero.takesValue")}`,
                        label: "",
                      },
                    ]}
                  />
                }
              />
            </View>

            {sessions && sessions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("grounding.streakTitle")}</CardTitle>
                  <CardDescription>
                    {t("grounding.recentCount", { count: sessions.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <View className="flex-row flex-wrap gap-2">
                    {sessions.slice(0, 3).map((s) => (
                      <View key={s.id} className="rounded-full bg-muted px-3 py-1.5">
                        <Text variant="muted" className="text-xs">
                          {t(`grounding.techniques.${s.exerciseName}.title`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            <View className="gap-3">
              <Text variant="h3">{t("grounding.choose")}</Text>
              {groundingTechniques.map((technique) => (
                <TechniqueCard
                  key={technique.slug}
                  technique={technique}
                  title={t(`grounding.techniques.${technique.slug}.title`)}
                  description={t(`grounding.techniques.${technique.slug}.shortDescription`)}
                  meta={
                    technique.kind === "senses"
                      ? t("grounding.meta.senses", { count: technique.steps.length })
                      : t("grounding.meta.guided", { count: technique.steps.length })
                  }
                  onPress={() => router.push(`/tools/grounding/${technique.slug}`)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
