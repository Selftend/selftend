import * as Linking from "expo-linking";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { accountDeletionSections } from "@/src/features/policies/policy-content";
import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { appEnv } from "@/src/lib/env";

export default function AccountDeletionScreen() {
  const deletionEmail = appEnv.privacyEmail || appEnv.supportEmail;

  return (
    <PolicyScreen
      sections={accountDeletionSections}
      subtitle="How to permanently delete your Selftend account and all associated data."
      title="Account deletion"
    >
      <DeletionContact email={deletionEmail} />
    </PolicyScreen>
  );
}

function DeletionContact({ email }: { email: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email fallback</CardTitle>
        <CardDescription>
          If you cannot access the self-service deletion in Settings, you can request deletion by email.
        </CardDescription>
      </CardHeader>
      {email ? (
        <CardContent>
          <View>
          <Button
            onPress={() =>
              void Linking.openURL(
                `mailto:${email}?subject=${encodeURIComponent("Account and data deletion request")}&body=${encodeURIComponent("Please delete my Selftend account and associated app data. My account email is: ")}`,
              )
            }
          >
            <Text>Email deletion request</Text>
          </Button>
          </View>
        </CardContent>
      ) : (
        <CardContent>
          <Text className="text-sm text-muted-foreground">
            Deletion contact email not yet configured. Use the self-service option in Settings.
          </Text>
        </CardContent>
      )}
    </Card>
  );
}
