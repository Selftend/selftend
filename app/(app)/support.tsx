import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { appEnv } from "@/src/lib/env";

export default function SupportScreen() {
  const { t } = useTranslation("settings");
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("Selftend support");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("supportPage.title")}</Text>
            <Text variant="muted">{t("supportPage.description")}</Text>
          </View>

      <Card>
        <CardHeader>
          <CardTitle>{t("supportPage.boundary")}</CardTitle>
          <CardDescription>{t("supportPage.boundaryDescription")}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("supportPage.contact")}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          {supportEmail ? (
            <Button
              onPress={() => void Linking.openURL(`mailto:${supportEmail}?subject=${supportSubject}`)}
            >
              <Text>{t("supportPage.emailSupport")}</Text>
            </Button>
          ) : (
            <Text variant="muted">{t("supportPage.emailNotConfigured")}</Text>
          )}
          <Button onPress={() => router.push("/account-deletion")} variant="ghost">
            <Text>{t("supportPage.requestDeletion")}</Text>
          </Button>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("supportPage.projectLinks")}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}>
            <Text>{t("supportPage.openRepo")}</Text>
          </Button>
          <Button
            onPress={() => void Linking.openURL(`${appEnv.githubRepoUrl}/blob/main/CONTRIBUTING.md`)}
            variant="secondary"
          >
            <Text>{t("supportPage.openContributing")}</Text>
          </Button>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("supportPage.policiesAndSafety")}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => router.push("/crisis")} variant="secondary">
            <Text>{t("supportPage.openCrisis")}</Text>
          </Button>
          <Button onPress={() => router.push("/privacy")} variant="ghost">
            <Text>{t("supportPage.openPrivacy")}</Text>
          </Button>
          <Button onPress={() => router.push("/terms")} variant="ghost">
            <Text>{t("supportPage.openTerms")}</Text>
          </Button>
          </View>
        </CardContent>
      </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
