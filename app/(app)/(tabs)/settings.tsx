import type { User } from "@supabase/supabase-js";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

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
import { AvatarCropModal } from "@/src/components/avatar-crop-modal";

const AVATAR_MAX_SIZE = 512;

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
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hourInput, setHourInput] = useState(String(defaultUserPreferences.cbtReminderHour));
  const [minuteInput, setMinuteInput] = useState(String(defaultUserPreferences.cbtReminderMinute));
  const [remindersEnabled, setRemindersEnabled] = useState(
    defaultUserPreferences.cbtRemindersEnabled,
  );
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
        language: data?.language ?? "en",
      });

      if (remindersEnabled && !reminderConsent) {
        setErrorMessage(t("reminders.permissionDenied"));
        return;
      }

      setSuccessMessage(t("saved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("saveError"));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("account.signOutError"));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("title")}</Text>
            <Text variant="muted">{t("description")}</Text>
          </View>

          {isLoading ? (
            <View className="items-center justify-center gap-3 p-6">
              <ActivityIndicator />
              <Text variant="muted">{t("loading")}</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("problem")}</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          {successMessage ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("saved")}</CardTitle>
                <CardDescription>{successMessage}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <ProfilePictureCard user={user} />

          <Card>
            <CardHeader>
              <CardTitle>{t("reminders.title")}</CardTitle>
              <CardDescription>{t("reminders.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1 gap-1">
                    <Text>{t("reminders.daily")}</Text>
                    <Text variant="muted">{t("reminders.dailyHint")}</Text>
                  </View>
                  <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-2">
                    <Label>{t("reminders.hour")}</Label>
                    <Input
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      onChangeText={setHourInput}
                      placeholder={t("reminders.hourPlaceholder")}
                      value={hourInput}
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Label>{t("reminders.minute")}</Label>
                    <Input
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      onChangeText={setMinuteInput}
                      placeholder={t("reminders.minutePlaceholder")}
                      value={minuteInput}
                    />
                  </View>
                </View>
                <Button
                  disabled={updatePreferencesMutation.isPending}
                  onPress={() => void savePreferences()}
                >
                  {updatePreferencesMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : null}
                  <Text>
                    {updatePreferencesMutation.isPending
                      ? t("savingSettings")
                      : t("reminders.save")}
                  </Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("support.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <Button onPress={() => router.push("/support")} variant="secondary">
                  <Text>{t("support.openSupport")}</Text>
                </Button>
                <Button onPress={() => router.push("/legal")} variant="ghost">
                  <Text>{t("support.openLegal")}</Text>
                </Button>
                {Platform.OS === "web" ? (
                  <Button onPress={() => router.push("/cookies")} variant="ghost">
                    <Text>{t("support.cookiePreferences")}</Text>
                  </Button>
                ) : null}
                <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)} variant="ghost">
                  <Text>{t("support.openGithub")}</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("account.title")}</CardTitle>
              <CardDescription>{user?.email ?? t("account.signedIn")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <ExportDataButton />
                <DeleteAccountButton />
                <Button onPress={() => void handleSignOut()} variant="destructive">
                  <Text>{t("account.signOut")}</Text>
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
  const { t } = useTranslation("settings");
  const { data: profile, error: profileError } = useUserProfile(user);
  const uploadMutation = useUploadUserAvatar(user?.id ?? null);
  const resetMutation = useResetUserAvatarToOAuth(user);
  const removeMutation = useRemoveUserAvatar(user?.id ?? null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cropUri, setCropUri] = useState<string | null>(null);

  const googleAvatarUrl = getOAuthAvatarUrl(user);
  const isPending = uploadMutation.isPending || resetMutation.isPending || removeMutation.isPending;

  const processAndUpload = async (uri: string, cropArea?: Area) => {
    const context = ImageManipulator.ImageManipulator.manipulate(uri);

    if (cropArea) {
      context.crop({
        originX: cropArea.x,
        originY: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
      });
    }

    context.resize({ width: AVATAR_MAX_SIZE, height: AVATAR_MAX_SIZE });

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      base64: true,
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    await uploadMutation.mutateAsync({
      base64: result.base64,
      fileName: "avatar.jpg",
      mimeType: "image/jpeg",
      previousStoragePath: profile?.avatarStoragePath,
      uri: result.uri,
    });
  };

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
          setError(t("profile.permissionNeeded"));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: Platform.OS !== "web",
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
        setError(t("profile.tooLarge"));
        return;
      }

      if (Platform.OS === "web") {
        setCropUri(asset.uri);
        return;
      }

      await processAndUpload(asset.uri);
      setMessage(t("profile.updated"));
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, t("profile.error")));
    }
  };

  const handleCropConfirm = async (croppedArea: Area) => {
    setCropUri(null);

    try {
      if (!cropUri) {
        return;
      }

      await processAndUpload(cropUri, croppedArea);
      setMessage(t("profile.updated"));
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, t("profile.error")));
    }
  };

  const handleCropCancel = () => {
    setCropUri(null);
  };

  const restoreGoogleAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      setMessage("");
      setError("");
      await resetMutation.mutateAsync(profile?.avatarStoragePath);
      setMessage(googleAvatarUrl ? t("profile.googleRestored") : t("profile.reset"));
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, t("profile.resetError")));
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
      setMessage(t("profile.removed"));
    } catch (avatarError) {
      setError(getErrorMessage(avatarError, t("profile.removeError")));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.description")}</CardDescription>
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
                <Text numberOfLines={1}>{user?.email ?? t("account.signedIn")}</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <Button disabled={isPending} onPress={() => void pickAvatar()} variant="secondary">
                {uploadMutation.isPending ? <ActivityIndicator /> : null}
                <Text>
                  {uploadMutation.isPending ? t("profile.uploading") : t("profile.change")}
                </Text>
              </Button>
              {googleAvatarUrl ? (
                <Button
                  disabled={isPending}
                  onPress={() => void restoreGoogleAvatar()}
                  variant="outline"
                >
                  {resetMutation.isPending ? <ActivityIndicator /> : null}
                  <Text>{t("profile.useGoogle")}</Text>
                </Button>
              ) : null}
              <Button
                disabled={isPending || (!profile?.avatarUrl && !profile?.avatarStoragePath)}
                onPress={() => void removeAvatar()}
                variant="ghost"
              >
                {removeMutation.isPending ? <ActivityIndicator /> : null}
                <Text>{t("profile.remove")}</Text>
              </Button>
            </View>

            {message ? <Text className="text-sm text-muted-foreground">{message}</Text> : null}
            {profileError ? (
              <Text className="text-sm text-destructive">
                {getErrorMessage(profileError, t("profile.loadError"))}
              </Text>
            ) : null}
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          </View>
        </CardContent>
      </Card>
      {Platform.OS === "web" && cropUri ? (
        <AvatarCropModal
          imageUri={cropUri}
          onCancel={handleCropCancel}
          onCrop={(area) => void handleCropConfirm(area)}
          visible
        />
      ) : null}
    </>
  );
}

