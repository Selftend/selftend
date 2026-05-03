import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">Settings</Text>
            <Text variant="muted">Quiet defaults, private account access, and a narrow first section.</Text>
          </View>

      {isLoading ? (
        <View className="items-center justify-center gap-3 p-6">
          <ActivityIndicator />
          <Text variant="muted">Loading settings...</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Settings problem</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {successMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Saved</CardTitle>
            <CardDescription>{successMessage}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>CBT reminders</CardTitle>
          <CardDescription>
            Reminders stay explicit and off by default. They should support use, not create pressure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="gap-4">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text>Daily reminder</Text>
              <Text variant="muted">Enable one repeating local reminder.</Text>
            </View>
            <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Label>Hour</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                onChangeText={setHourInput}
                placeholder="19"
                value={hourInput}
              />
            </View>
            <View className="flex-1 gap-2">
              <Label>Minute</Label>
              <Input
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
            disabled={updatePreferencesMutation.isPending}
            onPress={() => void savePreferences()}
          >
            {updatePreferencesMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{updatePreferencesMutation.isPending ? "Saving settings" : "Save reminder settings"}</Text>
          </Button>
        </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support and project links</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => router.push("/support")} variant="secondary">
            <Text>Open support page</Text>
          </Button>
          <Button onPress={() => router.push("/legal")} variant="ghost">
            <Text>Open legal and boundaries</Text>
          </Button>
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)} variant="ghost">
            <Text>Open GitHub repo</Text>
          </Button>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email ?? "Signed-in account"}</CardDescription>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => router.push("/account-deletion")} variant="ghost">
            <Text>Request account or data deletion</Text>
          </Button>
          <Button onPress={() => void handleSignOut()} variant="destructive">
            <Text>Sign out</Text>
          </Button>
          </View>
        </CardContent>
      </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
