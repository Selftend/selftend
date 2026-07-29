import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUpdateAvailability } from "@/src/lib/use-update-availability";

/**
 * The quiet in-app update offer (#388 spec section 3): an inline app-shell
 * strip beside the offline and verify banners - never an overlay, no focus
 * stealing, no live-region interruption (deliberately NOT role="status": an
 * update offer is not urgent enough to announce over what the user is doing).
 * Dismissal is per version and permanent; the hook re-offers only when the
 * NEXT release ships.
 */
export function UpdateBanner() {
  const { t } = useTranslation("common");
  const { available, act, dismiss } = useUpdateAvailability();

  if (!available) return null;

  return (
    <View className="border-b border-border bg-muted px-4 py-2">
      <View className="flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Text variant="muted" className="text-sm">
          {t("updateBanner.message")}
        </Text>
        <Button size="sm" variant="link" onPress={act}>
          <Text className="text-sm">
            {Platform.OS === "web" ? t("updateBanner.actionWeb") : t("updateBanner.actionNative")}
          </Text>
        </Button>
        <Button size="sm" variant="link" onPress={dismiss}>
          <Text className="text-sm">{t("updateBanner.dismiss")}</Text>
        </Button>
      </View>
    </View>
  );
}
