import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { appEnv } from "@/src/lib/env";

// The Android mobile-web download bar (#388 spec section 4): shown only on
// public/auth routes (the mount points choose that), only in an Android
// browser, only when the Play URL is configured. One line, bottom of the
// screen, safe-area padded, dismissible forever per browser. Our own glyph
// and plain text - no official Play badge asset (Google's brand rules carry
// obligations the spec chose not to take on).

const DISMISSED_KEY = "androidDownloadBarDismissed";

function isAndroidBrowser(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const uaData = (navigator as { userAgentData?: { platform?: string } }).userAgentData;
  if (uaData?.platform) return uaData.platform === "Android";
  return /Android/i.test(navigator.userAgent);
}

export function AndroidDownloadBar() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const playStoreUrl = appEnv.playStoreUrl.trim();

  // Visibility is decided once at mount - UA and dismissal cannot change under
  // a mounted bar, so a lazy initializer beats an effect (and satisfies the
  // set-state-in-effect rule by construction).
  const [visible, setVisible] = useState(() => {
    if (!playStoreUrl || !isAndroidBrowser()) return false;
    try {
      return !window.localStorage.getItem(DISMISSED_KEY);
    } catch {
      // Storage unavailable (privacy mode): show the bar, skip persistence.
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Best effort - a privacy-mode browser just sees it again next visit.
    }
  };

  return (
    <View
      className="border-t border-border bg-card px-4 py-2"
      style={{ paddingBottom: Math.max(8, insets.bottom) }}
    >
      <View className="flex-row items-center justify-center gap-x-2">
        <Text variant="muted" className="flex-shrink text-sm">
          {t("downloadBar.message")}
        </Text>
        <Button size="sm" variant="link" onPress={() => void Linking.openURL(playStoreUrl)}>
          <Text className="text-sm">{t("downloadBar.action")}</Text>
        </Button>
        <Button
          size="sm"
          variant="link"
          accessibilityLabel={t("downloadBar.dismiss")}
          onPress={dismiss}
        >
          <Text className="text-sm">{t("downloadBar.dismiss")}</Text>
        </Button>
      </View>
    </View>
  );
}
