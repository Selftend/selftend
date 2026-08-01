import type { User } from "@supabase/supabase-js";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DeleteAccountButton } from "@/src/features/settings/components/delete-account-button";
import { ExportDataButton } from "@/src/features/settings/components/export-data-button";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";
import { getRunningVersion } from "@/src/lib/update-availability";

interface AccountCardProps {
  user: User | null;
  /**
   * Sign-out handler owned by the screen (`useSignOut`) so its failure writes the
   * single shared error banner (R7).
   */
  onSignOut: () => void;
}

/** Account section: email, export, sign-out, delete. Extracted verbatim. */
export function AccountCard({ user, onSignOut }: AccountCardProps) {
  const { t } = useTranslation("settings");

  const appVersion = getRunningVersion();

  return (
    <SettingsSectionCard
      icon="manage-accounts"
      iconClassName="text-muted-foreground"
      badgeClassName="bg-muted"
      title={t("account.title")}
      description={user?.email ?? t("account.signedIn")}
    >
      <View className="gap-3">
        <ExportDataButton />
        <Button variant="outline" className="justify-start" onPress={onSignOut}>
          <Icon name="logout" size={18} />
          <Text>{t("account.signOut")}</Text>
        </Button>
        {/* Destructive action stays last - and stays the only red element. */}
        <DeleteAccountButton />
        {/* The running app version - the one place it is shown in-app. Reads
            the same value the update banner compares against, so a user can
            check what they are on when an update is offered. */}
        {appVersion ? (
          <Text variant="muted" className="text-center text-xs">
            {t("account.version", { version: appVersion })}
          </Text>
        ) : null}
      </View>
    </SettingsSectionCard>
  );
}