function ExportDataButton() {
  const { t } = useTranslation("settings");
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
        <Text>{exportMutation.isPending ? t("account.exporting") : t("account.exportButton")}</Text>
      </Button>
      {exported ? (
        <Text className="text-sm text-muted-foreground">{t("account.exported")}</Text>
      ) : null}
      {exportMutation.isError ? (
        <Text className="text-sm text-destructive">{t("account.exportError")}</Text>
      ) : null}
    </View>
  );
}

function DeleteAccountButton() {
  const { t } = useTranslation("settings");
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
          <Text>{t("account.deleteButton")}</Text>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("account.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("account.deleteDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <View className="gap-2 py-2">
          <Label>{t("account.deleteConfirmLabel")}</Label>
          <Input
            autoCapitalize="characters"
            onChangeText={setConfirmInput}
            placeholder={t("account.deleteConfirmPlaceholder")}
            value={confirmInput}
          />
          {deleteMutation.isError ? (
            <Text className="text-sm text-destructive">{t("account.deleteFailed")}</Text>
          ) : null}
        </View>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>{t("account.cancel")}</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmInput !== "DELETE" || deleteMutation.isPending}
            onPress={() => void handleDelete()}
          >
            <Text>
              {deleteMutation.isPending ? t("account.deleting") : t("account.deletePermanently")}
            </Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
