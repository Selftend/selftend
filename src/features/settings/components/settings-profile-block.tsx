import { resolveAvatarUrl } from "@/src/features/profile/avatar-url";
import type { User } from "@supabase/supabase-js";
import { Platform, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AvatarCropModal } from "@/src/components/app/avatar-crop-modal";
import { Disclosure } from "@/src/components/app/disclosure";
import { Text } from "@/src/components/react-native-reusables/text";
import { getInitial } from "@/src/features/profile/avatar-initial";
import { resolveDisplayName } from "@/src/features/profile/display-name";
import { useUserProfile } from "@/src/features/profile/queries";
import { AvatarControls } from "@/src/features/settings/components/avatar-controls";
import { DisplayNameField } from "@/src/features/settings/components/display-name-field";
import { ProfileIdentityRow } from "@/src/features/settings/components/profile-identity-row";
import { SettingsRun } from "@/src/features/settings/components/settings-run";
import { useDisplayName } from "@/src/features/settings/use-display-name";
import { useProfileAvatar } from "@/src/features/settings/use-profile-avatar";
import { getErrorMessage } from "@/src/utils/error-message";

/** Which disclosure is open, or `null`. One at a time by construction. */
type OpenPanel = "name" | "photo" | null;

/**
 * The page's identity header: avatar, name, email - and two in-place disclosures
 * behind it.
 *
 * `Edit name` reveals the display-name field; `Change photo` reveals all three
 * photo controls. Neither is a route and neither is a modal:
 *
 *   - **Not a route.** Arrange earned its own screen by having a page mode and a
 *     hardware-back problem to solve. A 44px region that shows one input has
 *     neither, and a route costs a navigation both ways to change one string.
 *   - **Not a modal.** This screen already opens two (avatar crop, delete
 *     confirmation), and a third would make "something covered the page" the
 *     normal state of settings.
 *
 * One open at a time, so the block never grows taller than the thing being
 * edited, and `aria-expanded` sits on each trigger - a collapsed disclosure
 * unmounts its content, so the fields it hides leave the tab order with it.
 */
export function SettingsProfileBlock({ user }: { user: User | null }) {
  const { t } = useTranslation("settings");
  const { data: profile, error: profileError } = useUserProfile(user);
  const displayNameField = useDisplayName(user?.id ?? null, profile);
  const avatar = useProfileAvatar(user, profile);
  const [open, setOpen] = useState<OpenPanel>(null);

  /*
    The identity slot shows the most specific thing known about the person, and
    names the state when nothing is (#1829, #1810).

    ☠️ `||` at EVERY step, never `??`. An anonymous user's `user.email` is `""`,
    not `undefined`, and the type is `email?: string` so a `??` chain typechecks
    perfectly and then renders a blank line beside an empty circle - which is
    exactly what this page shipped. `||` is correct under both shapes.

    ☠️ And no `is_anonymous` branch: the JWT keeps claiming it after a guest
    converts. This expression needs no guard, because `guest` is reachable only
    with no email and only a guest has none - every registered identity attaches
    one (password, Google, and Apple's private relay), and there is no phone auth.

    `resolveDisplayName` also fixes a bug that was never guest-only: it reads
    `full_name` THEN `name`, while the hand-rolled line above read neither, so a
    provider that supplies only `name` put the EMAIL in the name slot here while
    the header showed the name.
  */
  const name = resolveDisplayName(profile, user);
  const email = user?.email ?? "";
  const primaryLine = name || email || t("navigation:userMenu.guest");
  const displayInitial = getInitial(name, email);
  const showEmail = Boolean(name && email);
  // Shared with the header (#970); the inline fallback this replaces is what let the two
  // surfaces answer the same `Remove photo` tap differently.
  const avatarUrl = resolveAvatarUrl(profile, user);

  const toggle = (panel: Exclude<OpenPanel, null>) =>
    setOpen((current) => (current === panel ? null : panel));

  return (
    <>
      <View className="gap-3">
        <ProfileIdentityRow
          avatarUri={avatarUrl ?? undefined}
          hasAvatar={Boolean(avatarUrl)}
          name={primaryLine}
          showEmail={showEmail}
          email={email}
          initial={displayInitial}
        />

        {profileError ? (
          <Text className="text-sm text-destructive">
            {getErrorMessage(profileError, t("profile.loadError"))}
          </Text>
        ) : null}

        {/*
          The same `SettingsRun` the four labelled runs use, without a label:
          restating its card chrome and hairline rule here is how the profile
          panel and the runs drift into looking like different kinds of thing.
        */}
        <SettingsRun testID="settings-profile-panel">
          <View className="py-3.5">
            <Disclosure
              label={t("profile.editName")}
              expanded={open === "name"}
              onToggle={() => toggle("name")}
              testID="settings-edit-name"
            >
              <DisplayNameField
                value={displayNameField.value}
                setValue={displayNameField.setValue}
                save={() => void displayNameField.save()}
                isPending={displayNameField.isPending}
                message={displayNameField.message}
                error={displayNameField.error}
              />
            </Disclosure>
          </View>

          <View className="py-3.5">
            <Disclosure
              label={t("profile.change")}
              expanded={open === "photo"}
              onToggle={() => toggle("photo")}
              testID="settings-change-photo"
            >
              {/*
                All three controls stay. #970 made the header and this row agree on
                ONE avatar expression, so they no longer answer the same tap
                differently - but for a Google user who never uploaded, `Use Google
                photo` and `Remove photo` now land on the same picture in both places.
                That redundancy is a copy and product question about the buttons, and
                a design pass merging them still has to answer it first.

                The messages stay inline rather than becoming toasts: they are
                what the disclosure has to say for itself, and a toast that has
                already faded cannot explain why the photo did not change.
              */}
              <View className="gap-2">
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
                {avatar.error ? (
                  <Text className="text-sm text-destructive">{avatar.error}</Text>
                ) : null}
              </View>
            </Disclosure>
          </View>
        </SettingsRun>
      </View>

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
