import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { useCookieConsentStore } from "@/src/stores/cookie-consent-store";

export function CookieConsentBanner() {
  const { t } = useTranslation("settings");
  const { accepted, hydrate, acceptAll, acceptEssentialOnly } = useCookieConsentStore();
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (Platform.OS !== "web" || accepted) {
    return null;
  }

  if (showManage) {
    return <CookiePreferencesPanel onDone={() => setShowManage(false)} />;
  }

  return (
    <View className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg">
      <View className="mx-auto w-full max-w-2xl gap-3">
        <Text className="text-sm">{t("cookieConsent.banner")}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Button onPress={acceptAll} size="sm">
            <Text>{t("cookieConsent.acceptAll")}</Text>
          </Button>
          <Button onPress={acceptEssentialOnly} size="sm" variant="secondary">
            <Text>{t("cookieConsent.essentialOnly")}</Text>
          </Button>
          <Button onPress={() => setShowManage(true)} size="sm" variant="ghost">
            <Text>{t("cookieConsent.managePreferences")}</Text>
          </Button>
          <Button onPress={() => router.push("/cookies")} size="sm" variant="ghost">
            <Text>{t("cookieConsent.cookiePolicy")}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

interface CookiePreferencesPanelProps {
  onDone?: () => void;
}

function CookiePreferencesPanel({ onDone }: CookiePreferencesPanelProps) {
  const { t } = useTranslation("settings");
  const { analytics, acceptEssentialOnly, acceptAll } = useCookieConsentStore();
  const [analyticsToggle, setAnalyticsToggle] = useState(analytics);

  const handleSave = () => {
    if (analyticsToggle) {
      acceptAll();
    } else {
      acceptEssentialOnly();
    }
    onDone?.();
  };

  return (
    <View className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg">
      <View className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("cookieConsent.preferencesTitle")}</CardTitle>
            <CardDescription>{t("cookieConsent.preferencesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium">{t("cookieConsent.essential")}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {t("cookieConsent.essentialDescription")}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-muted-foreground">
                  {t("cookieConsent.alwaysOn")}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="font-medium">{t("cookieConsent.analytics")}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {t("cookieConsent.analyticsDescription")}
                  </Text>
                </View>
                <Switch
                  accessibilityHint={t("cookieConsent.analyticsDescription")}
                  accessibilityLabel={t("cookieConsent.analytics")}
                  checked={analyticsToggle}
                  onCheckedChange={setAnalyticsToggle}
                />
              </View>
              <View className="flex-row gap-2">
                <Button onPress={handleSave} size="sm">
                  <Text>{t("cookieConsent.savePreferences")}</Text>
                </Button>
                {onDone ? (
                  <Button onPress={onDone} size="sm" variant="ghost">
                    <Text>{t("cookieConsent.cancel")}</Text>
                  </Button>
                ) : null}
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  );
}
