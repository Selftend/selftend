import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { DayAverage, EmotionCount, WeekDelta } from "@/src/features/mood/summaries";
import { parseLocalNoon } from "@/src/utils/date";

interface WeekHeroProps {
  delta: WeekDelta;
  byDay: DayAverage[];
  topEmotions: EmotionCount[];
}

function deltaCopy(delta: WeekDelta, t: TFunction) {
  if (delta.delta === null) return { text: t("week.noComparison"), tone: "text-muted-foreground" };
  if (delta.delta > 0)
    return { text: t("week.deltaUp", { delta: delta.delta.toFixed(1) }), tone: "text-act" };
  if (delta.delta < 0)
    return {
      text: t("week.deltaDown", { delta: Math.abs(delta.delta).toFixed(1) }),
      tone: "text-destructive",
    };
  return { text: t("week.deltaFlat"), tone: "text-muted-foreground" };
}

export function WeekHero({ delta, byDay, topEmotions }: WeekHeroProps) {
  const { t, i18n } = useTranslation("mood");
  const { resolveEmotion } = useEmotionDisplay();
  const d = deltaCopy(delta, t);
  const todayKey = byDay[byDay.length - 1]?.dateKey;

  return (
    <Card>
      <CardContent className="gap-5 pt-5 pb-5">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("week.average")}
            </Text>
            <Text className="text-[40px] font-extrabold leading-[1.1] tracking-tight">
              {delta.current === null ? "-" : delta.current.toFixed(1)}
            </Text>
            <Text className={cn("text-[13px] font-semibold", d.tone)}>{d.text}</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("week.byDay")}
          </Text>
          <View className="h-24 flex-row items-end gap-2">
            {byDay.map((day) => {
              const heightPct = day.average === null ? 0 : (day.average / 5) * 100;
              const isToday = day.dateKey === todayKey;
              const letter = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(
                parseLocalNoon(day.dateKey),
              );
              return (
                <View key={day.dateKey} className="flex-1 items-center gap-1.5">
                  <View className="h-[70px] w-full justify-end">
                    <View
                      className={cn("w-full rounded-md", isToday ? "bg-be" : "bg-be/30")}
                      style={{ height: `${Math.max(heightPct, day.average === null ? 0 : 6)}%` }}
                    />
                  </View>
                  <Text variant="muted" className="text-[11px] font-semibold">
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("week.feltMost")}
          </Text>
          {topEmotions.length === 0 ? (
            <Text variant="muted" className="text-[13px]">
              {t("week.noEmotions")}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {topEmotions.map((e) => {
                const display = resolveEmotion(e.id);
                return (
                  <View key={e.id} className="rounded-full bg-be/10 px-3 py-1.5">
                    <Text className="text-[13px] text-be">
                      {display.emoji} {display.name} · {e.count}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}
