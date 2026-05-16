import { router } from "expo-router";
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
import { BackButton } from "@/src/components/app/back-button";
import { groundingTechniques } from "@/src/constants/grounding";
import { useGroundingSessions } from "@/src/features/grounding/queries";
import { useSession } from "@/src/providers/session-provider";

export default function GroundingScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useGroundingSessions(user?.id ?? null, 7);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("grounding.title")}</Text>
            </View>
            <Text variant="muted">{t("grounding.description")}</Text>
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
                onPress={() =>
                  router.push(
                    `/tools/grounding/${technique.slug}` as Parameters<typeof router.push>[0],
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
