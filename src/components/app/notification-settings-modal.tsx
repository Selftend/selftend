import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { NotificationTargetRow } from "@/src/features/notifications/notification-target-row";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
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
  const channel = useReminderChannel(userId);
  const target = getNotificationTarget(targetKey);
  const [requestPending, setRequestPending] = useState(false);

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
            // A close button is named "Close". It read "Reminders" - the screen's own
            // short label - which named the destination it was leaving.
            accessibilityLabel={t("common:close")}
            accessibilityRole="button"
            hitSlop={12}
            onPress={onDismiss}
          >
            <Icon name="close" className="size-6 text-muted-foreground" />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-4 p-4 pb-12">
          {preferences ? (
            <View className="rounded-xl border border-border bg-card px-4">
              <NotificationTargetRow
                target={target}
                preferences={preferences}
                userId={userId}
                masterEnabled={globalEnabled}
                channel={channel}
                locked={requestPending}
                onRequestChange={setRequestPending}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
