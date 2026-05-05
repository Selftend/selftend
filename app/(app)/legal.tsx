import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export default function LegalScreen() {
  const { t } = useTranslation("settings");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("legal.title")}</Text>
            <Text variant="muted">{t("legal.description")}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("legal.launchReview")}</CardTitle>
              <CardDescription>{t("legal.launchReviewDescription")}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("legal.productBoundary")}</CardTitle>
              <CardDescription>{t("legal.productBoundaryDescription")}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("legal.publicPages")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <Button onPress={() => router.push("/privacy")} variant="secondary">
                  <Text>{t("legal.openPrivacy")}</Text>
                </Button>
                <Button onPress={() => router.push("/terms")} variant="ghost">
                  <Text>{t("legal.openTerms")}</Text>
                </Button>
                <Button onPress={() => router.push("/cookies")} variant="ghost">
                  <Text>{t("legal.openCookies")}</Text>
                </Button>
                <Button onPress={() => router.push("/crisis")} variant="ghost">
                  <Text>{t("legal.openCrisis")}</Text>
                </Button>
                <Button onPress={() => router.push("/account-deletion")} variant="ghost">
                  <Text>{t("legal.openDeletion")}</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("legal.license")}</CardTitle>
              <CardDescription>{t("legal.licenseDescription")}</CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
