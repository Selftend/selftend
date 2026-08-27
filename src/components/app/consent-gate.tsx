import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Text } from "@/src/components/react-native-reusables/text";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useRecordPolicyConsent } from "@/src/features/settings/queries";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

interface ConsentGateProps {
  onAccepted: () => void;
}

export function ConsentGate({ onAccepted }: ConsentGateProps) {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [accepted, setAccepted] = useState(false);
  const consentMutation = useRecordPolicyConsent(user?.id ?? null);
  // The gate covers whatever route the user was heading for, so reading a policy
  // from here is a jump out of it and back (#1265, O3). Both policy routes sit
  // at the root, so without the Origin the way out of one lands on Home rather
  // than returning to the gate the user still has to clear.
  const pushWithOrigin = usePushWithOrigin();

  const handleAccept = async () => {
    if (!user?.id) {
      return;
    }

    try {
      await consentMutation.mutateAsync(policyVersion);
      onAccepted();
    } catch {
      // Failure surfaces via consentMutation.isError in the UI; only advance on success.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("consent.title")}</CardTitle>
            <CardDescription>{t("consent.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Button onPress={() => pushWithOrigin("/privacy")} variant="secondary">
                  <Text>{t("consent.readPrivacy")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/terms")} variant="secondary">
                  <Text>{t("consent.readTerms")}</Text>
                </Button>
              </View>
              <Pressable
                testID="consent-accept-checkbox"
                accessibilityLabel={t("consent.checkbox")}
                accessibilityRole="checkbox"
                aria-checked={accepted}
                className="flex-row items-start gap-3"
                onPress={() => setAccepted(!accepted)}
                role="checkbox"
                {...spaceKeyActivationProps(() => setAccepted(!accepted))}
              >
                <Checkbox
                  accessibilityElementsHidden
                  aria-hidden
                  checked={accepted}
                  importantForAccessibility="no"
                  onCheckedChange={setAccepted}
                />
                <Text className="flex-1 text-sm">{t("consent.checkbox")}</Text>
              </Pressable>
              <Button
                testID="consent-submit"
                aria-busy={consentMutation.isPending}
                disabled={!accepted || consentMutation.isPending}
                onPress={() => void handleAccept()}
              >
                {consentMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>
                  {consentMutation.isPending ? t("consent.submitting") : t("consent.submit")}
                </Text>
              </Button>
              {consentMutation.isError ? (
                <Text className="text-sm text-destructive">{t("consent.error")}</Text>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
