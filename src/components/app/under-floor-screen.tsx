import { ScrollView, View } from "react-native";
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
import { Text } from "@/src/components/react-native-reusables/text";
import { LinkButton } from "@/src/components/app/link-button";
import {
  useUnderFloorExit,
  type UnderFloorErasureState,
} from "@/src/features/auth/use-under-floor-exit";
import { crisisActionUrls } from "@/src/features/policies/policy-content";
import { openExternalUrl } from "@/src/lib/linking";
import { useSession } from "@/src/providers/session-provider";

/**
 * Where an under-floor verdict lands (#1765, spec #227 §3).
 *
 * The screen is the block. It has no way into the app and no way back to the
 * questions, and the device flag written beneath it means closing the app is
 * not a way past it either - which is what turns #1764's "blocked for as long
 * as this stays mounted" into the hard block §3 asks for.
 *
 * **It does not scold.** It states a rule, says where the person stands against
 * it, and offers the one thing that is still worth offering. No wrongdoing is
 * implied, because none occurred: someone answered two questions honestly.
 *
 * **No retry, and no hint about what a passing answer would have been.** The
 * one control that is not a link out is the erasure retry, and that acts on the
 * account rather than on the answers - a screen offering "try again" would be a
 * screen teaching the floor, which is the same reason #1764's gate names no age
 * anywhere. `under-floor-screen.test.ts`'s copy guard fires its own predicate on
 * deliberately bad copy so those absence assertions cannot go quiet.
 *
 * **The support links are the point of the screen, not a footer.** This person
 * is about to not have an account, so both destinations have to work without
 * one: `/crisis` is a ROOT route, a sibling of the `(app)` group rather than a
 * screen inside it, so it renders with no session at all; Find A Helpline is a
 * plain external URL. Their labels and the helpline's URL are read from the
 * surfaces that already own them (`common:safety.openCrisis`, and
 * `crisisActionUrls` with `policies:crisis.actions.*`, which is exactly what
 * `app/crisis.tsx` renders) rather than re-translated into `auth` - one phrase
 * with two translations is drift waiting to happen, and a helpline URL with two
 * homes is worse.
 */
/**
 * One sentence per erasure state, in one place - the render and the retry
 * control both branch on `state`, and two cascades over the same union drift.
 * `null` means "say nothing", which is the honest answer when there was no
 * account to remove.
 */
const ERASURE_COPY_KEY: Record<UnderFloorErasureState, string | null> = {
  working: "auth:underFloor.erasing",
  erased: "auth:underFloor.erased",
  failed: "auth:underFloor.erasureFailed",
  "nothing-to-erase": null,
};

export function UnderFloorScreen() {
  const { t } = useTranslation(["auth", "common", "policies"]);
  const { user } = useSession();
  // Blocks the device, then erases the account - which exists on every entry
  // path by the time a verdict is known, because the gate renders below the
  // layout's session branch (#1919). Mounted here rather than in
  // `ProtectedLayout` so that the status it reports has somewhere to be read: a
  // silent erasure that failed is the thing the ticket rules out.
  const { retry, state } = useUnderFloorExit(user?.id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center gap-4 p-6">
        <Card className="w-full max-w-lg" testID="under-floor-screen">
          <CardHeader>
            <CardTitle>{t("auth:underFloor.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Text>{t("auth:underFloor.body")}</Text>
              <Text className="text-muted-foreground text-sm">
                {t("auth:underFloor.retention")}
              </Text>
              {/* The erasure, said out loud. A deletion that quietly failed
                  would leave a live account behind a screen promising there
                  is none, so each state gets its own sentence rather than one
                  optimistic one - and `nothing-to-erase` gets no sentence at
                  all, because there is nothing truthful to say about a removal
                  that was never needed. */}
              {ERASURE_COPY_KEY[state] ? (
                <Text className="text-muted-foreground text-sm" testID="under-floor-erasure">
                  {t(ERASURE_COPY_KEY[state])}
                </Text>
              ) : null}
              {state === "failed" ? (
                <Button onPress={retry} testID="under-floor-erasure-retry" variant="secondary">
                  <Text>{t("auth:underFloor.erasureRetryLabel")}</Text>
                </Button>
              ) : null}
              <Text className="text-muted-foreground text-sm">{t("auth:underFloor.closing")}</Text>
            </View>
          </CardContent>
        </Card>

        {/* Its own card, not a row at the bottom of the refusal: crisis
            guidance stays visible and clearly separate from everything else
            (AGENTS.md), and here "everything else" is the block itself. */}
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle aria-level={2}>{t("auth:underFloor.supportTitle")}</CardTitle>
            <CardDescription>{t("auth:underFloor.supportBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <LinkButton href="/crisis" variant="secondary">
                <Text>{t("common:safety.openCrisis")}</Text>
              </LinkButton>
              {crisisActionUrls.map((action) => (
                <Button
                  key={action.url}
                  onPress={() => openExternalUrl(action.url)}
                  variant="secondary"
                >
                  <Text>{t(`policies:crisis.actions.${action.key}`)}</Text>
                </Button>
              ))}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
