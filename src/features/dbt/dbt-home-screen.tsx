import { useEffect } from "react";
import { Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { PillarCard } from "@/src/components/app/pillar-card";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";
import { DBT_GROUPS, DBT_GROUP_SLUGS } from "@/src/features/dbt/dbt-home-config";
import {
  useDbtSessionCount,
  useEmotionRecordCount,
  useJudgementCount,
  useOppositeActionPlanCount,
  usePrefetchCopingPlan,
  useScriptCount,
  useWiseMindCheckinCount,
} from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";

/**
 * The DBT module home (spec §8.2, design `1a`).
 *
 * It CONVERTS the overview screen this route used to hold rather than replacing
 * it: `/modules/dbt`, its sidebar row, its crumb and its `Stack.Screen` all
 * shipped already, and the four skill groups were already explained here. What
 * changed is that the groups are now doors rather than a reading - the reading
 * moved to `/modules/dbt/learn`, which is where the eyebrow, the *What DBT is*
 * card and the "guided exercises are in CBT and ACT" sentence went with it.
 *
 * ⚠️ The h1 is SENTENCE case, deliberately, while CBT's and ACT's are title
 * case. The three disagree today; DBT's casing is ruled and the siblings are an
 * observation for a later pass, not something to "fix" by changing this one.
 *
 * Not here yet, and each arrives with the slice that builds it: the tool rows
 * (a row is added when its route exists - see `DbtGroup.tools`), the bell (the
 * `dbt` reminder target is the programme's), and the programme card. There is
 * deliberately NO recent-records feed: six record kinds make any one feed
 * favouritism, every list is one tap away, and the programme card carries the
 * state a feed would be standing in for.
 */
export default function DbtHomeScreen() {
  const { t } = useTranslation("dbt");
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Head counts, never `list.length` - a client-side count reads back a wrong,
  // too-small number as soon as the list is capped (#1378).
  const { data: wiseMind } = useWiseMindCheckinCount(userId);
  const { data: judgements } = useJudgementCount(userId);
  const { data: emotions } = useEmotionRecordCount(userId);
  const { data: oppositeAction } = useOppositeActionPlanCount(userId);
  const { data: scripts } = useScriptCount(userId);
  const { data: sessions } = useDbtSessionCount(userId);

  // The coping plan is the one thing a person opens IN a hard moment, so the
  // card is warmed here while they are calm. Native only: the query cache is
  // persisted on iOS and Android and memory-only on the web, so there is
  // nothing for a web prefetch to survive into (#1986). Nothing on the card
  // says which platform it is on.
  const prefetchCopingPlan = usePrefetchCopingPlan();
  useEffect(() => {
    if (Platform.OS === "web") return;
    prefetchCopingPlan(userId);
  }, [prefetchCopingPlan, userId]);

  const counts = [wiseMind, judgements, emotions, oppositeAction, scripts];
  // ☠️ An unresolved count is NOT zero. `?? 0` would tell someone with 200
  // records they had none for as long as the query was in flight - the
  // history-looks-smaller lie the em dash exists to prevent. One unresolved
  // count leaves the whole sum unknown, so the dash covers all five.
  const records = counts.some((count) => count === undefined)
    ? undefined
    : counts.reduce((total, count) => total! + count!, 0);

  const statValue = (count: number | undefined) =>
    count === undefined ? t("home.statLoadingValue") : String(count);

  const stats = [
    { value: statValue(records), label: t("home.statRecords", { count: records ?? 0 }) },
    { value: statValue(sessions), label: t("home.statSessions", { count: sessions ?? 0 }) },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-4">
        <View className={cn(HOME_COLUMN, "gap-6")}>
          <ModuleHomeHeader
            title={t("home.title")}
            description={t("home.description")}
            stats={stats}
            actions={[
              {
                // A page, not a modal: DBT has no primer modal and no
                // onboarding, so the info action is a door to the learn primer.
                type: "info",
                onPress: () => pushWithOrigin("/modules/dbt/learn"),
                accessibilityLabel: t("home.learnLabel"),
              },
            ]}
          />

          {/* ⚠️ Level 2, like CBT's and ACT's framework headings: it INTRODUCES
              the four cards below it, so flattening it to 3 would put it on a
              level with what it contains and leave the page without an outline.
              The page reads h1 → h2 → the cards. */}
          <View className="gap-6">
            <View>
              <Text variant="h2" className="text-xl font-bold tracking-tight">
                {t("home.groupsTitle")}
              </Text>
              <Text variant="muted" className="mt-1 max-w-[62ch] text-sm leading-snug">
                {t("home.groupsDescription")}
              </Text>
            </View>

            {DBT_GROUPS.map((group) => (
              <View key={group.key} className="gap-2">
                <PillarCard
                  letter={t(`groups.${group.key}.ordinal`)}
                  title={t(`groups.${group.key}.name`)}
                  kicker={t(`groups.${group.key}.desc`)}
                  description={t(`groups.${group.key}.desc`)}
                  onToolPress={(toolKey) => {
                    if (toolKey === "learn") {
                      pushWithOrigin({
                        pathname: "/modules/dbt/learn/[group]",
                        params: { group: DBT_GROUP_SLUGS[group.key] },
                      });
                      return;
                    }
                    const tool = group.tools.find((candidate) => candidate.key === toolKey);
                    if (tool) pushWithOrigin(tool.route);
                  }}
                >
                  {group.tools.map((tool) => (
                    <PillarCard.Tool
                      key={tool.key}
                      toolKey={tool.key}
                      icon={tool.icon}
                      name={t(`tools.${tool.key}.name`)}
                      desc={t(`tools.${tool.key}.desc`)}
                    />
                  ))}
                  {/* Last on every card, by design: the reading sits under the
                      doing, not beside it. */}
                  <PillarCard.Tool
                    toolKey="learn"
                    icon="menu-book"
                    name={t("tools.learn.name")}
                    desc={t("tools.learn.desc")}
                  />
                </PillarCard>
                <View className="ml-5 mr-2">
                  <SharedToolsRow heading={t("home.sharedTools")} tools={group.shared} />
                </View>
              </View>
            ))}
          </View>

          <CrisisSupportCallout />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
