import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface AvatarControlsProps {
  isPending: boolean;
  uploadPending: boolean;
  resetPending: boolean;
  removePending: boolean;
  hasGoogleAvatar: boolean;
  /** `Boolean(profile?.avatarUrl || profile?.avatarStoragePath)`. */
  canRemove: boolean;
  onPick: () => void;
  onRestoreGoogle: () => void;
  onRemove: () => void;
}

/**
 * Change / use-Google / remove photo controls. Extracted verbatim from
 * `ProfilePictureCard`; handlers + pending flags come from `useProfileAvatar`.
 */
export function AvatarControls({
  isPending,
  uploadPending,
  resetPending,
  removePending,
  hasGoogleAvatar,
  canRemove,
  onPick,
  onRestoreGoogle,
  onRemove,
}: AvatarControlsProps) {
  const { t } = useTranslation("settings");

  return (
    <View className="flex-row flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={isPending} onPress={onPick}>
        {uploadPending ? <ActivityIndicator /> : <Icon name="photo-camera" size={16} />}
        <Text>{uploadPending ? t("profile.uploading") : t("profile.change")}</Text>
      </Button>
      {hasGoogleAvatar ? (
        <Button variant="outline" size="sm" disabled={isPending} onPress={onRestoreGoogle}>
          {resetPending ? <ActivityIndicator /> : null}
          <Text>{t("profile.useGoogle")}</Text>
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" disabled={isPending || !canRemove} onPress={onRemove}>
        {removePending ? <ActivityIndicator /> : null}
        <Text className="text-muted-foreground">{t("profile.remove")}</Text>
      </Button>
    </View>
  );
}
