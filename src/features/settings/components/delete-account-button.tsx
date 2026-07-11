import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { DeleteAccountModal } from "@/src/components/app/delete-account-modal";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { signOut } from "@/src/features/auth/api";
import { useDeleteUserAccount } from "@/src/features/settings/queries";

export function DeleteAccountButton() {
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
