import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

interface RecoveryExportCardProps {
  isExporting: boolean;
  onExport: () => void;
}

/** Card with the Markdown-export trigger button. */
export function RecoveryExportCard({ isExporting, onExport }: RecoveryExportCardProps) {
  const { t } = useTranslation("cbt");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recovery.export.title")}</CardTitle>
        <CardDescription>{t("recovery.export.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled={isExporting} onPress={() => void onExport()}>
          {isExporting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isExporting ? t("recovery.export.exporting") : t("recovery.export.button")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
