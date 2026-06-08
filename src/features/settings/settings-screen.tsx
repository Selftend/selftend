import type { User } from "@supabase/supabase-js";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ActivityIndicator, Image, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { DeleteAccountModal } from "@/src/components/app/delete-account-modal";
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
import { authenticate, isBiometricAvailable } from "@/src/features/security/biometric";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
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
      <ScrollView contentContainerClassName="grow p-4">
        <View className="gap-6">
          {/* Hero */}
          <View className="mt-2">
            <Text variant="eyebrow">{t("account.eyebrow")}</Text>
            <Text
              variant="h1"
              className="mt-2 text-[36px] font-extrabold leading-[1.1] tracking-tight"
            >
              {t("title")}
            </Text>
            <Text className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground max-w-[60ch]">
              {t("account.intro")}
            </Text>
          </View>

          {isLoading ? <LoadingState title={t("loading")} /> : null}
          {errorMessage ? (
            <Card className="gap-4 p-5">
              <View className="gap-1">
                <Text className="text-base font-semibold">{t("problem")}</Text>
                <Text className="text-xs leading-snug text-muted-foreground">{errorMessage}</Text>
              </View>
            </Card>
          ) : null}
          {successMessage ? (
            <Card className="gap-4 p-5">
              <View className="gap-1">
                <Text className="text-base font-semibold">{t("saved")}</Text>
                <Text className="text-xs leading-snug text-muted-foreground">{successMessage}</Text>
              </View>
            </Card>
          ) : null}

          <ProfilePictureCard user={user} />

          {/* Reminders section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--be)/0.10)]"
              >
                <Icon name="notifications-active" size={20} className="text-be" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("reminders.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {t("reminders.description")}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              className="justify-start"
              onPress={() => router.push("/notifications")}
            >
              <Icon name="tune" size={18} />
              <Text className="flex-1">{t("reminders.openNotifications")}</Text>
              <Icon name="chevron-right" size={18} className="text-muted-foreground" />
            </Button>
          </Card>

          <SecuritySection />

          {/* Onboarding section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--iris)/0.10)]"
              >
                <Icon name="auto-stories" size={20} className="text-iris" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("onboardingSection.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {t("onboardingSection.description")}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              className="justify-start"
              disabled={!data || resetOnboardingMutation.isPending}
              onPress={() => void resetOnboarding()}
            >
              {resetOnboardingMutation.isPending ? <ActivityIndicator /> : null}
              <Icon name="replay" size={18} />
              <Text className="flex-1">
                {resetOnboardingMutation.isPending
                  ? t("onboarding.resetting")
                  : t("onboardingSection.reset")}
              </Text>
            </Button>
          </Card>

          {/* Support section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--aqua)/0.10)]"
              >
                <Icon name="help-outline" size={20} className="text-aqua" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("support.title")}</Text>
              </View>
            </View>
            <View className="gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onPress={() => router.push("/support")}
              >
                <Icon name="support-agent" size={18} />
                <Text className="flex-1">{t("support.openSupport")}</Text>
                <Icon name="chevron-right" size={18} className="text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onPress={() => router.push("/legal")}
              >
                <Icon name="gavel" size={18} />
                <Text className="flex-1">{t("support.openLegal")}</Text>
                <Icon name="chevron-right" size={18} className="text-muted-foreground" />
              </Button>
              {Platform.OS === "web" ? (
                <Button
                  variant="outline"
                  className="justify-start"
                  onPress={() => router.push("/cookies")}
                >
                  <Icon name="cookie" size={18} />
                  <Text className="flex-1">{t("support.cookiePreferences")}</Text>
                  <Icon name="chevron-right" size={18} className="text-muted-foreground" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="justify-start"
                onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}
              >
                <Icon name="code" size={18} />
                <Text className="flex-1">{t("support.openGithub")}</Text>
              </Button>
            </View>
          </Card>

          {/* Account section */}
          <Card className="gap-4 p-5">
            <View className="flex-row items-start gap-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--clay)/0.10)]"
              >
                <Icon name="manage-accounts" size={20} className="text-clay" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-base font-semibold">{t("account.title")}</Text>
                <Text className="mt-1 text-xs leading-snug text-muted-foreground">
                  {user?.email ?? t("account.signedIn")}
                </Text>
              </View>
            </View>
            <View className="gap-3">
              <ExportDataButton />
              <DeleteAccountButton />
              <Button
                variant="destructive"
                className="justify-start"
                onPress={() => void handleSignOut()}
              >
                <Icon name="logout" size={18} />
                <Text>{t("account.signOut")}</Text>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SecuritySection() {
  const { t } = useTranslation("settings");
  const enabled = useAppLockStore((s) => s.enabled);
  const setEnabled = useAppLockStore((s) => s.setEnabled);
  const hydrate = useAppLockStore((s) => s.hydrate);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate().catch(() => {});
    let active = true;
    void isBiometricAvailable()
      .then((result) => {
        if (active) {
          setAvailable(result);
        }
      })
      .catch(() => {
        if (active) {
          setAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  // Native-only: the app lock never appears on web (which relies on browser session + logout).
  if (Platform.OS === "web") {
    return null;
  }

  const canToggle = available === true && !busy;

  const handleToggle = async (next: boolean) => {
    // Turning the lock ON requires a successful auth so the user can't lock themselves out.
    // Turning it OFF is allowed without a prompt.
    if (next) {
      setBusy(true);
      try {
        const confirmed = await authenticate(t("security.appLockConfirm"));
        if (confirmed) {
          await setEnabled(true);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    await setEnabled(false);
  };

  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-start gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="h-9 w-9 items-center justify-center rounded-[10px] bg-[hsl(var(--iris)/0.10)]"
        >
          <Icon name="shield" size={20} className="text-iris" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold">{t("security.title")}</Text>
          <Text className="mt-1 text-xs leading-snug text-muted-foreground">
            {t("security.description")}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-3 rounded-xl border border-border p-3">
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold">{t("security.appLock")}</Text>
            <Text className="mt-1 text-xs leading-snug text-muted-foreground">
              {available === false
                ? t("security.appLockUnavailable")
                : t("security.appLockDescription")}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t("security.appLock")}
            checked={enabled}
            disabled={!canToggle}
            onCheckedChange={(next) => void handleToggle(next)}
          />
        </View>

        <Button
          variant="outline"
          className="justify-start"
          onPress={() => router.push("/security")}
        >
          <Icon name="lock" size={18} />
          <Text className="flex-1">{t("security.openSecurity")}</Text>
          <Icon name="chevron-right" size={18} className="text-muted-foreground" />
        </Button>
      </View>
    </Card>
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

  const displayName = profile?.displayName ?? user?.email ?? "";
  const displayInitial = displayName.charAt(0).toUpperCase();

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
      <Card className="gap-4 p-5">
        <View className="gap-1">
          <Text className="text-base font-semibold">{t("profile.title")}</Text>
          <Text className="text-xs leading-snug text-muted-foreground">
            {t("profile.description")}
          </Text>
        </View>

        {/* Identity row: gradient avatar + name + email */}
        <View className="flex-row items-center gap-4 rounded-xl border border-border p-3">
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            className="h-14 w-14 items-center justify-center overflow-hidden rounded-full"
          >
            <LinearGradient
              colors={["hsla(262, 62%, 56%, 0.18)", "hsla(280, 48%, 60%, 0.20)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {profile?.avatarUrl || googleAvatarUrl ? (
              <Image
                source={{ uri: profile?.avatarUrl ?? googleAvatarUrl ?? undefined }}
                style={{ width: 56, height: 56 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text className="text-2xl font-bold text-primary">{displayInitial}</Text>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-semibold" numberOfLines={1}>
              {profile?.displayName ?? user?.email ?? ""}
            </Text>
            {profile?.displayName ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <Icon name="mail" size={13} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {user?.email ?? ""}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Display name input + Save button */}
        <View>
          <Label className="mb-1.5 text-sm font-semibold">{t("profile.displayNameLabel")}</Label>
          <View className="flex-row gap-2 mt-1.5">
            <Input
              className="flex-1"
              value={nameValue}
              onChangeText={setNameValue}
              placeholder={t("profile.namePlaceholder")}
              maxLength={100}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Button disabled={updateNameMutation.isPending} onPress={() => void saveName()}>
              {updateNameMutation.isPending ? <ActivityIndicator /> : null}
              <Text>
                {updateNameMutation.isPending ? t("profile.savingName") : t("profile.saveName")}
              </Text>
            </Button>
          </View>
          {nameMessage ? (
            <Text className="mt-1.5 text-sm text-muted-foreground">{nameMessage}</Text>
          ) : null}
          {nameError ? <Text className="mt-1.5 text-sm text-destructive">{nameError}</Text> : null}
        </View>

        {/* Photo controls */}
        <View className="flex-row flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onPress={() => void pickAvatar()}
          >
            {uploadMutation.isPending ? (
              <ActivityIndicator />
            ) : (
              <Icon name="photo-camera" size={16} />
            )}
            <Text>{uploadMutation.isPending ? t("profile.uploading") : t("profile.change")}</Text>
          </Button>
          {googleAvatarUrl ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onPress={() => void restoreGoogleAvatar()}
            >
              {resetMutation.isPending ? <ActivityIndicator /> : null}
              <Text>{t("profile.useGoogle")}</Text>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending || (!profile?.avatarUrl && !profile?.avatarStoragePath)}
            onPress={() => void removeAvatar()}
          >
            {removeMutation.isPending ? <ActivityIndicator /> : null}
            <Text className="text-muted-foreground">{t("profile.remove")}</Text>
          </Button>
        </View>

        {message ? <Text className="text-sm text-muted-foreground">{message}</Text> : null}
        {profileError ? (
          <Text className="text-sm text-destructive">
            {getErrorMessage(profileError, t("profile.loadError"))}
          </Text>
        ) : null}
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
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
        variant="outline"
        className="justify-start"
        disabled={exportMutation.isPending}
        onPress={() => void handleExport()}
      >
        {exportMutation.isPending ? <ActivityIndicator /> : <Icon name="download" size={18} />}
        <Text className="flex-1">
          {exportMutation.isPending ? t("account.exporting") : t("account.exportButton")}
        </Text>
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
      <Button variant="ghost" className="justify-start" onPress={() => setOpen(true)}>
        <Icon name="delete-forever" size={18} className="text-destructive" />
        <Text className="text-destructive">{t("account.deleteButton")}</Text>
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
