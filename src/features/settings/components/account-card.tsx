import type { User } from "@supabase/supabase-js";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DeleteAccountButton } from "@/src/features/settings/components/delete-account-button";
import { ExportDataButton } from "@/src/features/settings/components/export-data-button";
import { SettingsSectionCard } from "@/src/features/settings/components/settings-section-card";

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

  return (
    <SettingsSectionCard
      icon="manage-accounts"
      iconClassName="text-clay"
      badgeClassName="bg-[hsl(var(--clay)/0.10)]"
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
      </View>
    </SettingsSectionCard>
  );
}
