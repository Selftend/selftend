import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { useSession } from "@/src/providers/session-provider";

export function VerifyEmailForm() {
  const { t } = useTranslation("auth");
  const { user } = useSession();
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = emailParam ?? user?.email;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("verifyEmail.title")}</CardTitle>
        <CardDescription>
          {t("verifyEmail.subtitle", { email: email ?? "your email" })}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
