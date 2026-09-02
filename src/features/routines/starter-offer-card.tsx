import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useWidgetPreferences } from "@/src/features/home/queries";
import { isReminderPromptEligible } from "@/src/features/notifications/reminder-prompt";
import { STEPPABLE_TOOL_IDS, type SteppableToolId } from "@/src/features/routines/derive";
import { useRoutines } from "@/src/features/routines/queries";
import { buildStarterSteps } from "@/src/features/routines/starter";
import {
  areOfferRecordsReady,
  countToolsWithRecords,
  SECOND_ACTION_MIN,
} from "@/src/features/routines/starter-offer";
import { useKeepStarterRoutine } from "@/src/features/routines/use-keep-starter-routine";
import { useRoutineToolRecords } from "@/src/features/routines/use-routine-tool-records";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { INSET_LAYER, useInsetBelow, useInsetPublisher } from "@/src/stores/layered-inset-store";
import { useReminderPromptStore } from "@/src/stores/reminder-prompt-store";

// Globally mounted host (next to ReminderPromptCard) for the once-ever
// starter-routine offer at the second action (#1677, decided in #1663). The
// glossary names a routine "the second-action bridge"; until this card the
// only proactive offer fired in the wizard at zero actions, and the
// Routines-page card is seek-only.
//
// It mirrors the reminder prompt's mechanics exactly: tool save flows push a
// request into the shared store; this card derives eligibility from the
// record - nothing stored (#952) - shows once, and marks the offer shown the
// moment it appears, so navigating away counts as asked and declining writes
// nothing further. On any save the reminder prompt wins: the request is
// evaluated against the same preferences snapshot the reminder card consumes
// in the same render, and a save the reminder prompt takes leaves this offer
// waiting for a later save.
//
// This is deliberately NOT a Home starter card - that surface was rejected
// (today-screen.tsx) because a persistent card reads as a suggestion with no
// resolution. A post-save floater resolves itself: shown once, then never.
export function StarterOfferCard() {
  const { t } = useTranslation("routines");
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const { mutateAsync: persistPreferences } = updatePreferences;
  const request = useReminderPromptStore((state) => state.request);
  const reminderVisible = useReminderPromptStore((state) => state.promptVisible);

  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState<SteppableToolId[] | null>(null);
  const [pendingSave, setPendingSave] = useState(false);

  // Consume the request's UI state during render, exactly like the reminder
  // card does: both cards see the same store request with the same preferences
  // snapshot, so "the reminder prompt wins this save" is decided identically
  // on both sides - the reminder card by showing, this card by waiting.
  const [consumedRequest, setConsumedRequest] = useState<typeof request>(null);
  if (request && request !== consumedRequest && userId && preferences) {
    setConsumedRequest(request);
    if (
      !preferences.starterRoutineOffered &&
      !isReminderPromptEligible(preferences, request.targetKey)
    ) {
      setPendingSave(true);
    }
  }

  // Eligibility data is fetched only while a save is actually being evaluated,
  // and the deeper fetches only once "owns no routine" is confirmed - a user
  // with a routine, or one already offered, costs nothing here.
  const evaluating = pendingSave && !visible;
  const { data: routines } = useRoutines(evaluating ? userId : null);
  const deepUserId = evaluating && routines !== undefined && routines.length === 0 ? userId : null;
  const { data: widgetPrefs } = useWidgetPreferences(deepUserId);
  const records = useRoutineToolRecords(deepUserId, STEPPABLE_TOOL_IDS);

  // The decision, made as render-time adjustments (the reminder card's
  // consumption pattern): derived entirely from the record, never stored
  // (#952). While a needed slice is still loading nothing changes; a failed
  // condition drops this save - the offer waits for a later one; a passed
  // evaluation shows the card. The reminderVisible check covers a reminder
  // prompt still on screen from an earlier save: the two floaters share one
  // bottom slot, and the reminder prompt wins.
  if (evaluating && userId && preferences) {
    if (preferences.starterRoutineOffered || reminderVisible) {
      setPendingSave(false);
    } else if (routines !== undefined) {
      if (routines.length > 0) {
        setPendingSave(false);
      } else if (widgetPrefs !== undefined) {
        const composed = buildStarterSteps(widgetPrefs.map((pref) => pref.widgetId));
        if (!composed) {
          setPendingSave(false);
        } else if (areOfferRecordsReady(records)) {
          setPendingSave(false);
          if (countToolsWithRecords(records) >= SECOND_ACTION_MIN) {
            setSteps(composed);
            setVisible(true);
          }
        }
      }
    }
  }

  // A reminder prompt arriving on a later save takes the slot outright.
  if (visible && reminderVisible) {
    setVisible(false);
  }

  // The show's side effect: marked as offered ON SHOW - navigating away
  // without touching the card still counts as asked. Best-effort: a failed
  // write only risks one more ask, mirroring the reminder prompt.
  useEffect(() => {
    if (!visible) return;
    persistPreferences({ starterRoutineOffered: true }).catch(() => {});
  }, [visible, persistPreferences]);

  // Layer 2 of the bottom-inset ladder (#1339), same slot as the reminder
  // prompt card - only one of the two is ever visible.
  const insetBelow = useInsetBelow(INSET_LAYER.floater);
  const hostBottom = Math.max(insets.bottom, insetBelow) + 16;
  const { attachHost: attachCard, onLayout: onCardLayout } = useInsetPublisher(
    INSET_LAYER.floater,
    hostBottom,
  );

  const { keep, saving, error: keepError } = useKeepStarterRoutine(userId);

  if (!visible || !steps || !userId) return null;

  const handleKeep = () => {
    if (!steps) return;
    void keep({ name: t("form.defaultName"), steps, onKept: () => setVisible(false) });
  };

  return (
    <View
      // box-none must be the prop, not style.pointerEvents - see the reminder
      // prompt card: the style value is passed through as raw (invalid) CSS on
      // web, and this full-width overlay would swallow the screen's clicks.
      testID="starter-offer-host"
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[70] items-center px-4"
      onLayout={onCardLayout}
      ref={attachCard}
      style={{ bottom: hostBottom }}
    >
      <Card className="w-full max-w-xl shadow-md dark:shadow-none">
        <CardHeader className="gap-1">
          <View className="flex-row items-center gap-3">
            <View className="size-9 items-center justify-center rounded-lg bg-muted">
              <Icon name="checklist" className="size-5 text-muted-foreground" />
            </View>
            <View className="flex-1 gap-1">
              <CardTitle>{t("home.starterTitle")}</CardTitle>
              <CardDescription>{t("home.starterBody")}</CardDescription>
            </View>
          </View>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="gap-2">
            <Text className="text-sm font-semibold">{t("form.defaultName")}</Text>
            {steps.map((toolId, index) => (
              <View key={toolId} className="flex-row items-center gap-3">
                <View className="size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <Text className="text-xs font-semibold text-primary">{index + 1}</Text>
                </View>
                <Text className="text-sm">{t(`tools.${toolId}`)}</Text>
              </View>
            ))}
          </View>
          {keepError ? <Text className="text-sm text-destructive">{keepError}</Text> : null}
          <View className="flex-row gap-3">
            <Button className="flex-1" disabled={saving} onPress={handleKeep}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{t("cta.keep")}</Text>
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={saving}
              onPress={() => setVisible(false)}
            >
              <Text>{t("cta.skip")}</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
