import { ActivityIndicator, Platform, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useExportUserData } from "@/src/features/settings/queries";
import { buildExportFileName, serializeExport } from "@/src/features/settings/export-data";
import { currentDateKey } from "@/src/utils/date";

export function ExportDataButton() {
  const { t } = useTranslation("settings");
  const exportMutation = useExportUserData();
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
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

  return (
    <View className="gap-2">
      <Button
        variant="outline"
        className="justify-start"
        disabled={exportMutation.isPending}
        onPress={() => void handleExport()}
      >
        {exportMutation.isPending ? <ActivityIndicator /> : <Icon name="download" size={18} />}
        <Text className="flex-1">
          {exportMutation.isPending ? t("account.exporting") : t("account.exportButton")}
        </Text>
      </Button>
      {exported ? (
        <Text className="text-sm text-muted-foreground">{t("account.exported")}</Text>
      ) : null}
      {exportMutation.isError ? (
        <Text className="text-sm text-destructive">{t("account.exportError")}</Text>
      ) : null}
    </View>
  );
}
