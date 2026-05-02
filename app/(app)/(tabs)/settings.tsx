import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Switch, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { LoadingState } from "@/src/components/loading-state";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";
import { signOut } from "@/src/features/auth/api";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { appEnv } from "@/src/lib/env";
import { cancelCbtReminder, scheduleCbtReminder } from "@/src/lib/notifications";
import { useSession } from "@/src/providers/session-provider";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function SettingsScreen() {
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hourInput, setHourInput] = useState(String(defaultUserPreferences.cbtReminderHour));
  const [minuteInput, setMinuteInput] = useState(String(defaultUserPreferences.cbtReminderMinute));
  const [remindersEnabled, setRemindersEnabled] = useState(defaultUserPreferences.cbtRemindersEnabled);
  const { data, isLoading } = useUserPreferences(user?.id ?? null);
  const updatePreferencesMutation = useUpdateUserPreferences(user?.id ?? null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setHourInput(String(data.cbtReminderHour));
    setMinuteInput(String(data.cbtReminderMinute));
    setRemindersEnabled(data.cbtRemindersEnabled);
  }, [data]);

  const savePreferences = async () => {
    if (!user) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const hour = clamp(Number.parseInt(hourInput || "19", 10), 0, 23);
      const minute = clamp(Number.parseInt(minuteInput || "0", 10), 0, 59);
      let reminderConsent = data?.reminderConsent ?? false;

      if (remindersEnabled) {
        reminderConsent = await scheduleCbtReminder(hour, minute);
      } else {
        await cancelCbtReminder();
        reminderConsent = false;
      }

      await updatePreferencesMutation.mutateAsync({
        enabledModules: ["cbt"],
        reminderConsent,
        cbtRemindersEnabled: remindersEnabled && reminderConsent,
        cbtReminderHour: hour,
        cbtReminderMinute: minute,
      });

      if (remindersEnabled && !reminderConsent) {
        setErrorMessage("Notification permission was not granted. Reminder settings were saved as off.");
        return;
      }

      setSuccessMessage("Settings saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  return (
    <Screen
      subtitle="Quiet defaults, private account access, and a narrow first section."
      title="Settings"
    >
      {isLoading ? <LoadingState label="Loading settings..." /> : null}
      {errorMessage ? <NoticeCard body={errorMessage} title="Settings problem" tone="warning" /> : null}
      {successMessage ? <NoticeCard body={successMessage} title="Saved" /> : null}

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">CBT reminders</Text>
          <Text className="text-sm leading-6 text-ink/70">
            Reminders stay explicit and off by default. They should support use, not create pressure.
          </Text>
          <View className="flex-row items-center justify-between rounded-2xl bg-mist px-4 py-3">
            <View className="flex-1 gap-1 pr-4">
              <Text className="text-base font-semibold text-ink">Daily reminder</Text>
              <Text className="text-sm leading-5 text-ink/70">Enable one repeating local reminder.</Text>
            </View>
            <Switch onValueChange={setRemindersEnabled} value={remindersEnabled} />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-sm font-semibold uppercase tracking-wide text-ink/50">Hour</Text>
              <TextField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                onChangeText={setHourInput}
                placeholder="19"
                value={hourInput}
              />
            </View>
            <View className="flex-1 gap-2">
              <Text className="text-sm font-semibold uppercase tracking-wide text-ink/50">Minute</Text>
              <TextField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                onChangeText={setMinuteInput}
                placeholder="00"
                value={minuteInput}
              />
            </View>
          </View>
          <Button
            isLoading={updatePreferencesMutation.isPending}
            onPress={() => void savePreferences()}
            text="Save reminder settings"
          />
        </View>
      </Card>

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Support and project links</Text>
          <Button onPress={() => router.push("/support")} text="Open support page" variant="secondary" />
          <Button onPress={() => router.push("/legal")} text="Open legal and boundaries" variant="ghost" />
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)} text="Open GitHub repo" variant="ghost" />
        </View>
      </Card>

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Account</Text>
          <Text className="text-sm leading-6 text-ink/70">{user?.email ?? "Signed-in account"}</Text>
          <Button onPress={() => router.push("/account-deletion")} text="Request account or data deletion" variant="ghost" />
          <Button onPress={() => void handleSignOut()} text="Sign out" variant="danger" />
        </View>
      </Card>
    </Screen>
  );
}
