import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { NotificationTargetCard } from "@/src/features/notifications/notification-target-card";
import {
  getNotificationTarget,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface NotificationSettingsModalProps {
  targetKey: NotificationTargetKey;
  visible: boolean;
  onDismiss: () => void;
}

export function NotificationSettingsModal({
  targetKey,
  visible,
  onDismiss,
}: NotificationSettingsModalProps) {
  const { t } = useTranslation("notifications");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences } = useUserPreferences(userId);
  const target = getNotificationTarget(targetKey);

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text variant="h3">{t("title")}</Text>
          <Pressable
            accessibilityLabel={t("actions.openShort")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onDismiss}
          >
            <Icon name="close" className="size-6 text-muted-foreground" />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-4 p-4 pb-12">
          {preferences ? (
            <NotificationTargetCard
              target={target}
              preferences={preferences}
              userId={userId}
              globalEnabled={globalEnabled}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
