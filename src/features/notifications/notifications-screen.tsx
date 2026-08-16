import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import {
  NOTIFICATION_TARGETS,
  readEnabled,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import {
  NotificationRowSkeleton,
  NotificationTargetRow,
} from "@/src/features/notifications/notification-target-row";
import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

/** Which control owns the open permission prompt, if any. */
type PendingControl = "master" | NotificationTargetKey | null;

export default function NotificationsScreen() {
  const { t } = useTranslation("notifications");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const channel = useReminderChannel(userId);
  const showToast = useToastStore((s) => s.showToast);

  /**
   * Which control is waiting on a permission prompt, or null. One at a time by construction:
   * the prompt is channel-scoped, so a second request while one is open would queue behind a
   * dialog the user is already looking at.
   */
  const [pendingControl, setPendingControl] = useState<PendingControl>(null);

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;
  const masterPending = pendingControl === "master";

  async function writeMaster(next: boolean) {
    try {
      await updatePreferences.mutateAsync({ notificationsEnabledGlobal: next });
      if (!next) {
        // Tear the channel down only after the preference lands, so a teardown failure
        // can't leave the pref enabled with the channel gone.
        await cancelAllReminders(userId);
      }
    } catch {
      showToast({ title: t("common:feedback.wentWrong"), tone: "error" });
    }
  }

  async function handleGlobalToggle(next: boolean) {
    if (!preferences || !userId || pendingControl) return;

    if (!next) {
      await writeMaster(false);
      return;
    }

    /**
     * Master-off deleted the channel (`cancelAllReminders` unsubscribes web push and drops
     * the device token), and master-on used to write only the preference - so every already-
     * enabled reminder came back silently dead. Turning the master back on with reminders
     * enabled therefore has to re-arm the channel, which makes it Path B: ensure first, and
     * write nothing if it fails.
     */
    const needsRearm = NOTIFICATION_TARGETS.some((target) => readEnabled(preferences, target));
    const canArm = channel.status === "granted" || channel.status === "prompt-needed";
    if (!needsRearm || !canArm) {
      // `blocked` / `unsupported` still write the column: it is what the server reads the
      // moment a channel returns.
      await writeMaster(true);
      return;
    }

    setPendingControl("master");
    try {
      const result = await channel.ensure();
      if (!result.enabled) {
        const message = t(reminderChannelErrorKey(result.reason));
        showToast({ title: t("common:feedback.wentWrong"), description: message, tone: "error" });
        return;
      }
      await writeMaster(true);
    } finally {
      setPendingControl(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="mx-auto w-full max-w-2xl gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          {channel.status === "blocked" ? (
            <View className="gap-1 rounded-xl border border-border bg-card p-4">
              <Text className="text-[15px] font-semibold">{t("channel.blockedTitle")}</Text>
              <Text variant="muted" className="text-[13px]">
                {t(reminderChannelErrorKey("permission-denied"))}
              </Text>
            </View>
          ) : null}

          <View className="gap-1 rounded-xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-4">
              <Text className="flex-1 text-[15px] font-semibold">{t("globalMaster.label")}</Text>
              {masterPending ? (
                <ActivityIndicator
                  testID="notification-master-pending"
                  accessibilityLabel={t("channel.requesting")}
                />
              ) : (
                <Switch
                  accessibilityLabel={t("globalMaster.label")}
                  accessibilityHint={t("globalMaster.hint")}
                  checked={globalEnabled}
                  disabled={!preferences || Boolean(pendingControl)}
                  onCheckedChange={(value) => void handleGlobalToggle(value)}
                />
              )}
            </View>
            <Text variant="muted" className="max-w-[52ch] text-[13px]">
              {t("globalMaster.hint")}
            </Text>
          </View>

          {isLoading || preferences ? (
            <View className="rounded-xl border border-border bg-card px-4">
              {preferences
                ? NOTIFICATION_TARGETS.map((target, index) => (
                    <View key={target.key} className={cn(index > 0 && "border-t border-border")}>
                      <NotificationTargetRow
                        target={target}
                        preferences={preferences}
                        userId={userId}
                        masterEnabled={globalEnabled}
                        channel={channel}
                        locked={Boolean(pendingControl)}
                        onRequestChange={(pending) =>
                          setPendingControl(pending ? target.key : null)
                        }
                      />
                    </View>
                  ))
                : NOTIFICATION_TARGETS.map((target, index) => (
                    <View key={target.key} className={cn(index > 0 && "border-t border-border")}>
                      <NotificationRowSkeleton targetKey={target.key} />
                    </View>
                  ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
