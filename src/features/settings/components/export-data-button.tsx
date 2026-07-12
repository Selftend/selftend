import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useExportData } from "@/src/features/settings/use-export-data";

export function ExportDataButton() {
  const { t } = useTranslation("settings");
  const { exportData, isPending, isError, exported } = useExportData();

  return (
    <View className="gap-2">
      <Button
        variant="outline"
        className="justify-start"
        disabled={isPending}
        onPress={() => void exportData()}
      >
        {isPending ? <ActivityIndicator /> : <Icon name="download" size={18} />}
        <Text className="flex-1">
          {isPending ? t("account.exporting") : t("account.exportButton")}
        </Text>
      </Button>
      {exported ? (
        <Text className="text-sm text-muted-foreground">{t("account.exported")}</Text>
      ) : null}
      {isError ? (
        <Text className="text-sm text-destructive">{t("account.exportError")}</Text>
      ) : null}
    </View>
  );
}
