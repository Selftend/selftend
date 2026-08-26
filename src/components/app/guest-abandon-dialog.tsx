import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { useExportData } from "@/src/features/settings/use-export-data";

interface GuestAbandonDialogProps {
  visible: boolean;
  /** True while the guarded sign-in runs after "proceed". */
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The warn-and-abandon confirm (#1444, spec §6): a guest about to sign in to
 * an existing account is told, once and calmly, that what they saved on this
 * device stays behind - with an "Export your data first" action that runs the
 * existing export IN PLACE, no navigation. It warns; it never blocks.
 *
 * `useGuestAbandonGuard` owns when this shows; #1445's OAuth linking path
 * reuses the same pair, so the copy stays method-agnostic ("signing in", not
 * "this password").
 *
 * The export's outcome must surface HERE, not through its toasts: a toast
 * renders under an open Modal (#1335), so the failure line rides the dialog's
 * own error slot. Success needs no line - the share sheet or file download is
 * the feedback the user asked for.
 */
export function GuestAbandonDialog({
  visible,
  isPending,
  onCancel,
  onConfirm,
}: GuestAbandonDialogProps) {
  const { t } = useTranslation("auth");
  const { exportData, isPending: isExporting } = useExportData();
  const [exportFailed, setExportFailed] = useState(false);

  const onExport = async () => {
    setExportFailed(false);
    const delivered = await exportData();
    setExportFailed(!delivered);
  };

  return (
    <ConfirmDialog
      visible={visible}
      isPending={isPending}
      error={exportFailed ? t("guestAbandon.exportError") : undefined}
      title={t("guestAbandon.title")}
      message={t("guestAbandon.message")}
      confirmLabel={t("guestAbandon.confirm")}
      cancelLabel={t("guestAbandon.cancel")}
      onCancel={onCancel}
      onConfirm={onConfirm}
      secondaryAction={{
        label: t("guestAbandon.exportFirst"),
        onPress: () => void onExport(),
        isPending: isExporting,
      }}
    />
  );
}
