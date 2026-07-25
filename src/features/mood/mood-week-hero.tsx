import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { MOOD_EMOJI_BY_SCORE } from "@/src/components/app/mood-scale";
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
            <Text className="font-display text-[40px] font-extrabold leading-[1.1] tracking-tight">
              {delta.current === null ? "-" : delta.current.toFixed(1)}
            </Text>
            <Text className={cn("text-[13px] font-semibold", d.tone)}>{d.text}</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("week.byDay")}
          </Text>
          <View className="flex-row gap-1">
            {byDay.map((day) => {
              const isToday = day.dateKey === todayKey;
              const date = parseLocalNoon(day.dateKey);
              const letter = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(
                date,
              );
              const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: "long" }).format(
                date,
              );
              // Day averages are means of 1-5 scores, so Math.round stays in range;
              // clamp anyway so a bad value can never index off the emoji map.
              const score =
                day.average === null ? null : Math.min(5, Math.max(1, Math.round(day.average)));
              return (
                <View
                  key={day.dateKey}
                  accessible
                  accessibilityRole="image"
                  // RNW drops the native-only `accessible` prop, and a generic div
                  // prohibits an accessible name — the img role carries the label on web.
                  role="img"
                  accessibilityLabel={
                    score === null
                      ? t("week.dayNoEntry", { day: dayName })
                      : t("week.dayScore", {
                          day: dayName,
                          score: t(`checkin.scaleLabels.${score}`),
                        })
                  }
                  testID={isToday ? "week-strip-today" : undefined}
                  className={cn(
                    "flex-1 items-center gap-1.5 rounded-xl py-1.5",
                    isToday && "bg-be/10",
                  )}
                >
                  <View className="h-8 items-center justify-center">
                    {score === null ? (
                      <View
                        testID="week-strip-empty-dot"
                        className="h-2.5 w-2.5 rounded-full border-[1.5px] border-muted-foreground/40"
                      />
                    ) : (
                      <Text className="text-2xl leading-none">{MOOD_EMOJI_BY_SCORE[score]}</Text>
                    )}
                  </View>
                  <Text
                    variant="muted"
                    className={cn("text-[11px] font-semibold", isToday && "text-be")}
                  >
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
