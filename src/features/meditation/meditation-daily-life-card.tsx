import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSaveStagePracticeNote, useStagePracticeNotes } from "@/src/features/meditation/queries";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { useLocaleFormats } from "@/src/lib/locale-format";

const STAGE = 10;
const MAX_RECENT = 7;

export function MeditationDailyLifeCard() {
  const { t } = useTranslation("meditation");
  const { formatDate } = useLocaleFormats();
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: notes } = useStagePracticeNotes(userId, STAGE);
  const saveMutation = useSaveStagePracticeNote(userId);

  const [draft, setDraft] = useState("");

  const handleSave = useSingleFlight(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await saveMutation.mutateAsync({ stage: STAGE, note: trimmed });
      setDraft("");
    } catch {
      // Failure is surfaced via the global save-failed toast.
    }
  });

  const recent = (notes ?? []).slice(0, MAX_RECENT);

  // No card and no title of its own (#853): daily-life practice is the method's
  // destination and stays on the overview at stage 10, but as one section in
  // the page's rhythm rather than a standout panel. The overview's `Section`
  // eyebrow and the archive's screen header each name it once already.
  return (
    <View className="gap-3">
      <Text variant="muted" className="text-sm">
        {t("module.dailyLife.subtitle")}
      </Text>

      <Textarea
        value={draft}
        onChangeText={setDraft}
        placeholder={t("module.dailyLife.placeholder")}
        accessibilityLabel={t("module.dailyLife.title")}
        numberOfLines={3}
      />
      <Button onPress={handleSave} disabled={!draft.trim() || saveMutation.isPending}>
        <Text>{t("module.dailyLife.save")}</Text>
      </Button>

      {recent.length > 0 ? (
        <View className="gap-2 pt-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("module.dailyLife.recent")}
          </Text>
          {recent.map((note) => (
            <View key={note.id} className="gap-0.5">
              <Text className="text-xs text-muted-foreground">{formatDate(note.updatedAt)}</Text>
              <Text className="text-sm">{note.note}</Text>
            </View>
          ))}
          {(notes?.length ?? 0) > MAX_RECENT ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/tools/meditation/daily-life")}
            >
              <Text className="text-sm text-primary-ink">{t("module.dailyLife.viewAll")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
