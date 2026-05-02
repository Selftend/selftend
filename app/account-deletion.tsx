import * as Linking from "expo-linking";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
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
      <NoticeCard
        body="No deletion contact email is configured. Set EXPO_PUBLIC_PRIVACY_EMAIL or EXPO_PUBLIC_SUPPORT_EMAIL before using this page for Google Play testing or public launch."
        title="Deletion contact pending"
        tone="warning"
      />
    );
  }

  const subject = encodeURIComponent("Account and data deletion request");
  const body = encodeURIComponent(
    "Please delete my mental-health app account and associated app data. My account email is: ",
  );

  return (
    <Card>
      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink">Request deletion</Text>
        <Text className="text-sm leading-6 text-ink/70">
          Send the request from the email used for your account when possible.
        </Text>
        <Button
          onPress={() => void Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`)}
          text="Email deletion request"
        />
      </View>
    </Card>
  );
}
