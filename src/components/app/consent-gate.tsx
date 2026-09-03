import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
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
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Text } from "@/src/components/react-native-reusables/text";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useRecordPolicyConsent } from "@/src/features/settings/queries";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";

interface ConsentCheckboxProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  testID: string;
}

/**
 * One tickable consent row: the visual box, and the whole row as its control.
 *
 * Extracted because the gate asks TWO questions since #1766 and the row was
 * written out twice - which is two copies of an accessibility contract with
 * four moving parts. The visual `Checkbox` is hidden from the accessibility
 * tree (`aria-hidden` for web, `accessibilityElementsHidden` /
 * `importantForAccessibility` for native) so the row is the single announced
 * control rather than a box and a label read separately, and
 * `spaceKeyActivationProps` adds the Space activation web needs on a
 * `role="checkbox"` that is not an input. Getting one of those right in one
 * copy and wrong in the other is the failure this removes.
 *
 * Deliberately NOT a shared component: each caller still owns its own state,
 * which is what keeps the two consents separately given (#1766). This bundles
 * the rendering, not the decision.
 */
function ConsentCheckbox({ checked, label, onChange, testID }: ConsentCheckboxProps) {
  const toggle = () => onChange(!checked);

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      aria-checked={checked}
      className="flex-row items-start gap-3"
      onPress={toggle}
      role="checkbox"
      {...spaceKeyActivationProps(toggle)}
    >
      <Checkbox
        accessibilityElementsHidden
        aria-hidden
        checked={checked}
        importantForAccessibility="no"
        onCheckedChange={onChange}
      />
      <Text className="flex-1 text-sm">{label}</Text>
    </Pressable>
  );
}

interface ConsentGateProps {
  onAccepted: () => void;
}

export function ConsentGate({ onAccepted }: ConsentGateProps) {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  // TWO controls, two pieces of state, and the separation is the whole of
  // #1766 (spec #227 §3). Until now one checkbox carried three things at once:
  // an age assertion, agreement to the terms and privacy policy, and consent to
  // Selftend processing the self-help entries the person saves. The third is
  // special-category health data, and GDPR Art. 9(2)(a) wants an EXPLICIT act
  // for it - separately worded, separately given, not a by-product of accepting
  // a contract. A single tick could not be any of those, however carefully the
  // sentence was written.
  //
  // ☠️ So they must not be collapsed back into one boolean "for tidiness", and
  // the submit below is disabled until BOTH are true rather than until either
  // is: `accepted && healthDataConsent`, never `accepted`. The gate's whole
  // legal weight rests on the Art. 9 half being unsatisfiable by the other.
  const [accepted, setAccepted] = useState(false);
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const consentMutation = useRecordPolicyConsent(user?.id ?? null);
  // The gate covers whatever route the user was heading for, so reading a policy
  // from here is a jump out of it and back (#1265, O3). Both policy routes sit
  // at the root, so without the Origin the way out of one lands on Home rather
  // than returning to the gate the user still has to clear.
  const pushWithOrigin = usePushWithOrigin();

  const handleAccept = async () => {
    // ☠️ The both-ticked invariant restated where the WRITE is, not only on the
    // button's `disabled`. `recordPolicyConsent` stamps the Art. 9 consent as
    // part of the same payload, so anything that reached this function without
    // the second tick would record a consent nobody gave.
    if (!user?.id || !accepted || !healthDataConsent) {
      return;
    }

    try {
      await consentMutation.mutateAsync(policyVersion);
      onAccepted();
    } catch {
      // Failure surfaces via consentMutation.isError in the UI; only advance on success.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("consent.title")}</CardTitle>
            <CardDescription>{t("consent.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Button onPress={() => pushWithOrigin("/privacy")} variant="secondary">
                  <Text>{t("consent.readPrivacy")}</Text>
                </Button>
                <Button onPress={() => pushWithOrigin("/terms")} variant="secondary">
                  <Text>{t("consent.readTerms")}</Text>
                </Button>
              </View>
              <ConsentCheckbox
                testID="consent-accept-checkbox"
                checked={accepted}
                label={t("consent.checkbox")}
                onChange={setAccepted}
              />
              {/* The Art. 9 act, under its own heading so that it reads as a
                  second question rather than as small print under the first.
                  Unticked on arrival like the one above - a pre-selected box is
                  not an affirmative act, and `useState(false)` is the only
                  thing standing behind that. */}
              <View className="gap-2 border-t border-border pt-4">
                <Text className="text-sm font-medium">{t("consent.healthDataTitle")}</Text>
                <ConsentCheckbox
                  testID="consent-health-data-checkbox"
                  checked={healthDataConsent}
                  label={t("consent.healthDataCheckbox")}
                  onChange={setHealthDataConsent}
                />
                {/* Beside the control, not in a policy the person would have to
                    go and find: §3 asks for the withdrawal path to be stated
                    here. Its own node rather than part of the checkbox's
                    accessible name - the name is the act being consented to,
                    and appending the escape route to it would make the act
                    longer to hear and no clearer. */}
                <Text className="text-muted-foreground text-xs">
                  {t("consent.healthDataWithdrawal")}
                </Text>
              </View>
              <Button
                testID="consent-submit"
                aria-busy={consentMutation.isPending}
                disabled={!accepted || !healthDataConsent || consentMutation.isPending}
                onPress={() => void handleAccept()}
              >
                {consentMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>
                  {consentMutation.isPending ? t("consent.submitting") : t("consent.submit")}
                </Text>
              </Button>
              {consentMutation.isError ? (
                <Text className="text-sm text-destructive">{t("consent.error")}</Text>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
