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
import { ErrorState, LoadingState } from "@/src/components/app/screen-state";
import { crisisActionUrls } from "@/src/features/policies/policy-content";
import { openExternalUrl } from "@/src/lib/linking";

/**
 * Which face of "unknown" this mount is answering.
 *
 * - `loading`: the row is still on the wire and has never arrived (#2229).
 * - `error`: the read failed with nothing cached (#2200).
 * - `offline`: the read is PAUSED **and the device is offline** - so nothing is
 *   on the wire and nothing will be until the connection returns. It arrived
 *   here when the age gate stopped being fenced by a failure count the library
 *   resets on every dispatch: an offline read used to fall through to the
 *   consent gate, and now it does not.
 *
 *   ☠️ Paused is NOT on its own evidence of that: query-core also parks a RETRY
 *   while the app is unfocused, so the layout checks `onlineManager` too and
 *   leaves a focus-pause on the `error` face, which keeps its Retry.
 *
 * They are one state to the gates above - none of them can answer a statutory
 * question - and three different things to say to a person, which is the only
 * reason the prop exists.
 */
export type PreferencesVerdictState = "loading" | "error" | "offline";

interface PreferencesUnavailableScreenProps {
  /** Re-run the preferences fetch. The screen owns no query of its own. */
  onRetry: () => void;
  state: PreferencesVerdictState;
}

/**
 * The screen for "we cannot yet read the row the legal gates are decided from"
 * (#2200, widened by #2229).
 *
 * `ProtectedLayout` decides two statutory questions off `user_preferences`: has
 * this person attested to meeting their country's age floor, and have they
 * accepted the current policy version. Until a row exists BOTH answers are
 * unknown - and the layout used to fall through to the app shell on exactly
 * that state. That is a fail-open on a legal gate: a person below their
 * country's floor reached the whole app and could write thought records, which
 * are GDPR Art. 9 special-category data, with no attestation on file.
 *
 * ☠️ So "unknown" renders THIS rather than the app, on ALL THREE of its faces.
 * #2200 closed the errored one; the in-flight one is the same unknown and fell
 * open for as long as the request took; the offline one fell through to the
 * consent gate until the age floor stopped being fenced by a failure count
 * TanStack resets on every dispatch. The distinction that makes it safe to fail
 * closed is that this screen is not a gate: #164's objection to failing closed
 * was that a *gate* shown on a transient error re-prompts someone who already
 * answered. This surface asks nothing and records nothing, so an
 * already-attested, already-consented user loses nothing but a moment. Whoever
 * the person is, the correct answer to "we cannot tell" is "wait" or "try
 * again", never "come in".
 *
 * ⚠️ The errored face must therefore always offer the retry. Nothing here may
 * become a terminal state: the whole justification for failing closed is that
 * the person can get out of it the moment one fetch succeeds. The loading face
 * offers no retry on purpose - the fetch it would re-run is already running -
 * and the offline face offers none either, for the stronger reason that a
 * refetch with no connection pauses again on the spot; what ends that state is
 * the network coming back, which resumes the query with no button involved.
 *
 * ☠️ That premise only holds for a fetch that has NEVER failed, which is why
 * `ProtectedLayout` picks the half off a sticky failure count rather than the
 * live error flag (#2238): on a data-less query TanStack clears the error the
 * instant a refetch starts, so keying on `isError` alone rendered THIS half
 * the moment Retry was pressed and took the only control away with it. Once
 * one read has failed, the layout keeps the errored half for every later
 * attempt, so a retried request that hangs still has a Retry above it.
 *
 * ☠️☠️ **The support card is not a footer, and it is on EVERY face** (#2228).
 * This screen replaces the entire protected tree, and on shipped 0.17.0 the
 * same state fell through into the app shell, from which crisis guidance was
 * about two taps away - so blocking here without it makes crisis guidance
 * strictly harder to reach than the build this one replaces. A guest is the
 * case that decides it: guests have no sign-out, so with no link here they have
 * no route to crisis guidance at all while the block holds. Both destinations
 * work without a preferences row and without an account - `/crisis` is a ROOT
 * route, a sibling of the `(app)` group rather than a screen inside it, and
 * Find A Helpline is a plain external URL. Their labels and the helpline's URL
 * are read from the surfaces that already own them (`common:safety.openCrisis`,
 * and `crisisActionUrls` with `policies:crisis.actions.*`), the same way
 * `under-floor-screen.tsx` does it - one phrase with two translations is drift
 * waiting to happen, and a helpline URL with two homes is worse.
 */
export function PreferencesUnavailableScreen({
  onRetry,
  state,
}: PreferencesUnavailableScreenProps) {
  const { t } = useTranslation(["errors", "common", "policies"]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center gap-4 p-6">
        <View className="w-full max-w-lg">
          {state === "offline" ? (
            /* ⚠️ No retry, and that is the honest half of it: a refetch with no
               connection pauses again where it stands, so a button here would
               be a control that cannot win. The query resumes by itself the
               moment the network comes back, which is what the copy promises. */
            <ErrorState
              icon="wifi-off"
              title={t("errors:preferencesUnavailable.offlineTitle")}
              description={t("errors:preferencesUnavailable.offlineDescription")}
            />
          ) : state === "loading" ? (
            <LoadingState
              title={t("errors:preferencesUnavailable.loadingTitle")}
              description={t("errors:preferencesUnavailable.loadingDescription")}
            />
          ) : (
            <ErrorState
              icon="cloud-off"
              title={t("errors:preferencesUnavailable.title")}
              description={t("errors:preferencesUnavailable.description")}
              action={{ label: t("errors:fallback.retry"), onPress: onRetry }}
            />
          )}
        </View>

        {/* Its own card, not a row under the error: crisis guidance stays
            visible and clearly separate from everything else (AGENTS.md). */}
        <Card className="w-full max-w-lg" testID="preferences-unavailable-support">
          <CardHeader>
            <CardTitle aria-level={2}>{t("errors:preferencesUnavailable.supportTitle")}</CardTitle>
            <CardDescription>{t("errors:preferencesUnavailable.supportBody")}</CardDescription>
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
