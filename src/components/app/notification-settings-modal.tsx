import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Switch } from "@/src/components/react-native-reusables/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { NotificationTargetCard } from "@/src/features/notifications/notification-target-card";
import {
  getNotificationTarget,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cancelAllReminders } from "@/src/lib/notifications";
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
  const updatePreferences = useUpdateUserPreferences(userId);
  const showToast = useToastStore((s) => s.showToast);
  const target = getNotificationTarget(targetKey);

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;

  async function handleGlobalToggle(next: boolean) {
    if (!preferences || !userId) return;
    try {
      // Write the preference first (it drives server-side delivery), then tear the channel
      // down — so a teardown failure can't leave the pref enabled with the channel gone.
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, { notificationsEnabledGlobal: next }),
      );
      if (!next) {
        await cancelAllReminders(userId);
      }
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  }

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
          <Card>
            <CardHeader>
              <CardTitle>{t("globalMaster.label")}</CardTitle>
              <CardDescription>{t("globalMaster.hint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <Text className="flex-1">{t("globalMaster.label")}</Text>
                <Switch
                  accessibilityLabel={t("globalMaster.label")}
                  accessibilityHint={t("globalMaster.hint")}
                  checked={globalEnabled}
                  disabled={!preferences}
                  onCheckedChange={(value) => void handleGlobalToggle(value)}
                />
              </View>
            </CardContent>
          </Card>

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
