import type { User } from "@supabase/supabase-js";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { useState } from "react";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";

import type { UserProfile } from "@/src/features/profile/profile-sync";
import {
  useRemoveUserAvatar,
  useResetUserAvatarToOAuth,
  useUploadUserAvatar,
} from "@/src/features/profile/queries";
import { getOAuthAvatarUrl } from "@/src/features/profile/repository";
import {
  AVATAR_MAX_SIZE,
  buildAvatarManipulation,
} from "@/src/features/settings/avatar-processing";
import { validatePickedAsset } from "@/src/features/settings/avatar-validation";
import { getErrorMessage } from "@/src/utils/error-message";

/**
 * All avatar mutation orchestration + the image pipeline, extracted verbatim
 * from `ProfilePictureCard`. The pure crop/resize derivation lives in
 * `buildAvatarManipulation`; size validation in `validatePickedAsset`. Web goes
 * through the in-app crop modal (`cropUri`), native uses the OS editor.
 */
export function useProfileAvatar(user: User | null, profile: UserProfile | null | undefined) {
  const { t } = useTranslation("settings");
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

  return {
    googleAvatarUrl,
    cropUri,
    message,
    error,
    isPending,
    uploadPending: uploadMutation.isPending,
    resetPending: resetMutation.isPending,
    removePending: removeMutation.isPending,
    pickAvatar,
    handleCropConfirm,
    handleCropCancel,
    restoreGoogleAvatar,
    removeAvatar,
  };
}
