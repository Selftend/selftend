import type { User } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { ProfileAvatar } from "@/components/profile-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { signOut } from "@/src/features/auth/api";
import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  useRemoveUserAvatar,
  useResetUserAvatarToOAuth,
  useUploadUserAvatar,
  useUserProfile,
} from "@/src/features/profile/queries";
import { getOAuthAvatarUrl } from "@/src/features/profile/repository";
import {
  useDeleteUserAccount,
  useExportUserData,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { appEnv } from "@/src/lib/env";
import { cancelCbtReminder, scheduleCbtReminder } from "@/src/lib/notifications";
import { useSession } from "@/src/providers/session-provider";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
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
        privacyPolicyAcceptedAt: data?.privacyPolicyAcceptedAt ?? null,
        termsAcceptedAt: data?.termsAcceptedAt ?? null,
        policyVersionAccepted: data?.policyVersionAccepted ?? null,
        cookieConsent: data?.cookieConsent ?? null,
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
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

      <ProfilePictureCard user={user} />

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
          {Platform.OS === "web" ? (
            <Button onPress={() => router.push("/cookies")} variant="ghost">
              <Text>Cookie preferences</Text>
            </Button>
          ) : null}
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
          <ExportDataButton />
          <DeleteAccountButton />
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

function ProfilePictureCard({ user }: { user: User | null }) {
  const { data: profile, error: profileError, isLoading } = useUserProfile(user);
  const uploadMutation = useUploadUserAvatar(user?.id ?? null);
  const resetMutation = useResetUserAvatarToOAuth(user);
  const removeMutation = useRemoveUserAvatar(user?.id ?? null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const googleAvatarUrl = getOAuthAvatarUrl(user);
  const isPending =
    uploadMutation.isPending || resetMutation.isPending || removeMutation.isPending;

  const pickAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      setMessage("");
      setError("");

      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Photo library access is needed to choose a profile picture.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        return;
      }

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setError("Choose an image smaller than 5 MB.");
        return;
      }

      await uploadMutation.mutateAsync({
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        previousStoragePath: profile?.avatarStoragePath,
        uri: asset.uri,
      });
      setMessage("Profile picture updated.");
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, "Unable to update profile picture."));
    }
  };

  const useGoogleAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      setMessage("");
      setError("");
      await resetMutation.mutateAsync(profile?.avatarStoragePath);
      setMessage(googleAvatarUrl ? "Google photo restored." : "Profile picture reset.");
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, "Unable to reset profile picture."));
    }
  };

  const removeAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      setMessage("");
      setError("");
      await removeMutation.mutateAsync(profile?.avatarStoragePath);
      setMessage("Profile picture removed.");
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, "Unable to remove profile picture."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile picture</CardTitle>
        <CardDescription>
          Used on your signed-in account surfaces. You can restore your Google photo after choosing or removing a custom
          photo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View className="gap-4">
          <View className="flex-row items-center gap-4">
            <ProfileAvatar
              avatarUrl={profile?.avatarUrl}
              className="size-16"
              email={user?.email}
            />
            <View className="flex-1 gap-1">
              <Text numberOfLines={1}>{user?.email ?? "Signed-in account"}</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <Button disabled={isPending} onPress={() => void pickAvatar()} variant="secondary">
              {uploadMutation.isPending ? <ActivityIndicator /> : null}
              <Text>{uploadMutation.isPending ? "Uploading..." : "Change photo"}</Text>
            </Button>
            {googleAvatarUrl ? (
              <Button disabled={isPending} onPress={() => void useGoogleAvatar()} variant="outline">
                {resetMutation.isPending ? <ActivityIndicator /> : null}
                <Text>Use Google photo</Text>
              </Button>
            ) : null}
            <Button
              disabled={isPending || (!profile?.avatarUrl && !profile?.avatarStoragePath)}
              onPress={() => void removeAvatar()}
              variant="ghost"
            >
              {removeMutation.isPending ? <ActivityIndicator /> : null}
              <Text>Remove photo</Text>
            </Button>
          </View>

          {message ? <Text className="text-sm text-muted-foreground">{message}</Text> : null}
          {profileError ? (
            <Text className="text-sm text-destructive">
              {getErrorMessage(profileError, "Unable to load profile picture.")}
            </Text>
          ) : null}
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        </View>
      </CardContent>
    </Card>
  );
}

function ExportDataButton() {
  const exportMutation = useExportUserData();
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportMutation.mutateAsync();
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `selftend-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // On mobile, use the built-in Share API
        const { Share } = await import("react-native");
        await Share.share({
          message: json,
          title: "Selftend Data Export",
        });
      }

      setExported(true);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <View className="gap-2">
      <Button
        disabled={exportMutation.isPending}
        onPress={() => void handleExport()}
        variant="secondary"
      >
        {exportMutation.isPending ? <ActivityIndicator /> : null}
        <Text>{exportMutation.isPending ? "Exporting..." : "Export my data"}</Text>
      </Button>
      {exported ? (
        <Text className="text-sm text-muted-foreground">Data exported successfully.</Text>
      ) : null}
      {exportMutation.isError ? (
        <Text className="text-sm text-destructive">Export failed. Please try again.</Text>
      ) : null}
    </View>
  );
}

function DeleteAccountButton() {
  const deleteMutation = useDeleteUserAccount();
  const [confirmInput, setConfirmInput] = useState("");
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      await signOut();
    } catch {
      // Error shown in dialog
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">
          <Text>Delete my account</Text>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and all data including thought records, preferences, and profile. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <View className="gap-2 py-2">
          <Label>Type DELETE to confirm</Label>
          <Input
            autoCapitalize="characters"
            onChangeText={setConfirmInput}
            placeholder="DELETE"
            value={confirmInput}
          />
          {deleteMutation.isError ? (
            <Text className="text-sm text-destructive">
              Deletion failed. Please try again or contact support.
            </Text>
          ) : null}
        </View>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>Cancel</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmInput !== "DELETE" || deleteMutation.isPending}
            onPress={() => void handleDelete()}
          >
            <Text>{deleteMutation.isPending ? "Deleting..." : "Delete permanently"}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
