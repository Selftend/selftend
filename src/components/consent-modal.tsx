import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

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
            <CardTitle>Quick policy check</CardTitle>
            <CardDescription>
              We keep this brief: please review and accept the latest Privacy Policy and Terms to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Button onPress={() => router.push("/privacy")} variant="ghost">
                  <Text>Read Privacy Policy</Text>
                </Button>
                <Button onPress={() => router.push("/terms")} variant="ghost">
                  <Text>Read Terms of Service</Text>
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
                <Text className="flex-1 text-sm">
                  I am 13 or older and agree to the current Privacy Policy and Terms of Service.
                </Text>
              </Pressable>
              <Button
                disabled={!accepted || consentMutation.isPending}
                onPress={() => void handleAccept()}
              >
                <Text>{consentMutation.isPending ? "Saving..." : "Accept and continue"}</Text>
              </Button>
              {consentMutation.isError ? (
                <Text className="text-sm text-destructive">
                  Unable to save consent. Please try again.
                </Text>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
