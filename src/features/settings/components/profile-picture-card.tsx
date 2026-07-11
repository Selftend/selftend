import type { User } from "@supabase/supabase-js";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Image, Platform, View } from "react-native";
import { useEffect, useState } from "react";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { AvatarCropModal } from "@/src/components/app/avatar-crop-modal";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  useRemoveUserAvatar,
  useResetUserAvatarToOAuth,
  useUpdateUserDisplayName,
  useUploadUserAvatar,
  useUserProfile,
} from "@/src/features/profile/queries";
import { getOAuthAvatarUrl } from "@/src/features/profile/repository";
import {
  AVATAR_MAX_SIZE,
  buildAvatarManipulation,
} from "@/src/features/settings/avatar-processing";
import { validatePickedAsset } from "@/src/features/settings/avatar-validation";
import { getErrorMessage } from "@/src/utils/error-message";

export function ProfilePictureCard({ user }: { user: User | null }) {
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

    const manipulation = buildAvatarManipulation(cropArea, AVATAR_MAX_SIZE);
    if (manipulation.crop) {
      context.crop(manipulation.crop);
    }
    context.resize(manipulation.resize);

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

      const validation = validatePickedAsset(asset);
      if (!validation.ok) {
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
              accessibilityLabel={t("profile.displayNameLabel")}
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
