import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { TimeField } from "@/src/components/app/time-field";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { type UserPreferences } from "@/src/features/modules/types";
import {
  isReminderPromptEligible,
  roundToNearestHalfHour,
} from "@/src/features/notifications/reminder-prompt";
import {
  getNotificationTarget,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import { enableTargetPatch } from "@/src/features/notifications/enable-patch";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { useSession } from "@/src/providers/session-provider";
import { useBannerInsetStore } from "@/src/stores/banner-inset-store";
import { useReminderPromptStore } from "@/src/stores/reminder-prompt-store";
import { useToastStore } from "@/src/stores/toast-store";
import { clampTime, type TimeOfDay } from "@/src/utils/time";

function promptedToolsIncluding(preferences: UserPreferences, targetKey: NotificationTargetKey) {
  return preferences.reminderPromptedTools.includes(targetKey)
    ? preferences.reminderPromptedTools
    : [...preferences.reminderPromptedTools, targetKey];
}

// Globally mounted host (next to AppToast) for the one-time contextual
// reminder prompt. Tool save flows push a request into the reminder prompt
// store; this card decides eligibility, shows once, and marks the tool
// prompted the moment it is shown - dismissing by any means counts as asked.
export function ReminderPromptCard() {
  const { t } = useTranslation("notifications");
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  // This card IS the ask (#981): the meditation wizard's switch was dropped, so the
  // contextual prompt after a completed session is where the channel gets armed.
  const channel = useReminderChannel(userId);
  const showToast = useToastStore((state) => state.showToast);
  const request = useReminderPromptStore((state) => state.request);
  const dismissRequest = useReminderPromptStore((state) => state.dismissReminderPrompt);
  const bannerInset = useBannerInsetStore((state) => state.height);

  const [activeTarget, setActiveTarget] = useState<NotificationTargetKey | null>(null);
  const [time, setTime] = useState<TimeOfDay>({ hour: 19, minute: 0 });
  const [saving, setSaving] = useState(false);

  const { mutateAsync: persistPreferences } = updatePreferences;

  // Consume the request's UI state during render (render-time adjustment);
  // from here the card is driven by local state, so the preference write
  // below can't hide the card mid-interaction.
  const [consumedRequest, setConsumedRequest] = useState<typeof request>(null);
  if (request && request !== consumedRequest && userId && preferences) {
    setConsumedRequest(request);
    if (isReminderPromptEligible(preferences, request.targetKey)) {
      setActiveTarget(request.targetKey);
      setTime(roundToNearestHalfHour(new Date(request.completedAt)));
    }
  }

  // The consumption's side effects: clear the store request, and mark
  // prompted on show - navigating away without touching the card still
  // counts as asked. Best-effort - a failed write only risks one more ask.
  useEffect(() => {
    if (!request || !userId || !preferences) return;
    dismissRequest();
    if (!isReminderPromptEligible(preferences, request.targetKey)) return;
    persistPreferences({
      reminderPromptedTools: promptedToolsIncluding(preferences, request.targetKey),
    }).catch(() => {});
  }, [request, userId, preferences, dismissRequest, persistPreferences]);

  if (!activeTarget || !preferences || !userId) return null;

  const target = getNotificationTarget(activeTarget);

  async function handleAccept() {
    if (!activeTarget || !preferences || !userId) return;
    setSaving(true);
    const { hour, minute } = clampTime(time);
    try {
      const result = await channel.ensure();
      if (!result.enabled) {
        // Same mapping as the reminders screen: the raw reason slug never reaches the
        // user, and the wording names this platform's settings rather than a browser's.
        showToast({
          title: t("common:feedback.wentWrong"),
          description: t(reminderChannelErrorKey(result.reason)),
          tone: "error",
        });
        return;
      }
      const patch: Partial<UserPreferences> = {
        ...enableTargetPatch(preferences, target, { hour, minute }),
        reminderPromptedTools: promptedToolsIncluding(preferences, activeTarget),
      };
      await persistPreferences(patch);
      showToast({
        title: t("common:feedback.saved"),
        description: t(target.labelKey),
        tone: "success",
      });
      setActiveTarget(null);
    } catch {
      // The thrown message is a backend/internal string - translated copy only.
      showToast({ title: t("common:feedback.wentWrong"), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View
      // box-none must be the prop, not style.pointerEvents: NativeWind passes the
      // style value through as raw CSS, and "box-none" is invalid CSS (ignored), so
      // this full-width overlay would capture clicks meant for the screen behind it.
      // The prop routes through react-native-web's box-none polyfill (container
      // non-interactive, direct children interactive).
      testID="reminder-prompt-host"
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[70] items-center px-4"
      // Ride above the bottom-anchored banner strip (#667): a visible banner
      // would otherwise sit under this card and lose its controls to it.
      style={{ bottom: insets.bottom + 16 + bannerInset }}
    >
      <Card className="w-full max-w-xl shadow-md dark:shadow-none">
        <CardHeader className="gap-1">
          <View className="flex-row items-center gap-3">
            <View className="size-9 items-center justify-center rounded-lg bg-muted">
              <Icon name={target.icon} className="size-5 text-muted-foreground" />
            </View>
            <View className="flex-1 gap-1">
              <CardTitle>{t("reminderPrompt.title")}</CardTitle>
              <CardDescription>
                {t("reminderPrompt.description", { label: t(target.labelKey) })}
              </CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent className="gap-4">
          <TimeField
            value={time}
            onChange={setTime}
            disabled={saving}
            accessibilityLabel={t("time.label")}
          />
          <View className="flex-row gap-3">
            <Button className="flex-1" disabled={saving} onPress={() => void handleAccept()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{t("reminderPrompt.accept")}</Text>
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={saving}
              onPress={() => setActiveTarget(null)}
            >
              <Text>{t("reminderPrompt.decline")}</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
