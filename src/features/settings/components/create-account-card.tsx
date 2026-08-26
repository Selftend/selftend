import { Platform } from "react-native";
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
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useSession } from "@/src/providers/session-provider";

/**
 * The persistent, quiet invitation to register (#1446) - one of exactly two
 * invitation surfaces the spec allows (the other is one line on the onboarding
 * wizard's final panel). No popups, no repeats, no reminders: this card sits
 * in settings for as long as the account is a guest and disappears the moment
 * it is not.
 *
 * The wording is stronger on web because the risk is real there, not to push:
 * a guest's session lives in browser storage, which the browser itself can
 * clear. Navigation goes to /sign-up, which is the conversion form for a
 * guest (#1443) - their data stays in place.
 */
export function CreateAccountCard() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const pushWithOrigin = usePushWithOrigin();

  if (user?.is_anonymous !== true) return null;

  return (
    <Card testID="create-account-card">
      <CardHeader className="gap-1">
        <CardTitle>{t("guestInvite.title")}</CardTitle>
        <CardDescription>
          {Platform.OS === "web" ? t("guestInvite.bodyWeb") : t("guestInvite.body")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onPress={() => pushWithOrigin("/sign-up")}
          testID="create-account-card-cta"
        >
          <Text>{t("guestInvite.cta")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
