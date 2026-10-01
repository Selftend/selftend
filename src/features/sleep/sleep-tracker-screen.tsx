import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { Section } from "@/src/components/app/section";
import { SleepOnboarding } from "@/src/components/app/sleep-onboarding-modal";
import { useSleepLogs, useSleepLogCount, useSleepStats } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { formatCompactAtOffset } from "@/src/utils/date";
import { formatDuration, formatHours } from "@/src/features/sleep/format";
import {
  averageDurationMinutes,
  averageQuality,
  extremes,
  qualityDistribution,
  recentNights,
  weekdayAverages,
} from "@/src/features/sleep/summaries";
import { SleepDurationChart } from "@/src/features/sleep/sleep-duration-chart";
import { SleepQualityMix } from "@/src/features/sleep/sleep-quality-mix";
import { SleepWeekdayChart } from "@/src/features/sleep/sleep-weekday-chart";
import { SleepRecentList } from "@/src/features/sleep/sleep-recent-list";
import { ShowAllLink } from "@/src/components/app/show-all-link";

export default function SleepTrackerScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t, i18n } = useTranslation("sleep");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: logs } = useSleepLogs(userId, 50);
  // Exact lifetime total for the hero - the list above is capped at 50, so its length
  // would freeze the displayed "nights" count once a user passes that many logs.
  const { data: totalNights } = useSleepLogCount(userId);
  // Every summary below used to be computed from that same capped list, so each was
  // really a "newest 50 logs" figure sitting next to an exact lifetime night count: the
  // longest/shortest night and the weekday averages truncated past 50 logs, and the 7-
  // and 30-day windows truncated once more than 50 logs fell inside them (#256).
  const { data: stats } = useSleepStats(userId);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const allLogs = logs ?? [];
  // `logs`, `totalNights` and `stats` are each `undefined` while loading and after a
  // failed fetch with no cache - never a user with no nights. Only an actually-loaded
  // (possibly empty) history may claim a count or draw an empty state, or a returning
  // user's whole history reads as erased for the fetch window (ADR-0009 clause 1,
  // #2854). Each surface below gates on the first of its own sources to answer, and
  // draws nothing until then - the check-in and habits overviews' pattern.
  const logsLoaded = logs !== undefined;
  const countLoaded = totalNights !== undefined || logsLoaded;
  const summariesLoaded = stats !== undefined || logsLoaded;
  // The loaded logs stand in only until the server stats arrive (`undefined` while
  // loading); once they do they win, including a genuine null for "no nights in that
  // window", which is not the same as a zero-hour average.
  const sevenDayDuration = stats
    ? stats.sevenDayDurationMinutes
    : averageDurationMinutes(allLogs, 7);
  const sevenDayQuality = stats ? stats.sevenDayQuality : averageQuality(allLogs, 7);
  const { longest, shortest } = stats
    ? { longest: stats.longestMinutes, shortest: stats.shortestMinutes }
    : extremes(allLogs);
  const distribution = stats ? stats.qualityDistribution30 : qualityDistribution(allLogs, 30);
  const weekly = stats ? stats.weekdayAverageMinutes : weekdayAverages(allLogs);
  // Left on the capped list deliberately: the chart draws the newest 14 nights, which the
  // 50-log query always covers, so there is nothing here for a server aggregate to fix.
  const nights14 = recentNights(allLogs, 14);
  // ISO timestamps sort lexically, so the max is the latest log regardless of
  // the list's own ordering.
  const lastLog = allLogs.reduce<(typeof allLogs)[number] | null>(
    (latest, log) => (latest === null || log.loggedAt > latest.loggedAt ? log : latest),
    null,
  );
  const lastWhen = lastLog
    ? formatCompactAtOffset(lastLog.loggedAt, lastLog.loggedOffsetMinutes)
    : null;
  // `logs` is undefined while loading and after a failed fetch with no cache -
  // only an actually-loaded (possibly empty) history may claim "no sleep
  // logged", or a returning user's history reads as erased.
  const subline = lastWhen
    ? t("stats.last", { when: lastWhen })
    : logs
      ? t("stats.never")
      : undefined;

  return (
    <>
      <SleepOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              title={t("title")}
              tourScope="sleep"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "sleep" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                // Never a dash while the reads are in flight (ADR-0009 clause 1,
                // #2874): both stats quote `stats` with the loaded logs standing
                // in, so until either source answers they are omitted - the
                // gratitude hero's shape (#2855). The "-" the loaded branches
                // keep is a different statement: a LOADED "no nights in that
                // window", which is a fact, not a placeholder.
                ...(summariesLoaded
                  ? [
                      {
                        value: formatHours(sevenDayDuration, i18n.language, t),
                        label: t("hero.avg"),
                      },
                      {
                        value: sevenDayQuality !== null ? `${sevenDayQuality}/5` : "-",
                        label: t("hero.quality"),
                      },
                    ]
                  : []),
                // Omitted until either count source has answered (habits' two-week-
                // ticks pattern): `totalNights ?? allLogs.length` is a fabricated "0"
                // while both queries are still in flight (#2854).
                ...(countLoaded
                  ? [
                      {
                        value: String(totalNights ?? allLogs.length),
                        label: t("hero.entries", { count: totalNights ?? allLogs.length }),
                      },
                    ]
                  : []),
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
            />
            <View className="flex-row gap-3">
              <Button onPress={() => pushWithOrigin("/tools/sleep/new")} className="self-start">
                <Icon name="bedtime" className="size-4 text-primary-foreground" />
                <Text>{t("cta.log")}</Text>
              </Button>
            </View>

            {/*
              Hairline Sections, no cards (#878): the 8a annotation is "Four
              stat cards and three empty panels become one chart plus a
              hairline read-out". The four stat tiles are gone — the header
              stat run already carries typical + quality + nights, and
              longest/shortest fold into the read-out line under the duration
              chart. No 8h-target or hit-rate line: #772 decided against a
              target on principle, and that stands over the drawn annotation.

              The Sections sit in a no-gap group: each carries its own py-6,
              so the column's gap-6 would compound into an asymmetric 48px
              band above every divider (same fix as grounding/gratitude).
            */}
            {/*
              Each chart and the recent list draw NOTHING until the data they quote
              has loaded (#2854): their "Log a few sleep entries…" / "No sleep logged
              yet" empty states branch on emptiness, and an unloaded history is empty
              without being a fact. Only a loaded-and-empty history may say so - the
              section eyebrows stay, because they are true in every state.
            */}
            <View>
              <Section title={t("chart.duration14")}>
                {logsLoaded ? <SleepDurationChart nights={nights14} /> : null}
                {longest !== null && shortest !== null ? (
                  <View className="flex-row flex-wrap items-center gap-y-1">
                    <Text variant="muted" className="text-[13px] tabular-nums">
                      {t("stats.longest")}{" "}
                      <Text className="text-[13px] font-semibold tabular-nums text-foreground">
                        {formatDuration(longest, t)}
                      </Text>
                    </Text>
                    <Text className="px-2.5 text-[13px] text-muted-foreground/50">·</Text>
                    <Text variant="muted" className="text-[13px] tabular-nums">
                      {t("stats.shortest")}{" "}
                      <Text className="text-[13px] font-semibold tabular-nums text-foreground">
                        {formatDuration(shortest, t)}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </Section>

              <Section title={t("chart.qualityMix")}>
                {summariesLoaded ? <SleepQualityMix distribution={distribution} /> : null}
              </Section>

              <Section title={t("chart.weekdayAvg")}>
                {summariesLoaded ? <SleepWeekdayChart averages={weekly} /> : null}
              </Section>

              <Section
                title={t("sections.recent")}
                action={
                  /* The door beside its own room: all-history replaces the old
                   expand-in-place toggle (#775, pattern from #696). */
                  <ShowAllLink label={t("allHistory.link")} route="/tools/sleep/history" />
                }
              >
                {logsLoaded ? <SleepRecentList logs={allLogs} /> : null}
              </Section>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
