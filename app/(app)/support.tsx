import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { appEnv } from "@/src/lib/env";
import { BackButton } from "@/src/components/app/back-button";

type FeedbackCategory = "bug" | "suggestion" | "question";

export default function SupportScreen() {
  const { t } = useTranslation("settings");
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("Selftend support");

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const handleFeedbackSubmit = () => {
    const trimmed = feedbackMessage.trim();
    if (trimmed.length < 10) {
      setFeedbackError(t("feedback.messageTooShort"));
      return;
    }
    if (trimmed.length > 1000) {
      setFeedbackError(t("feedback.messageTooLong"));
      return;
    }
    setFeedbackError("");
    const subject = encodeURIComponent(`Selftend feedback [${feedbackCategory}]`);
    const body = encodeURIComponent(trimmed);
    void Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("supportPage.title")}</Text>
            </View>
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
              <CardTitle>{t("supportPage.handles")}</CardTitle>
              <CardDescription>{t("supportPage.handlesCovers")}</CardDescription>
              <CardDescription>{t("supportPage.handlesNot")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onPress={() => router.push("/faq")} variant="secondary">
                <Text>{t("supportPage.openFaq")}</Text>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("supportPage.contact")}</CardTitle>
              <CardDescription>{t("supportPage.contactDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {supportEmail ? (
                  <Button
                    onPress={() =>
                      void Linking.openURL(`mailto:${supportEmail}?subject=${supportSubject}`)
                    }
                  >
                    <Text>{t("supportPage.emailSupport")}</Text>
                  </Button>
                ) : (
                  <Text variant="muted">{t("supportPage.emailNotConfigured")}</Text>
                )}
                <Button onPress={() => router.push("/account-deletion")} variant="ghost">
                  <Text>{t("supportPage.deleteAccount")}</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {supportEmail ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("feedback.title")}</CardTitle>
                <CardDescription>{t("feedback.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-4">
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="pt-4">
                      <Text className="text-sm font-medium text-destructive">
                        {t("feedback.crisisWarning")}
                      </Text>
                      <Button
                        onPress={() => router.push("/crisis")}
                        size="sm"
                        variant="ghost"
                        className="mt-2 self-start px-0"
                      >
                        <Text className="text-sm text-destructive underline">
                          {t("feedback.openCrisis")}
                        </Text>
                      </Button>
                    </CardContent>
                  </Card>

                  <View className="gap-2">
                    <Label>{t("feedback.categoryLabel")}</Label>
                    <View className="flex-row gap-2">
                      {(["bug", "suggestion", "question"] as FeedbackCategory[]).map((cat) => (
                        <Button
                          key={cat}
                          onPress={() => setFeedbackCategory(cat)}
                          size="sm"
                          variant={feedbackCategory === cat ? "default" : "outline"}
                        >
                          <Text>{t(`feedback.category.${cat}`)}</Text>
                        </Button>
                      ))}
                    </View>
                  </View>

                  <View className="gap-2">
                    <Label>{t("feedback.messageLabel")}</Label>
                    <Textarea
                      accessibilityLabel={t("feedback.messageLabel")}
                      numberOfLines={5}
                      onChangeText={(text) => {
                        setFeedbackMessage(text);
                        if (feedbackError) setFeedbackError("");
                      }}
                      placeholder={t("feedback.messagePlaceholder")}
                      value={feedbackMessage}
                    />
                    {feedbackError ? (
                      <Text className="text-sm text-destructive">{feedbackError}</Text>
                    ) : null}
                  </View>

                  <Button onPress={handleFeedbackSubmit}>
                    <Text>{t("feedback.submit")}</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : null}

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
                  onPress={() =>
                    void Linking.openURL(
                      `${appEnv.githubRepoUrl}/blob/main/.github/CONTRIBUTING.md`,
                    )
                  }
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
