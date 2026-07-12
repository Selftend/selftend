import { Platform } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useExportUserData } from "@/src/features/settings/queries";
import { buildExportFileName, serializeExport } from "@/src/features/settings/export-data";
import { currentDateKey } from "@/src/utils/date";

/**
 * Export mutation + platform-specific delivery, extracted verbatim from
 * `ExportDataButton`. Web builds a Blob + anchor download; native dynamic-imports
 * `Share`. Pure filename/serialization live in `export-data.ts`.
 */
export function useExportData() {
  const { t } = useTranslation("settings");
  const exportMutation = useExportUserData();
  const [exported, setExported] = useState(false);

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

      setExported(true);
    } catch {
      // Error handled by mutation state
    }
  };

  return {
    exportData,
    isPending: exportMutation.isPending,
    isError: exportMutation.isError,
    exported,
  };
}
