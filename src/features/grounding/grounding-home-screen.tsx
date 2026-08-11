import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ErrorState } from "@/src/components/app/screen-state";
import { Section } from "@/src/components/app/section";
import { Text } from "@/src/components/react-native-reusables/text";
import { TechniqueCard } from "@/src/features/grounding/technique-card";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { GroundingOnboarding } from "@/src/components/app/grounding-onboarding-modal";
import { groundingTechniques } from "@/src/constants/grounding";
import { useGroundingSessionCount, useGroundingSessions } from "@/src/features/grounding/queries";
import { GroundingSessionRow } from "@/src/features/grounding/grounding-session-row";
import { cn } from "@/lib/utils";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import { formatCompactAtOffset } from "@/src/utils/date";
import { formatRelativeDayKey } from "@/src/utils/relative-time";

export default function GroundingHomeScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: sessions, isError: sessionsFailed, refetch } = useGroundingSessions(userId, 5);
  const { data: sessionCount } = useGroundingSessionCount(userId);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  // "Last grounded" derives from the recent window the screen already queries;
  // scan for the latest completedAt rather than trusting order (breathing
  // home precedent).
  // The whole session is kept, not just the instant: the label renders in the
  // frame the session was captured in (#433 §3).
  const lastSession = (sessions ?? []).reduce<MindfulnessSession | null>(
    (latest, s) => (latest === null || s.completedAt > latest.completedAt ? s : latest),
    null,
  );
  const lastWhen = lastSession
    ? formatCompactAtOffset(lastSession.completedAt, lastSession.completedOffsetMinutes)
    : null;
  // `sessions` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim
  // "no sessions yet", or a returning user's history reads as erased.
  const subline = lastWhen
    ? t("grounding.hero.last", { when: lastWhen })
    : sessions
      ? t("grounding.hero.never")
      : undefined;

  const roomStyle = useRoomStyle("clay");

  return (
    <>
      <GroundingOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-4">
          <View className={cn(HOME_COLUMN, "gap-6")}>
            <ModuleHomeHeader
              addWidgetCategory="grounding"
              title={t("grounding.title")}
              tourScope="grounding"
              description={t("grounding.description")}
              actions={[
                { type: "notifications", targetKey: "grounding" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={[
                {
                  value: String(groundingTechniques.length),
                  label: t("grounding.hero.techniques", { count: groundingTechniques.length }),
                },
                {
                  value:
                    sessionCount === undefined ? t("grounding.hero.loading") : String(sessionCount),
                  label: t("grounding.hero.sessions", { count: sessionCount ?? 0 }),
                },
                // The old ToolStats.subline, folded into the row as a value-less
                // item - which is how the design renders "last logged 4:50 pm".
                ...(subline ? [{ value: "", label: subline }] : []),
              ]}
            />
            {/* The acute-distress tool carries the crisis affordance on its
                HOME, above the technique list (#887, jointly #882/#868) — and
                deliberately NOT inside the session flow, which stays
                chrome-free. */}
            <CrisisSupportBar />
            {/* The Sections sit in a no-gap group: each carries its own py-6,
                so the parent's gap-6 would compound into a 72px band between
                them (design 5a separates sections by the rows' own hairlines,
                not top rules — hence ruled={false} on both; the crisis row's
                bottom hairline divides above the first). */}
            <View>
              {/* The Section eyebrow every conformant overview uses (#875),
                  not an h3 heading. */}
              <Section title={t("grounding.choose")} ruled={false} className="gap-1 pt-0">
                <View>
                  {groundingTechniques.map((technique) => (
                    <TechniqueCard
                      key={technique.slug}
                      technique={technique}
                      title={t(`grounding.techniques.${technique.slug}.title`)}
                      description={t(`grounding.techniques.${technique.slug}.shortDescription`)}
                      meta={
                        technique.kind === "senses"
                          ? t("grounding.meta.senses", { count: technique.steps.length })
                          : t("grounding.meta.guided", { count: technique.steps.length })
                      }
                      onPress={() => router.push(`/tools/grounding/${technique.slug}`)}
                    />
                  ))}
                  {/* Closing hairline: the rows are top-ruled, so the last one
                      needs a floor. */}
                  <View className="border-t border-border" />
                </View>
              </Section>

              <Section
                ruled={false}
                title={t("grounding.recent.title")}
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/tools/grounding/history")}
                    role="button"
                    className="active:opacity-70"
                  >
                    {/* No hardcoded arrow: the label is the translated string
                        alone, like every sibling show-all link. */}
                    <Text className="text-[12.5px] font-semibold text-muted-foreground">
                      {t("grounding.recent.showAll")}
                    </Text>
                  </Pressable>
                }
              >
                {sessionsFailed && !sessions ? (
                  <ErrorState
                    icon="cloud-off"
                    title={t("grounding.recent.error.title")}
                    description={t("grounding.recent.error.description")}
                    action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
                  />
                ) : sessions?.length ? (
                  <View>
                    {sessions.map((session) => (
                      <GroundingSessionRow
                        key={session.id}
                        session={session}
                        when={formatRelativeDayKey(session.dayKey, t)}
                      />
                    ))}
                  </View>
                ) : sessions ? (
                  <Text variant="muted">{t("grounding.recent.empty")}</Text>
                ) : null}
              </Section>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
