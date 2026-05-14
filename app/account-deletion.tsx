import * as Linking from "expo-linking";
import { View } from "react-native";
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
import { PolicyScreen } from "@/src/features/policies/policy-screen";
import { appEnv } from "@/src/lib/env";

export default function AccountDeletionScreen() {
  const { t } = useTranslation("policies");
  const deletionEmail = appEnv.privacyEmail || appEnv.supportEmail;

  return (
    <PolicyScreen
      sectionKey="accountDeletion.sections"
      subtitle={t("accountDeletion.pageDescription")}
      title={t("accountDeletion.pageTitle")}
    >
      <DeletionContact email={deletionEmail} />
    </PolicyScreen>
  );
}

function DeletionContact({ email }: { email: string }) {
  const { t } = useTranslation("policies");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountDeletion.emailFallback")}</CardTitle>
        <CardDescription>{t("accountDeletion.emailFallbackDescription")}</CardDescription>
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
              <Text>{t("accountDeletion.emailLink")}</Text>
            </Button>
          </View>
        </CardContent>
      ) : (
        <CardContent>
          <Text className="text-sm text-muted-foreground">
            {t("accountDeletion.emailNotConfigured")}
          </Text>
        </CardContent>
      )}
    </Card>
  );
}
