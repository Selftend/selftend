import { ActivityIndicator, View } from "react-native";
import { useState } from "react";
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
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import {
  type NotificationTarget,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import {
  cancelReminder,
  getReminderTimeZone,
  scheduleReminder,
  type ReminderScheduleFailureReason,
  type ReminderTarget,
} from "@/src/lib/notifications";
import { useToastStore } from "@/src/stores/toast-store";
import { clampTime, type TimeOfDay } from "@/src/utils/time";
import { cn } from "@/lib/utils";

interface NotificationTargetCardProps {
  target: NotificationTarget;
  preferences: UserPreferences;
  userId: string | null;
  globalEnabled: boolean;
  className?: string;
}

function getReminderConsentUpdatedAt(
  preferences: UserPreferences,
  reminderConsent: boolean,
): string | null {
  if (preferences.reminderConsent === reminderConsent) {
    return preferences.reminderConsentUpdatedAt;
  }
  return new Date().toISOString();
}

export function NotificationTargetCard({
  target,
  preferences,
  userId,
  globalEnabled,
  className,
}: NotificationTargetCardProps) {
  const { t } = useTranslation("notifications");
  const updatePreferences = useUpdateUserPreferences(userId);
  const showToast = useToastStore((state) => state.showToast);

  const isPlaceholder = target.status === "placeholder";
  const initialEnabled = isPlaceholder ? false : readEnabled(preferences, target);
  const initialHour = readHour(preferences, target);
  const initialMinute = readMinute(preferences, target);

  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState<TimeOfDay>({ hour: initialHour, minute: initialMinute });
  const [errorMessage, setErrorMessage] = useState("");
  // Local in-flight flag rather than updatePreferences.isPending: the slow part
  // of a save is scheduleReminder (browser permission prompt + push
  // subscription), which runs BEFORE the mutation - isPending alone leaves the
  // button live and silent exactly while the save can hang (#473).
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the local controls whenever the server-backed values change
  // (render-time adjustment).
  const [prevInitial, setPrevInitial] = useState({
    enabled: initialEnabled,
    hour: initialHour,
    minute: initialMinute,
  });
  if (
    prevInitial.enabled !== initialEnabled ||
    prevInitial.hour !== initialHour ||
    prevInitial.minute !== initialMinute
  ) {
    setPrevInitial({ enabled: initialEnabled, hour: initialHour, minute: initialMinute });
    setEnabled(initialEnabled);
    setTime({ hour: initialHour, minute: initialMinute });
  }

  const masterDisabled = !globalEnabled || isPlaceholder;
  const controlsDisabled = masterDisabled || !enabled;

  function scheduleFailureMessage(reason: ReminderScheduleFailureReason) {
    // Every reason slug has a translated entry; the raw slug never reaches the UI.
    return t(`saveErrors.${reason}`);
  }

  async function handleSave() {
    if (isSaving) return;
    if (!userId || isPlaceholder || !target.enabledField) {
      // Nothing can be saved in this state (signed out, or a placeholder
      // target) - say so instead of silently ignoring the tap.
      showToast({ title: t("feedback.problem"), tone: "error" });
      return;
    }
    const enabledField = target.enabledField;

    setIsSaving(true);
    setErrorMessage("");

    const { hour, minute } = clampTime(time);

    const patch: Partial<UserPreferences> = {
      [enabledField]: enabled,
    };
    if (target.hourField) patch[target.hourField] = hour;
    if (target.minuteField) patch[target.minuteField] = minute;
    if (target.timezoneField) patch[target.timezoneField] = getReminderTimeZone();

    let reminderConsent = preferences.reminderConsent;

    try {
      if (target.schedulesOs && globalEnabled) {
        const osTarget = target.key as ReminderTarget;
        if (enabled) {
          const result = await scheduleReminder(osTarget, hour, minute, userId);
          if (!result.enabled) {
            patch[enabledField] = false;
            setEnabled(false);
            await updatePreferences.mutateAsync(patch);
            const message = scheduleFailureMessage(result.reason);
            setErrorMessage(message);
            showToast({ title: t("feedback.problem"), description: message, tone: "error" });
            return;
          }
          reminderConsent = true;
        } else {
          await cancelReminder(osTarget, userId);
        }
      } else if (target.schedulesOs && !globalEnabled) {
        await cancelReminder(target.key as ReminderTarget, userId);
      }

      patch.reminderConsent = reminderConsent;
      patch.reminderConsentUpdatedAt = getReminderConsentUpdatedAt(preferences, reminderConsent);

      await updatePreferences.mutateAsync(patch);
      showToast({
        title: t("feedback.saved"),
        description: t(target.labelKey),
        tone: "success",
      });
    } catch {
      // The thrown message is a backend/internal string - show translated copy
      // only (i18n rule).
      const message = t("feedback.problem");
      setErrorMessage(message);
      showToast({ title: message, tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className={cn(masterDisabled ? "opacity-60" : undefined, className)}>
      <CardHeader>
        <View className="flex-row items-center gap-3">
          <View className="size-9 items-center justify-center rounded-lg bg-muted">
            <Icon name={target.icon} className="size-5 text-muted-foreground" />
          </View>
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <CardTitle>{t(target.labelKey)}</CardTitle>
              {isPlaceholder ? (
                <View className="rounded-full bg-muted px-2 py-0.5">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("comingSoon.badge")}
                  </Text>
                </View>
              ) : null}
            </View>
            <CardDescription>
              {isPlaceholder ? t("comingSoon.hint") : t(target.descriptionKey)}
            </CardDescription>
          </View>
        </View>
      </CardHeader>
      <CardContent>
        <View className="gap-4">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text>{t("perTargetMaster.label")}</Text>
              <Text variant="muted" className="text-xs">
                {t("perTargetMaster.hint")}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t("perTargetMaster.label")}
              accessibilityHint={t("perTargetMaster.hint")}
              checked={enabled}
              disabled={masterDisabled}
              onCheckedChange={setEnabled}
            />
          </View>

          {!isPlaceholder ? (
            <>
              <View className="gap-2">
                <View className="flex-row items-center justify-between gap-4">
                  <Text className={cn(controlsDisabled && "text-muted-foreground")}>
                    {t("subToggles.dailyReminder")}
                  </Text>
                </View>
                <TimeField
                  value={time}
                  onChange={setTime}
                  disabled={controlsDisabled}
                  accessibilityLabel={t("time.label")}
                />
              </View>
              <Button disabled={masterDisabled || isSaving} onPress={() => void handleSave()}>
                {isSaving ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{isSaving ? t("actions.saving") : t("actions.save")}</Text>
              </Button>
              {errorMessage ? (
                <Text className="text-sm text-destructive">{errorMessage}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}
