import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { useExportUserData } from "@/src/features/settings/queries";
import { buildExportFileName, serializeExport } from "@/src/features/settings/export-data";
import { useToastStore } from "@/src/stores/toast-store";
import { currentDateKey } from "@/src/utils/date";

/**
 * Export mutation + platform-specific delivery. Web builds a Blob + anchor
 * download; native dynamic-imports `Share`. Pure filename/serialization live in
 * `export-data.ts`.
 *
 * Both outcomes toast, which is what let the R7 banner pair die at zero cost:
 * export was the one writer of feedback on this screen that had no toast of its
 * own, and its two permanent `Text` nodes were the only thing keeping the pair
 * alive. An export is transient by nature - the file either arrived or it did
 * not - so there is no state left for the page to hold once the toast has gone.
 */
export function useExportData() {
  const { t } = useTranslation("settings");
  const exportMutation = useExportUserData();
  const showToast = useToastStore((state) => state.showToast);

  const exportData = async () => {
    try {
      const data = await exportMutation.mutateAsync();
      const json = serializeExport(data);

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = buildExportFileName(currentDateKey());
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { Share } = await import("react-native");
        await Share.share({
          message: json,
          title: t("account.exportShareTitle"),
        });
      }

      // Fired after delivery, not after the mutation: the download or share sheet
      // is the part the user asked for, so a serialization or delivery failure
      // must not report success.
      showToast({
        title: t("common:feedback.saved"),
        description: t("account.exported"),
        tone: "success",
      });
    } catch {
      showToast({
        // Not `feedback.problem` ("Something did not save"): an export saves nothing,
        // so that title described an action the user never took (#1060).
        title: t("common:feedback.wentWrong"),
        description: t("account.exportError"),
        tone: "error",
      });
    }
  };

  return {
    exportData,
    isPending: exportMutation.isPending,
  };
}
