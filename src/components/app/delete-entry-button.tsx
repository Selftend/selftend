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
}

export function DeleteEntryButton({
  label,
  title,
  message,
  onConfirm,
  error,
}: DeleteEntryButtonProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setVisible(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button onPress={() => setVisible(true)} variant="destructive">
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
