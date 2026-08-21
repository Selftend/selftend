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
import { INSET_LAYER, useInsetPublisher } from "@/src/stores/layered-inset-store";

export function CookieConsentBanner() {
  const { t } = useTranslation("settings");
  const { accepted, hydrate, acceptAll, acceptEssentialOnly } = useCookieConsentStore();
  const [showManage, setShowManage] = useState(false);
  // Layer 1 of the bottom-inset ladder (#1339). This strip is `fixed bottom-0`,
  // so it OVERLAPS the banner strip rather than stacking on it - which is why
  // the ladder maxes top edges instead of summing heights. Both branches below
  // share the one publisher: only one of them is ever mounted, and the hook
  // clears the entry the moment its host view detaches.
  const { attachHost, onLayout } = useInsetPublisher(INSET_LAYER.strip);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (Platform.OS !== "web" || accepted) {
    return null;
  }

  if (showManage) {
    return (
      <CookiePreferencesPanel
        attachHost={attachHost}
        onLayout={onLayout}
        onDone={() => setShowManage(false)}
      />
    );
  }

  return (
    <View
      onLayout={onLayout}
      ref={attachHost}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg dark:shadow-none"
    >
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

interface CookiePreferencesStripProps extends CookiePreferencesPanelProps {
  /**
   * The banner's layer-1 publisher, handed down as two plain values so both
   * branches share one id. Destructured rather than passed as one object: the
   * React Compiler reads a member access on a hook result carrying a ref as a
   * ref access during render.
   */
  attachHost: (node: View | null) => void;
  onLayout: () => void;
}

/**
 * The consent control itself, without the banner's fixed-overlay chrome.
 *
 * Exported so consent can be WITHDRAWN (#969). The banner returns null once
 * `accepted` is set, so before this was reachable from the cookies page the analytics
 * switch had exactly one door and it closed permanently on the first tap. Low live harm
 * while `analyticsDescription` still says analytics are "not currently used" - but
 * consent you cannot withdraw is not consent, and the door has to exist before any
 * analytics do.
 */
export function CookiePreferencesCard({ onDone }: CookiePreferencesPanelProps) {
  const { t } = useTranslation("settings");
  const { analytics, acceptEssentialOnly, acceptAll, hydrate } = useCookieConsentStore();
  /**
   * ☠️ NOT `useState(analytics)`. That captures the value from the FIRST render, and
   * `hydrate` runs in an effect after it - so on the cookies page, where the stored value
   * is the entire point, the switch would show a stale `false`, present consent as
   * withdrawn, and then withdraw it for real on Save. The banner never exposed this
   * because it only renders while nothing is stored.
   *
   * `null` means "the user has not touched this yet", so the control follows the store
   * until they do and their choice wins afterwards. Derived during render rather than
   * resynced in an effect: `setState` inside an effect is a cascading render, and the
   * React Compiler's lint rejects it outright.
   */
  const [stagedAnalytics, setStagedAnalytics] = useState<boolean | null>(null);
  const analyticsToggle = stagedAnalytics ?? analytics;

  // Self-contained rather than relying on the banner having hydrated the store: this
  // card renders on a page the banner does not. Idempotent.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSave = () => {
    if (analyticsToggle) {
      acceptAll();
    } else {
      acceptEssentialOnly();
    }
    onDone?.();
  };

  return (
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
              onCheckedChange={setStagedAnalytics}
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
  );
}

/** The banner's own presentation of the card: a fixed strip over the page. */
function CookiePreferencesPanel({ attachHost, onDone, onLayout }: CookiePreferencesStripProps) {
  return (
    <View
      onLayout={onLayout}
      ref={attachHost}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg dark:shadow-none"
    >
      <View className="mx-auto w-full max-w-2xl">
        <CookiePreferencesCard onDone={onDone} />
      </View>
    </View>
  );
}
