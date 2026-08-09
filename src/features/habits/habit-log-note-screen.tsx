import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { formatHabitHistoryDay } from "@/src/features/habits/history-groups";
import { useHabit, useHabitLogs, useUpsertHabitLogNote } from "@/src/features/habits/queries";
import { HABIT_NOTE_MAX } from "@/src/features/habits/schemas";
import { currentDateKey } from "@/src/features/habits/scheduling";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";

interface HabitLogNoteScreenProps {
  habitId: string;
  dateOverride?: string;
}

export function HabitLogNoteScreen({ habitId, dateOverride }: HabitLogNoteScreenProps) {
  const { t, i18n } = useTranslation("habits");
  const roomStyle = useRoomStyle("act");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const dateStr = dateOverride ?? currentDateKey();
  const { data: habit } = useHabit(userId, habitId);
  const { data: logs } = useHabitLogs(userId, { habitId, sinceDate: dateStr, limit: 5 });
  const upsertNote = useUpsertHabitLogNote(userId);

  const existing = (logs ?? []).find((log) => log.loggedOn === dateStr);

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  // Hydrate the field from the saved note exactly once, after the logs query first
  // settles (render-time adjustment). Re-running on later refetches would overwrite
  // the user's in-progress text.
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && logs !== undefined) {
    setHydrated(true);
    if (existing) setNote(existing.note);
  }

  async function handleSave() {
    if (!user) return;
    setError(undefined);
    try {
      await upsertNote.mutateAsync({ habitId, loggedOn: dateStr, note });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("log.saveError"));
    }
  }

  const saving = upsertNote.isPending;

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the act pour through it.
    <View testID="habit-log-note-room" className="flex-1" style={roomStyle}>
      <MobileFormScreen
        contentClassName="gap-6"
        footer={
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={() => router.back()} variant="ghost">
                <Text>{t("cta.cancel")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button disabled={saving || !user} onPress={() => void handleSave()}>
                {saving ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{saving ? t("cta.saving") : t("cta.save")}</Text>
              </Button>
            </View>
          </View>
        }
      >
        <View className="gap-2">
          <ScreenHeader title={t("log.title")} />
          <Text variant="muted">{t("log.subtitle")}</Text>
          {habit ? (
            // ⚠️ This printed the raw `2026-08-08` key in both locales - the
            // third site of #726, and the one the redesign makes reachable:
            // nothing in the UI passed `?date=` before habit detail's notes
            // section did, so this line always said "today" in ISO.
            <Text variant="muted" className="text-xs">
              {t("log.forDay", {
                habit: habit.name,
                date: formatHabitHistoryDay(dateStr, t, i18n.language),
              })}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>{t("log.title")}</Label>
          <Textarea
            accessibilityLabel={t("log.title")}
            maxLength={HABIT_NOTE_MAX}
            onChangeText={setNote}
            placeholder={t("log.placeholder")}
            value={note}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      </MobileFormScreen>
    </View>
  );
}
