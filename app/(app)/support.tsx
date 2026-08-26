import { View } from "react-native";
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
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { requireSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { GetTheAppSection } from "@/src/components/app/get-the-app-section";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

type FeedbackCategory = "bug" | "suggestion" | "question";

// Mirrors the function-side gate (resolveReplyTo in _shared/feedback.ts):
// simple on purpose - it gates a Reply-To header, not deliverability.
const REPLY_TO_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SupportScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("Selftend support");

  // A registered user's reply address comes from their account on the server;
  // only a guest, who has no email anywhere, is offered one - optional,
  // guest-only, and used for nothing but replying (#1447).
  const isGuest = user?.is_anonymous === true;

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleFeedbackSubmit = async () => {
    const trimmed = feedbackMessage.trim();
    if (trimmed.length < 10) {
      setFeedbackError(t("feedback.messageTooShort"));
      return;
    }
    if (trimmed.length > 1000) {
      setFeedbackError(t("feedback.messageTooLong"));
      return;
    }
    const replyTo = isGuest ? replyToEmail.trim() : "";
    if (replyTo && !REPLY_TO_PATTERN.test(replyTo)) {
      setFeedbackError(t("feedback.replyToInvalid"));
      return;
    }
    setFeedbackError("");
    setIsSubmitting(true);
    try {
      const { error } = await requireSupabase().functions.invoke("send-feedback", {
        body: {
          category: feedbackCategory,
          message: trimmed,
          ...(replyTo ? { replyTo } : {}),
        },
      });
      if (error) throw error;
      setSubmitSuccess(true);
      setFeedbackMessage("");
      setReplyToEmail("");
      setFeedbackCategory("suggestion");
    } catch {
      setFeedbackError(t("feedback.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileFormScreen>
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("supportPage.title")} />
          <Text variant="muted">{t("supportPage.description")}</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{t("supportPage.boundary")}</CardTitle>
            <CardDescription>{t("supportPage.boundaryDescription")}</CardDescription>
          </CardHeader>
        </Card>

        {supportEmail ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("feedback.title")}</CardTitle>
              <CardDescription>{t("feedback.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                {/*
                  No `bg-destructive/5` here: this is crisis guidance, and red
                  text on a wash of its own red measured below AA (#603). Card
                  already paints `bg-card`, where `text-destructive` is gated at
                  or above 4.5 on every palette, so the warning keeps its red
                  border and red text and becomes legible rather than louder.
                */}
                <Card className="border-destructive/50">
                  <CardContent className="pt-4">
                    <Text className="text-sm font-medium text-destructive">
                      {t("feedback.crisisWarning")}
                    </Text>
                    <Button
                      onPress={() => pushWithOrigin("/crisis")}
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

                {isGuest ? (
                  <View className="gap-2">
                    <Label>{t("feedback.replyToLabel")}</Label>
                    <Input
                      accessibilityLabel={t("feedback.replyToLabel")}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={(text) => {
                        setReplyToEmail(text);
                        if (feedbackError) setFeedbackError("");
                      }}
                      placeholder={t("feedback.replyToPlaceholder")}
                      value={replyToEmail}
                    />
                    <Text variant="muted" className="text-xs">
                      {t("feedback.replyToHint")}
                    </Text>
                  </View>
                ) : null}

                {submitSuccess ? (
                  <Text className="text-sm">{t("feedback.submitSuccess")}</Text>
                ) : (
                  <Button disabled={isSubmitting} onPress={() => void handleFeedbackSubmit()}>
                    <Text>{isSubmitting ? t("feedback.submitting") : t("feedback.submit")}</Text>
                  </Button>
                )}
              </View>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("feedback.otherChannels")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Button
                variant="secondary"
                onPress={() => openExternalUrl(`${appEnv.githubRepoUrl}/issues`)}
              >
                <Text>{t("feedback.reportOnGitHub")}</Text>
              </Button>
              {appEnv.discordUrl ? (
                <Button variant="secondary" onPress={() => openExternalUrl(appEnv.discordUrl)}>
                  <Text>{t("feedback.joinDiscord")}</Text>
                </Button>
              ) : null}
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("supportPage.handles")}</CardTitle>
            <CardDescription>{t("supportPage.handlesCovers")}</CardDescription>
            <CardDescription>{t("supportPage.handlesNot")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onPress={() => pushWithOrigin("/faq")} variant="secondary">
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
                    openExternalUrl(`mailto:${supportEmail}?subject=${supportSubject}`)
                  }
                >
                  <Text>{t("supportPage.emailSupport")}</Text>
                </Button>
              ) : (
                <Text variant="muted">{t("supportPage.emailNotConfigured")}</Text>
              )}
              <Button onPress={() => pushWithOrigin("/account-deletion")} variant="ghost">
                <Text>{t("supportPage.deleteAccount")}</Text>
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
              <Button onPress={() => openExternalUrl(appEnv.githubRepoUrl)}>
                <Text>{t("supportPage.openRepo")}</Text>
              </Button>
              <Button
                onPress={() =>
                  openExternalUrl(`${appEnv.githubRepoUrl}/blob/main/.github/CONTRIBUTING.md`)
                }
                variant="secondary"
              >
                <Text>{t("supportPage.openContributing")}</Text>
              </Button>
              <GetTheAppSection />
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("supportPage.policiesAndSafety")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Button onPress={() => pushWithOrigin("/crisis")} variant="secondary">
                <Text>{t("supportPage.openCrisis")}</Text>
              </Button>
              <Button onPress={() => pushWithOrigin("/privacy")} variant="ghost">
                <Text>{t("supportPage.openPrivacy")}</Text>
              </Button>
              <Button onPress={() => pushWithOrigin("/terms")} variant="ghost">
                <Text>{t("supportPage.openTerms")}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </MobileFormScreen>
  );
}
