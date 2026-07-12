import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

interface RecoverySaveFooterProps {
  isSaving: boolean;
  hasPlan: boolean;
  onSave: () => void;
}

/** Sticky footer save/update button for the recovery plan. */
export function RecoverySaveFooter({ isSaving, hasPlan, onSave }: RecoverySaveFooterProps) {
  const { t } = useTranslation("cbt");

  return (
    <Button disabled={isSaving} onPress={() => void onSave()}>
      {isSaving ? <ActivityIndicator color="#ffffff" /> : null}
      <Text>{hasPlan ? t("recovery.update") : t("recovery.save")}</Text>
    </Button>
  );
}
