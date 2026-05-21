import { ActivityIndicator, Modal, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface DeleteAccountModalProps {
  visible: boolean;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DELETE_CONFIRMATION = "DELETE";

export function DeleteAccountModal({
  visible,
  isPending,
  isError,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  const { t } = useTranslation("settings");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [confirmInput, setConfirmInput] = useState("");

  useEffect(() => {
    if (!visible) {
      setConfirmInput("");
    }
  }, [visible]);

  const canSubmit = confirmInput === DELETE_CONFIRMATION && !isPending;

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("account.deleteTitle")}</CardTitle>
            <CardDescription>{t("account.deleteDescription")}</CardDescription>
          </CardHeader>

          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">{t("account.deleteWarning")}</Text>

                <Label>{t("account.deleteConfirmLabel")}</Label>

                <Input
                  accessibilityLabel={t("account.deleteConfirmLabel")}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onChangeText={setConfirmInput}
                  placeholder={t("account.deleteConfirmPlaceholder")}
                  value={confirmInput}
                />
              </View>

              {isError ? (
                <Text className="text-sm text-destructive">{t("account.deleteFailed")}</Text>
              ) : null}

              <View className="gap-3">
                <Button disabled={isPending} onPress={onCancel} variant="secondary">
                  <Text>{t("account.cancel")}</Text>
                </Button>

                <Button disabled={!canSubmit} onPress={onConfirm} variant="destructive">
                  {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{isPending ? t("account.deleting") : t("account.deleteAccount")}</Text>
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
