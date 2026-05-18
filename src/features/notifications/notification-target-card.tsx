import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  defaultUserPreferences,
  mergeUserPreferences,
  type UserPreferences,
} from "@/src/features/modules/types";
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
  type ReminderTarget,
} from "@/src/lib/notifications";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

interface NotificationTargetCardProps {
  target: NotificationTarget;
  preferences: UserPreferences;
  userId: string | null;
  globalEnabled: boolean;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [hourInput, setHourInput] = useState(String(initialHour));
  const [minuteInput, setMinuteInput] = useState(String(initialMinute));
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setEnabled(initialEnabled);
    setHourInput(String(initialHour));
    setMinuteInput(String(initialMinute));
  }, [initialEnabled, initialHour, initialMinute]);

  const masterDisabled = !globalEnabled || isPlaceholder;
  const controlsDisabled = masterDisabled || !enabled;

  async function handleSave() {
    if (!userId || isPlaceholder || !target.enabledField) return;
    const enabledField = target.enabledField;

    setErrorMessage("");

    const hour = clamp(Number.parseInt(hourInput || "19", 10), 0, 23);
    const minute = clamp(Number.parseInt(minuteInput || "0", 10), 0, 59);

    const patch: Partial<UserPreferences> = {
      [enabledField]: enabled,
    };
    if (target.hourField) patch[target.hourField] = hour;
    if (target.minuteField) patch[target.minuteField] = minute;
    if (target.timezoneField) patch[target.timezoneField] = getReminderTimeZone();

    let reminderConsent = preferences.reminderConsent ?? defaultUserPreferences.reminderConsent;

    try {
      if (target.schedulesOs && globalEnabled) {
        const osTarget = target.key as ReminderTarget;
        if (enabled) {
          const result = await scheduleReminder(osTarget, hour, minute, userId);
          if (!result.enabled) {
            patch[enabledField] = false;
            setEnabled(false);
            await updatePreferences.mutateAsync(mergeUserPreferences(preferences, patch));
            const message = t("feedback.problem");
            setErrorMessage(message);
            showToast({ title: message, description: result.reason, tone: "error" });
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

      await updatePreferences.mutateAsync(mergeUserPreferences(preferences, patch));
      showToast({
        title: t("feedback.saved"),
        description: t(target.labelKey),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("feedback.problem");
      setErrorMessage(message);
      showToast({ title: t("feedback.problem"), description: message, tone: "error" });
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
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-2">
                    <Label>{t("time.hour")}</Label>
                    <Input
                      accessibilityLabel={t("time.hour")}
                      accessibilityHint={t("time.hourPlaceholder")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!controlsDisabled}
                      keyboardType="number-pad"
                      onChangeText={setHourInput}
                      placeholder={t("time.hourPlaceholder")}
                      value={hourInput}
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Label>{t("time.minute")}</Label>
                    <Input
                      accessibilityLabel={t("time.minute")}
                      accessibilityHint={t("time.minutePlaceholder")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!controlsDisabled}
                      keyboardType="number-pad"
                      onChangeText={setMinuteInput}
                      placeholder={t("time.minutePlaceholder")}
                      value={minuteInput}
                    />
                  </View>
                </View>
              </View>
              <Button
                disabled={masterDisabled || updatePreferences.isPending}
                onPress={() => void handleSave()}
              >
                {updatePreferences.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{updatePreferences.isPending ? t("actions.saving") : t("actions.save")}</Text>
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
