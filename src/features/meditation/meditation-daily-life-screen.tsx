import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MeditationDailyLifeCard } from "@/src/features/meditation/meditation-daily-life-card";
import { useStagePracticeNotes } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";
import { useLocaleFormats } from "@/src/lib/locale-format";
import { useRoomStyle } from "@/src/lib/use-room-style";

const STAGE = 10;

export default function MeditationDailyLifeScreen() {
  const { t } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  const { formatDateTime } = useLocaleFormats();
  const { user } = useSession();
  const { data: notes } = useStagePracticeNotes(user?.id ?? null, STAGE);

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the iris pour through it. No field
    // here - meditation's only immersive surface is home.
    <View testID="meditation-daily-life-room" className="flex-1" style={roomStyle}>
      <MobileFormScreen>
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("module.dailyLife.archiveTitle")} />
            <Text variant="muted">{t("module.dailyLife.archiveSubtitle")}</Text>
          </View>

          <MeditationDailyLifeCard />

          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("module.dailyLife.allEntries")}
            </Text>
            {(notes ?? []).length === 0 ? (
              <Text variant="muted">{t("module.dailyLife.empty")}</Text>
            ) : (
              <View className="gap-3">
                {(notes ?? []).map((note) => (
                  <View key={note.id} className="gap-1 rounded-lg border border-border bg-card p-3">
                    <Text className="text-xs text-muted-foreground">
                      {formatDateTime(note.updatedAt)}
                    </Text>
                    <Text className="text-sm">{note.note}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </MobileFormScreen>
    </View>
  );
}
