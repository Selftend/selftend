import { useState } from "react";
import { useTranslation } from "react-i18next";

import { deliverMarkdown } from "@/src/features/recovery/export-target";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";
import { currentDateKey } from "@/src/utils/date";

/**
 * Wraps the impure recovery-plan export: toggle `isExporting`, build the Markdown via
 * the caller-supplied `buildExportText` (which closes over the current form values +
 * derived stats/timeline), hand it to the platform-IO `deliverMarkdown`, and toast.
 * Extracted verbatim from the screen; only the platform branch moved (into
 * `export-target.ts`).
 */
export function useRecoveryExport(buildExportText: () => string) {
  const { t } = useTranslation("cbt");
  const showToast = useToastStore((state) => state.showToast);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportRecoveryPlan = async () => {
    setIsExporting(true);

    try {
      const exportText = buildExportText();

      await deliverMarkdown(
        exportText,
        `selftend-recovery-plan-${currentDateKey()}.md`,
        t("recovery.export.fileTitle"),
      );

      showToast({
        title: t("common:feedback.saved"),
        description: t("recovery.export.exported"),
        tone: "success",
      });
    } catch (error) {
      // The thrown message no longer reaches the screen (translated copy only, #1060),
      // and `deliverMarkdown` is platform IO outside TanStack, so the mutation cache's
      // global reporter never sees this - capture here or lose it, as #1055 did for
      // sign-out. `isReportableError` keeps the expected offline case out of Sentry.
      if (isReportableError(error)) {
        captureError(error);
      }
      showToast({
        // Not `feedback.problem` ("Something did not save"): an export saves nothing,
        // so that title described an action the user never took (#1060).
        title: t("common:feedback.wentWrong"),
        description: t("recovery.export.exportError"),
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleExportRecoveryPlan };
}
