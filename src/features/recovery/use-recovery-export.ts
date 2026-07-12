import { useState } from "react";
import { useTranslation } from "react-i18next";

import { deliverMarkdown } from "@/src/features/recovery/export-target";
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
      const message = error instanceof Error ? error.message : t("recovery.export.exportError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleExportRecoveryPlan };
}
