import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { LEGAL_REVIEW_PENDING } from "@/src/features/policies/policy-content";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";

export default function LegalScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("settings");

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Column on the padded box, not inside it - see `layout.ts` (#1721). */}
      <ScrollView contentContainerClassName={cn("grow p-6", HOME_COLUMN)}>
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("legal.title")} />
            <Text variant="muted">{t("legal.description")}</Text>
          </View>

          {LEGAL_REVIEW_PENDING ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("legal.launchReview")}</CardTitle>
                <CardDescription>{t("legal.launchReviewDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
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
                <Button onPress={() => pushWithOrigin("/privacy")} variant="secondary">
                  <Text>{t("legal.openPrivacy")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/terms")} variant="ghost">
                  <Text>{t("legal.openTerms")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/cookies")} variant="ghost">
                  <Text>{t("legal.openCookies")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/crisis")} variant="ghost">
                  <Text>{t("legal.openCrisis")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/account-deletion")} variant="ghost">
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
