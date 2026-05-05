import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useRecordPolicyConsent } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

interface ConsentModalProps {
  visible: boolean;
  onAccepted: () => void;
}

export function ConsentModal({ visible, onAccepted }: ConsentModalProps) {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [accepted, setAccepted] = useState(false);
  const consentMutation = useRecordPolicyConsent(user?.id ?? null);

  const handleAccept = async () => {
    if (!user?.id) {
      return;
    }

    await consentMutation.mutateAsync(policyVersion);
    onAccepted();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("consent.title")}</CardTitle>
            <CardDescription>{t("consent.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Button onPress={() => router.push("/privacy")} variant="ghost">
                  <Text>{t("consent.readPrivacy")}</Text>
                </Button>
                <Button onPress={() => router.push("/terms")} variant="ghost">
                  <Text>{t("consent.readTerms")}</Text>
                </Button>
              </View>
              <Pressable
                className="flex-row items-start gap-3"
                onPress={() => setAccepted(!accepted)}
              >
                <Checkbox
                  checked={accepted}
                  onCheckedChange={setAccepted}
                />
                <Text className="flex-1 text-sm">{t("consent.checkbox")}</Text>
              </Pressable>
              <Button
                disabled={!accepted || consentMutation.isPending}
                onPress={() => void handleAccept()}
              >
                <Text>{consentMutation.isPending ? t("consent.submitting") : t("consent.submit")}</Text>
              </Button>
              {consentMutation.isError ? (
                <Text className="text-sm text-destructive">{t("consent.error")}</Text>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
