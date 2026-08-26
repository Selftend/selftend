import { ActivityIndicator, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useExportData } from "@/src/features/settings/use-export-data";

interface GuestAbandonDialogProps {
  visible: boolean;
  /** The confirm action (the sign-in the person asked for) is in flight. */
  isPending: boolean;
  /**
   * Names the action being confirmed - "Sign in anyway" here, a provider
   * one-tap when #1445's conversion collision reuses this dialog before the
   * second OAuth dance.
   */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The warn-and-abandon confirm (#1444, spec §6): a guest is about to sign in
 * to another account, leaving this device's guest data behind. One calm
 * dialog - it warns, offers the existing export in place (no navigation), and
 * never blocks: "sign in anyway" proceeds.
 *
 * Composes ConfirmDialog (which owns the #1054 web unmount gate and the
 * frozen raw-Modal exemption) rather than mounting a Modal of its own; the
 * export button rides its children slot.
 */
export function GuestAbandonDialog({
  visible,
  isPending,
  confirmLabel,
  onCancel,
  onConfirm,
}: GuestAbandonDialogProps) {
  const { t } = useTranslation("auth");
  const { exportData, isPending: isExportPending } = useExportData();
  const [exportDelivered, setExportDelivered] = useState(false);

  const onExport = async () => {
    // The export toasts, but a toast renders under the dialog's Modal layer -
    // the inline line below is the confirmation the person can actually see
    // (#1335 is the same constraint on ConfirmDialog's error slot).
    setExportDelivered(await exportData());
  };

  return (
    <ConfirmDialog
      visible={visible}
      isPending={isPending}
      disabled={isExportPending}
      title={t("guestAbandon.title")}
      message={t("guestAbandon.message")}
      confirmLabel={confirmLabel}
      cancelLabel={t("common:cancel")}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <View className="gap-3">
        {exportDelivered ? (
          <Text className="text-sm text-muted-foreground" role="alert">
            {t("guestAbandon.exported")}
          </Text>
        ) : null}
        <Button
          disabled={isPending || isExportPending}
          onPress={() => void onExport()}
          testID="guest-abandon-export"
          variant="outline"
        >
          {isExportPending ? <ActivityIndicator /> : null}
          <Text>
            {isExportPending ? t("guestAbandon.exporting") : t("guestAbandon.exportFirst")}
          </Text>
        </Button>
      </View>
    </ConfirmDialog>
  );
}
