import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { useIsOnline } from "@/src/lib/online-manager";

export function OfflineBanner() {
  const { t } = useTranslation("errors");
  const isOnline = useIsOnline();

  if (isOnline) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      className="border-t border-border bg-muted px-4 py-2"
    >
      <Text variant="muted" className="text-center text-sm">
        {t("offline.banner")}
      </Text>
    </View>
  );
}
