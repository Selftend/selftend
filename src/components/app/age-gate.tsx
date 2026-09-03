import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { CountrySelectField } from "@/src/components/app/country-select-field";
import { readAttestation } from "@/src/features/auth/age-attestation";
import { useRecordAgeAttestation } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

interface AgeGateProps {
  /** The verdict passed and is stored; the app is now reachable. */
  onAttested: () => void;
  /** The verdict failed. Nothing was written; #1765 owns what happens next. */
  onUnderFloor: () => void;
}

/**
 * The age and country gate (#1764, spec #227 §3).
 *
 * It runs in the shared gate slot in `ProtectedLayout`, above `ConsentGate`,
 * which is what makes it cover all four ways into the app rather than the two
 * §3 was written against. The fourth - a silent guest from
 * `signInAnonymously` - is the primary path and the one per-flow plumbing would
 * have missed, and guests write thought records, which are the Art. 9 data the
 * floor exists to protect (owner-confirmed 2026-09-03).
 *
 * **COPPA neutrality is the design constraint, not a copy note.** Nothing above
 * or beside the questions names an age, an age range, or a qualifying answer,
 * and there is no inline "you must be…" hint on either field. A person who does
 * not meet the floor learns that only after answering - which is the whole
 * point: a screen that tells you the passing answer before you answer is
 * collecting a guess, not an attestation. The one error this screen can show is
 * calendrical ("that day does not exist"), which reveals nothing about the
 * floor.
 *
 * **Date of birth never leaves this component.** It lives in `useState` while
 * it is being typed, goes into `readAttestation`, and comes back as a verdict
 * that has no field it could ride in. Nothing persists it, logs it, or hands it
 * to a mutation - `recordAgeAttestation` takes a country and nothing else.
 *
 * ⚠️ The clock is read in the submit handler, never in render. `Date.now()` or
 * `new Date()` during render is a `react-hooks/purity` error, and it is the
 * kind that hides inside a `useMemo` or a default argument (#1761 makes the
 * same note about its own signature).
 */
export function AgeGate({ onAttested, onUnderFloor }: AgeGateProps) {
  const { t } = useTranslation("auth");
  const { user } = useSession();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("");
  const [invalidDate, setInvalidDate] = useState(false);
  const attest = useRecordAgeAttestation(user?.id ?? null);
  // Web only: KeyboardAvoidingView is a plain View there, and a shrunk WINDOW
  // is no proxy for the on-screen keyboard.
  const keyboardInset = useWebKeyboardInset();

  const complete = day.trim() !== "" && month.trim() !== "" && year.trim() !== "" && country !== "";

  const handleSubmit = async () => {
    if (!user?.id) {
      return;
    }

    // Read the clock here, in an event handler - see the docblock.
    const outcome = readAttestation({ day, month, year, country }, new Date());

    if (outcome.kind === "incomplete") {
      return;
    }

    if (outcome.kind === "invalid-date") {
      setInvalidDate(true);
      return;
    }

    setInvalidDate(false);

    if (outcome.kind === "under-floor") {
      // Drop the date of birth before leaving, so it is not sitting in a
      // mounted component's state while the exit path does its work.
      setDay("");
      setMonth("");
      setYear("");
      onUnderFloor();
      return;
    }

    try {
      await attest.mutateAsync(outcome.country);
      setDay("");
      setMonth("");
      setYear("");
      onAttested();
    } catch {
      // Surfaced below via attest.isError; only advance on success.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Unlike `ConsentGate` beside it, this gate has text fields, so it needs
          the app's keyboard chrome rather than a bare ScrollView:

          - `KeyboardAvoidingView` with the shared "padding" behavior. ☠️ Not
            the iOS-only conditional: edge-to-edge (Expo SDK 54 / Android 15)
            makes `adjustResize` behave like `adjustNothing`, so an Android
            keyboard would simply cover the country field.
          - `KeyboardAwareScrollView`, which is what `Input`'s focus hook needs
            to exist above it - the hook is a no-op without the context.
          - ☠️ `keyboardShouldPersistTaps="handled"`, and it is load-bearing
            here rather than a nicety: the country results are tapped WHILE the
            keyboard is open, and the default swallows that first tap as a
            keyboard dismissal.
          - Web gets neither of the first two (KeyboardAvoidingView is a plain
            View there), so it takes the visual-viewport inset instead. */}
      <KeyboardAvoidingView
        behavior={KEYBOARD_AVOIDING_BEHAVIOR}
        className="flex-1"
        style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
      >
        <KeyboardAwareScrollView
          contentContainerClassName="grow items-center justify-center p-6"
          keyboardShouldPersistTaps="handled"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{t("ageGate.title")}</CardTitle>
              <CardDescription>{t("ageGate.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                <View className="gap-2">
                  <Label>{t("ageGate.dateOfBirthLabel")}</Label>
                  {/* Three fields rather than a calendar. A date picker has to
                    open on some month, and whichever it opens on is a default
                    year - which §3 rules out, and which would be a decade-sized
                    hint besides. Nothing here is pre-filled. */}
                  <View className="flex-row gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="text-muted-foreground text-xs">{t("ageGate.dayLabel")}</Text>
                      <Input
                        accessibilityLabel={t("ageGate.dayLabel")}
                        inputMode="numeric"
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={setDay}
                        placeholder={t("ageGate.dayPlaceholder")}
                        testID="age-gate-day"
                        value={day}
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-muted-foreground text-xs">
                        {t("ageGate.monthLabel")}
                      </Text>
                      <Input
                        accessibilityLabel={t("ageGate.monthLabel")}
                        inputMode="numeric"
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={setMonth}
                        placeholder={t("ageGate.monthPlaceholder")}
                        testID="age-gate-month"
                        value={month}
                      />
                    </View>
                    <View className="flex-[1.4] gap-1">
                      <Text className="text-muted-foreground text-xs">
                        {t("ageGate.yearLabel")}
                      </Text>
                      <Input
                        accessibilityLabel={t("ageGate.yearLabel")}
                        inputMode="numeric"
                        keyboardType="number-pad"
                        maxLength={4}
                        onChangeText={setYear}
                        placeholder={t("ageGate.yearPlaceholder")}
                        testID="age-gate-year"
                        value={year}
                      />
                    </View>
                  </View>
                  {invalidDate ? (
                    <Text className="text-destructive text-sm" testID="age-gate-invalid-date">
                      {t("ageGate.invalidDate")}
                    </Text>
                  ) : null}
                </View>
                <CountrySelectField value={country} onChange={setCountry} />
                <Button
                  aria-busy={attest.isPending}
                  disabled={!complete || attest.isPending}
                  onPress={() => void handleSubmit()}
                  testID="age-gate-submit"
                >
                  {attest.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{attest.isPending ? t("ageGate.submitting") : t("ageGate.submit")}</Text>
                </Button>
                {attest.isError ? (
                  <Text className="text-destructive text-sm">{t("ageGate.error")}</Text>
                ) : null}
              </View>
            </CardContent>
          </Card>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
