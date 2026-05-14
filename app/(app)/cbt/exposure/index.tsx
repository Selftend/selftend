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
import { useHierarchies } from "@/src/features/exposure/queries";
import { useSession } from "@/src/providers/session-provider";

export default function ExposureScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: hierarchies, isLoading } = useHierarchies(user?.id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <Text variant="h1">{t("exposure.title")}</Text>
              <Text variant="muted">{t("exposure.description")}</Text>
            </View>
            <Button onPress={() => router.push("/cbt/exposure/new")} size="sm">
              <Text>{t("exposure.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("exposure.loading")} />
          ) : (hierarchies?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("exposure.empty")}</CardTitle>
                <CardDescription>{t("exposure.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <View className="gap-3">
              {hierarchies!.map((h) => (
                <AccessibleCardLink
                  key={h.id}
                  title={h.title}
                  description={h.anxietyType}
                  onPress={() => router.push(`/cbt/exposure/${h.id}`)}
                />
              ))}
            </View>
          )}

          <AccessibleCardLink
            title={t("exposure.worryLink")}
            description={t("exposure.worryLinkDescription")}
            onPress={() => router.push("/cbt/worry")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
