import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/src/components/app/screen-state";

interface PreferencesUnavailableScreenProps {
  /** Re-run the preferences fetch. The screen owns no query of its own. */
  onRetry: () => void;
}

/**
 * The screen for "we could not read the row the legal gates are decided from"
 * (#2200).
 *
 * `ProtectedLayout` decides two statutory questions off `user_preferences`: has
 * this person attested to meeting their country's age floor, and have they
 * accepted the current policy version. When the fetch has errored with nothing
 * cached, BOTH answers are unknown - and the layout used to fall through to the
 * app shell on exactly that state. That is a fail-open on a legal gate: a
 * person below their country's floor whose first fetch failed reached the whole
 * app and could write thought records, which are GDPR Art. 9 special-category
 * data, with no attestation on file.
 *
 * ☠️ So "unknown" now renders THIS rather than the app. The distinction that
 * makes it safe to fail closed is that this screen is not a gate: #164's
 * objection to failing closed was that a *gate* shown on a transient error
 * re-prompts someone who already answered. An error surface asks nothing and
 * records nothing, so an already-attested, already-consented user loses nothing
 * but a tap. Whoever the person is, the correct answer to "we cannot tell" is
 * "try again", not "come in".
 *
 * ⚠️ It must therefore always offer the retry. Nothing here may become a
 * terminal state: the whole justification for failing closed is that the person
 * can get out of it the moment one fetch succeeds.
 */
export function PreferencesUnavailableScreen({ onRetry }: PreferencesUnavailableScreenProps) {
  const { t } = useTranslation("errors");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center p-6">
        <View className="w-full max-w-lg">
          <ErrorState
            icon="cloud-off"
            title={t("preferencesUnavailable.title")}
            description={t("preferencesUnavailable.description")}
            action={{ label: t("fallback.retry"), onPress: onRetry }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
