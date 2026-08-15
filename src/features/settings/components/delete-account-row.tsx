import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteAccountModal } from "@/src/components/app/delete-account-modal";
import { signOut } from "@/src/features/auth/api";
import { useDeleteUserAccount } from "@/src/features/settings/queries";
import { SettingsRow } from "@/src/features/settings/components/settings-row";

/**
 * `Delete my account`: destructive ink, no chevron, and a confirmation modal.
 *
 * No chevron, because the trailing slot means one thing and this row does not
 * navigate. `--destructive` ink and nothing else - no wash behind it, no warning
 * glyph beside it, no second copy of the confirmation the modal is about to show.
 *
 * The description is `This cannot be undone.` and not the drawn
 * *"Removes everything, permanently."* - `account.deleteWarning`, one tap later,
 * spells out the legal carve-out for data we may be required to keep, so
 * "everything" would be a promise the next screen withdraws.
 */
export function DeleteAccountRow() {
  const { t } = useTranslation("settings");
  const deleteMutation = useDeleteUserAccount();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      setOpen(false);
      // The one place `global` is the honest scope (#968): the account row is
      // gone, so every device's session is already dead server-side and this
      // says so rather than pretending only this device was left.
      await signOut("global");
    } catch {
      // Error is shown in the modal.
    }
  };

  return (
    <>
      <SettingsRow
        icon="delete-forever"
        label={t("account.deleteButton")}
        description={t("account.deleteHint")}
        trailing={{ kind: "act" }}
        destructive
        onPress={() => setOpen(true)}
        testID="settings-row-delete-account"
      />

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
