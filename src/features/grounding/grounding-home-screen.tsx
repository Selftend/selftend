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
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
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
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ModuleHomeHeader
              title={t("grounding.title")}
              hue="clay"
              icon="anchor"
              description={t("grounding.description")}
              actions={[
                { type: "notifications", targetKey: "grounding" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                sessions != null && sessions.length > 0 ? (
                  <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                    <Text variant="muted" className="text-xs">
                      <Text className="text-xs font-bold text-clay">
                        {t("grounding.hero.recentSessions", { count: sessions.length })}
                      </Text>
                    </Text>
                  </View>
                ) : null
              }
            />

            {sessions && sessions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("grounding.streakTitle")}</CardTitle>
                  <CardDescription>
                    {t("grounding.recentCount", { count: sessions.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <View className="gap-1">
                    {sessions.slice(0, 3).map((s) => (
                      <Text key={s.id} variant="muted" className="text-sm">
                        • {t(`grounding.techniques.${s.exerciseName}.title`)}
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            <View className="gap-3">
              <Text variant="h3">{t("grounding.choose")}</Text>
              {groundingTechniques.map((technique) => (
                <AccessibleCardLink
                  key={technique.slug}
                  title={t(`grounding.techniques.${technique.slug}.title`)}
                  description={t(`grounding.techniques.${technique.slug}.shortDescription`)}
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
