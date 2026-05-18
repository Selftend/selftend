import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { LoadingState } from "@/src/components/app/screen-state";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useSession } from "@/src/providers/session-provider";
import { BackButton } from "@/src/components/app/back-button";

export default function BeliefsScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: beliefs, isLoading } = useCoreBeliefs(user?.id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("beliefs.title")}</Text>
              </View>
              <Text variant="muted">{t("beliefs.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/beliefs/new")} size="sm">
              <Text>{t("beliefs.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("beliefs.loading")} />
          ) : (beliefs?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("beliefs.empty")}</CardTitle>
                <CardDescription>{t("beliefs.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <View className="gap-3">
              {beliefs!.map((belief) => (
                <AccessibleCardLink
                  key={belief.id}
                  title={belief.beliefStatement}
                  description={t("beliefs.strengthSummary", {
                    original: belief.originalBeliefStrength,
                    alternative: belief.alternativeBeliefStrength,
                  })}
                  onPress={() => router.push(`/modules/cbt/beliefs/${belief.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
