import type { User } from "@supabase/supabase-js";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AvatarCropModal } from "@/src/components/app/avatar-crop-modal";
import { Card } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUserProfile } from "@/src/features/profile/queries";
import { AvatarControls } from "@/src/features/settings/components/avatar-controls";
import { DisplayNameField } from "@/src/features/settings/components/display-name-field";
import { ProfileIdentityRow } from "@/src/features/settings/components/profile-identity-row";
import { useDisplayName } from "@/src/features/settings/use-display-name";
import { useProfileAvatar } from "@/src/features/settings/use-profile-avatar";
import { getErrorMessage } from "@/src/utils/error-message";

export function ProfilePictureCard({ user }: { user: User | null }) {
  const { t } = useTranslation("settings");
  const { data: profile, error: profileError } = useUserProfile(user);
  const displayNameField = useDisplayName(user?.id ?? null, profile);
  const avatar = useProfileAvatar(user, profile);

  const displayName = profile?.displayName ?? user?.email ?? "";
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <Card className="gap-4 p-5">
        <View className="gap-1">
          <Text className="text-base font-semibold">{t("profile.title")}</Text>
          <Text className="text-xs leading-snug text-muted-foreground">
            {t("profile.description")}
          </Text>
        </View>

        <ProfileIdentityRow
          avatarUri={profile?.avatarUrl ?? avatar.googleAvatarUrl ?? undefined}
          hasAvatar={Boolean(profile?.avatarUrl || avatar.googleAvatarUrl)}
          name={profile?.displayName ?? user?.email ?? ""}
          showEmail={Boolean(profile?.displayName)}
          email={user?.email ?? ""}
          initial={displayInitial}
        />

        <DisplayNameField
          value={displayNameField.value}
          setValue={displayNameField.setValue}
          save={() => void displayNameField.save()}
          isPending={displayNameField.isPending}
          message={displayNameField.message}
          error={displayNameField.error}
        />

        <AvatarControls
          isPending={avatar.isPending}
          uploadPending={avatar.uploadPending}
          resetPending={avatar.resetPending}
          removePending={avatar.removePending}
          hasGoogleAvatar={Boolean(avatar.googleAvatarUrl)}
          canRemove={Boolean(profile?.avatarUrl || profile?.avatarStoragePath)}
          onPick={() => void avatar.pickAvatar()}
          onRestoreGoogle={() => void avatar.restoreGoogleAvatar()}
          onRemove={() => void avatar.removeAvatar()}
        />

        {avatar.message ? (
          <Text className="text-sm text-muted-foreground">{avatar.message}</Text>
        ) : null}
        {profileError ? (
          <Text className="text-sm text-destructive">
            {getErrorMessage(profileError, t("profile.loadError"))}
          </Text>
        ) : null}
        {avatar.error ? <Text className="text-sm text-destructive">{avatar.error}</Text> : null}
      </Card>
      {Platform.OS === "web" && avatar.cropUri ? (
        <AvatarCropModal
          imageUri={avatar.cropUri}
          onCancel={avatar.handleCropCancel}
          onCrop={(area) => void avatar.handleCropConfirm(area)}
          visible
        />
      ) : null}
    </>
  );
}
