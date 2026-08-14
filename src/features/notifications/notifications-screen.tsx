import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { NOTIFICATION_TARGETS, readEnabled } from "@/src/features/notifications/registry";
import { NotificationTargetRow } from "@/src/features/notifications/notification-target-row";
import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

/** One skeleton row at the real row height: 14px padding, a 20px name line, a 36px time field. */
const ROW_HEIGHT = "h-[88px]";

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
  const [pendingControl, setPendingControl] = useState<string | null>(null);

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
      showToast({ title: t("feedback.problem"), tone: "error" });
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
        showToast({ title: t("feedback.problem"), description: message, tone: "error" });
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

          <View className="rounded-xl border border-border bg-card px-4">
            {preferences && !isLoading
              ? NOTIFICATION_TARGETS.map((target, index) => (
                  <View key={target.key} className={cn(index > 0 && "border-t border-border")}>
                    <NotificationTargetRow
                      target={target}
                      preferences={preferences}
                      userId={userId}
                      masterEnabled={globalEnabled}
                      channel={channel}
                      locked={Boolean(pendingControl)}
                      onRequestChange={(pending) => setPendingControl(pending ? target.key : null)}
                    />
                  </View>
                ))
              : /**
                 * Ten skeleton rows at final height. The registry is static, so the shape of
                 * this screen is known before any query resolves - and a loading surface
                 * never claims emptiness.
                 */
                NOTIFICATION_TARGETS.map((target, index) => (
                  <View
                    key={target.key}
                    testID={`notification-row-skeleton-${target.key}`}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className={cn(
                      "flex-row items-center gap-[14px]",
                      ROW_HEIGHT,
                      index > 0 && "border-t border-border",
                    )}
                  >
                    {/* `bg-muted` measures 1.10:1 on a card and is therefore invisible (#725);
                        `muted-foreground/25` is 1.41 light / 1.68 dark - faint on purpose,
                        but actually there. */}
                    <View className="size-5 rounded bg-muted-foreground/25" />
                    <View className="min-w-0 flex-1 gap-2">
                      <View className="h-4 w-1/3 rounded bg-muted-foreground/25" />
                      <View className="h-9 w-16 rounded-md bg-muted-foreground/25" />
                    </View>
                    <View className="h-[1.15rem] w-8 rounded-full bg-muted-foreground/25" />
                  </View>
                ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
