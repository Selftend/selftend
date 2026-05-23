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

import { ProfileAvatar } from "@/src/components/app/profile-avatar";
import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { DeleteAccountModal } from "@/src/components/app/delete-account-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { signOut } from "@/src/features/auth/api";
import {
  useRemoveUserAvatar,
  useResetUserAvatarToOAuth,
  useUpdateUserDisplayName,
  useUploadUserAvatar,
  useUserProfile,
} from "@/src/features/profile/queries";
import { getOAuthAvatarUrl } from "@/src/features/profile/repository";
import {
  useDeleteUserAccount,
  useExportUserData,
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { appEnv } from "@/src/lib/env";
import { useSession } from "@/src/providers/session-provider";
import { AvatarCropModal } from "@/src/components/app/avatar-crop-modal";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

const AVATAR_MAX_SIZE = 512;

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
  const { data, isLoading } = useUserPreferences(user?.id ?? null);
  const resetOnboardingMutation = useUpdateOnboardingPreferences(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("account.signOutError");
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  const resetOnboarding = async () => {
    if (!user) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await resetOnboardingMutation.mutateAsync({
        appOnboardingCompleted: false,
        cbtOnboardingCompleted: false,
        gratitudeOnboardingCompleted: false,
        meditationInfoCompleted: false,
        habitsOnboardingCompleted: false,
        moodOnboardingCompleted: false,
        journalOnboardingCompleted: false,
        sleepOnboardingCompleted: false,
        mindfulnessOnboardingCompleted: false,
        groundingOnboardingCompleted: false,
        shownButtonTours: [],
      });

      setSuccessMessage(t("onboarding.resetSaved"));
      showToast({
        title: t("common:feedback.saved"),
        description: t("onboarding.resetSaved"),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("onboarding.resetError");
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("title")}</Text>
            </View>
            <Text variant="muted">{t("description")}</Text>
          </View>

          {isLoading ? <LoadingState title={t("loading")} /> : null}
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
              <Button onPress={() => router.push("/notifications")} variant="secondary">
                <Text>{t("reminders.openNotifications")}</Text>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("onboarding.title")}</CardTitle>
              <CardDescription>{t("onboarding.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={!data || resetOnboardingMutation.isPending}
                onPress={() => void resetOnboarding()}
                variant="secondary"
              >
                {resetOnboardingMutation.isPending ? <ActivityIndicator /> : null}
                <Text>
                  {resetOnboardingMutation.isPending
                    ? t("onboarding.resetting")
                    : t("onboarding.reset")}
                </Text>
              </Button>
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
  const updateNameMutation = useUpdateUserDisplayName(user?.id ?? null);
  const [nameValue, setNameValue] = useState("");
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cropUri, setCropUri] = useState<string | null>(null);

  useEffect(() => {
    setNameValue(profile?.displayName ?? "");
  }, [profile?.displayName]);

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

  const saveName = async () => {
    try {
      setNameMessage("");
      setNameError("");
      await updateNameMutation.mutateAsync(nameValue);
      setNameMessage(t("profile.nameSaved"));
    } catch (nameErr) {
      setNameError(getErrorMessage(nameErr, t("profile.nameError")));
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
                {profile?.displayName ? <Text numberOfLines={1}>{profile.displayName}</Text> : null}
                <Text
                  numberOfLines={1}
                  className={profile?.displayName ? "text-sm text-muted-foreground" : undefined}
                >
                  {user?.email ?? t("account.signedIn")}
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <Label>{t("profile.name")}</Label>
              <Input
                value={nameValue}
                onChangeText={setNameValue}
                placeholder={t("profile.namePlaceholder")}
                maxLength={100}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Button
                disabled={updateNameMutation.isPending}
                onPress={() => void saveName()}
                variant="secondary"
              >
                {updateNameMutation.isPending ? <ActivityIndicator /> : null}
                <Text>
                  {updateNameMutation.isPending ? t("profile.savingName") : t("profile.saveName")}
                </Text>
              </Button>
              {nameMessage ? (
                <Text className="text-sm text-muted-foreground">{nameMessage}</Text>
              ) : null}
              {nameError ? <Text className="text-sm text-destructive">{nameError}</Text> : null}
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
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      setOpen(false);
      await signOut();
    } catch {
      // Error is shown in the modal.
    }
  };

  return (
    <>
      <Button onPress={() => setOpen(true)} variant="ghost">
        <Text>{t("account.deleteButton")}</Text>
      </Button>

      <DeleteAccountModal
        isError={deleteMutation.isError}
        isPending={deleteMutation.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => void handleDelete()}
        visible={open}
      />
    </>
  );
}
