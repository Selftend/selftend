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
 *
 * ☠️ The title's level is overridden to 2 (#1801). This card is the only thing
 * on `/settings` that renders for guests alone, so the guest outline is the one
 * nothing tested: `CardTitle`'s default `aria-level={3}` put an `h3` between the
 * hero's `h1` and the five group `h2`s below - a skipped level, and a heading
 * outranking every peer that follows it. Level 2 is the honest one: the card sits
 * OUTSIDE every run, a sibling of the five groups rather than a child of any.
 *
 * The default stays 3 on the primitive, because a card nested inside a titled
 * section is the shape that default is for; `sign-in-form.tsx` already overrides
 * it the same way for the opposite reason (`aria-level={1}` - there the card IS
 * the page). Design `14a` draws this title as a plain `span`, which is the third
 * answer and the one refused: it would leave a screen-reader user with no heading
 * to reach the single surface inviting them to register, and the invitation is
 * meant to be quiet, not unreachable (#1446).
 */
export function CreateAccountCard() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const pushWithOrigin = usePushWithOrigin();

  if (user?.is_anonymous !== true) return null;

  return (
    <Card testID="create-account-card">
      <CardHeader className="gap-1">
        <CardTitle aria-level={2}>{t("guestInvite.title")}</CardTitle>
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
