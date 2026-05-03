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
      notice="A real privacy or support email must be configured before store testing. A self-service deletion flow remains a follow-up requirement."
      sections={accountDeletionSections}
      subtitle="How users can request account and app-data deletion during the MVP."
      title="Account deletion"
    >
      <DeletionContact email={deletionEmail} />
    </PolicyScreen>
  );
}

function DeletionContact({ email }: { email: string }) {
  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deletion contact pending</CardTitle>
          <CardDescription>
            No deletion contact email is configured. Set EXPO_PUBLIC_PRIVACY_EMAIL or EXPO_PUBLIC_SUPPORT_EMAIL before
            using this page for Google Play testing or public launch.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const subject = encodeURIComponent("Account and data deletion request");
  const body = encodeURIComponent(
    "Please delete my SelfTend account and associated app data. My account email is: ",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request deletion</CardTitle>
        <CardDescription>Send the request from the email used for your account when possible.</CardDescription>
      </CardHeader>
      <CardContent>
        <View>
        <Button
          onPress={() => void Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`)}
        >
          <Text>Email deletion request</Text>
        </Button>
        </View>
      </CardContent>
    </Card>
  );
}
