import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useFreshStartNoticeStore } from "@/src/stores/fresh-start-notice-store";

/**
 * The returning-device notice (#1450): shown once when a stored session could
 * not be restored, before life continues on the new guest account. Calm and
 * deliberately GENERIC - the client cannot tell dormancy cleanup from any
 * other invalidation, so the copy makes no claim about why, and no claim of
 * fault. Never silent, never guilt, never repeated: dismissing it (or the
 * next reload - the trigger marker is already cleared) is the end of it.
 *
 * A banner in the root layout rather than a toast: the toast slot's two tones
 * are save outcomes ("saved" / "didn't save"), and a success toast
 * auto-dismisses - this sentence should wait until it has been read.
 */
export function FreshStartNotice() {
  const { t } = useTranslation("auth");
  const visible = useFreshStartNoticeStore((state) => state.visible);
  const dismiss = useFreshStartNoticeStore((state) => state.dismissFreshStartNotice);

  if (!visible) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      testID="fresh-start-notice"
      className="border-b border-border bg-muted px-4 py-2"
    >
      <View className="mx-auto w-full max-w-2xl flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium">{t("freshStart.title")}</Text>
          <Text variant="muted" className="text-sm">
            {t("freshStart.body")}
          </Text>
        </View>
        <Button
          accessibilityLabel={t("freshStart.dismiss")}
          size="sm"
          variant="ghost"
          onPress={dismiss}
        >
          <Icon name="close" className="size-4 text-foreground" />
        </Button>
      </View>
    </View>
  );
}
