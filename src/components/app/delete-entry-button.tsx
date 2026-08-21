import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";

interface DeleteEntryButtonProps {
  label: string;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  error?: string;
  /**
   * Called as the confirmation opens, so a caller rendering `error` can clear the
   * previous one. Without it a failed delete, cancelled, would still be on screen the
   * next time the dialog opens - this component owns `visible`, so only it knows.
   */
  onOpen?: () => void;
}

export function DeleteEntryButton({
  label,
  title,
  message,
  onConfirm,
  error,
  onOpen,
}: DeleteEntryButtonProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);

  /**
   * A rejected `onConfirm` means "it failed, stay open" - the dialog closes only on a
   * resolved one. Swallowing it here is what makes the `error` slot reachable at all
   * (#1335): before this, a failing delete escaped as an unhandled rejection, so the
   * only way to report it was a toast, and on Android a toast cannot rise above the
   * native modal this dialog is. The caller renders the reason through `error`.
   */
  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setVisible(false);
    } catch {
      // Reported by the caller through `error`; the confirmation stays open for it.
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        onPress={() => {
          onOpen?.();
          setVisible(true);
        }}
        variant="destructive"
      >
        <Text>{label}</Text>
      </Button>
      <ConfirmDialog
        visible={visible}
        isPending={pending}
        error={error}
        title={title}
        message={message}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onCancel={() => setVisible(false)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
