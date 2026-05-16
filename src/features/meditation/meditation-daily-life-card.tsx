import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSaveStagePracticeNote, useStagePracticeNotes } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";

const STAGE = 10;
const MAX_RECENT = 7;

export function MeditationDailyLifeCard() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: notes } = useStagePracticeNotes(userId, STAGE);
  const saveMutation = useSaveStagePracticeNote(userId);

  const [draft, setDraft] = useState("");

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    saveMutation.mutate(
      { stage: STAGE, note: trimmed },
      {
        onSuccess: () => setDraft(""),
      },
    );
  }

  const recent = (notes ?? []).slice(0, MAX_RECENT);

  return (
    <Card className="border-be/30 bg-be/5">
      <CardContent className="gap-3 pt-6">
        <CardTitle>{t("module.dailyLife.title")}</CardTitle>
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
                <Text className="text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </Text>
                <Text className="text-sm">{note.note}</Text>
              </View>
            ))}
            {(notes?.length ?? 0) > MAX_RECENT ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/modules/meditation/daily-life")}
              >
                <Text className="text-sm text-primary">{t("module.dailyLife.viewAll")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
