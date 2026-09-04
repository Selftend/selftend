import { RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";

import { Text } from "@/src/components/react-native-reusables/text";
import { resolveDisplayName } from "@/src/features/profile/display-name";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";
import { favoriteItems, MODULES, TOOLS } from "@/src/features/favorites/items";
import { ItemCardRow } from "@/src/features/favorites/item-card";
import { useFavorites } from "@/src/features/favorites/queries";
import { HomeTour } from "@/src/features/tours/home-tour";
import { HOME_COLUMN } from "@/src/lib/layout";

const PADDING = 24;

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0];
}

/**
 * One headed section. The heading is explicitly level 2: a level-less heading renders
 * `<h1>` on react-native-web, and this screen already has one (the greeting). Three
 * sibling `h2`s under it is the whole heading structure.
 *
 * The heading renders whatever the body does — including nothing. That is what lets
 * Favourites show its heading alone while its query is pending, and it is what makes
 * "the Modules heading is always there" a structural fact rather than a branch.
 */
function Section({
  testID,
  title,
  children,
}: {
  testID: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View testID={testID} className="gap-3.5">
      <Text variant="h2" className="text-2xl font-bold tracking-tight">
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Home (#1956, spec #1885): greeting → Favourites → Tools → Modules.
 *
 * Favourites is the eleven-item catalogue FILTERED by the person's rows; the complete
 * catalogue follows — all eight tools, then all three modules — through the same card, so
 * a favourited item appears twice, plainly and unmarked. No `Right now`, no header actions,
 * no dashed empty box, no `Guided programmes` tier, no unsupported-build state: the
 * eleven items are a constant, so there is nothing for Home to be empty OF.
 *
 * ☠️ The Modules section renders UNCONDITIONALLY — with zero favourites, zero programme
 * state, and for a guest. This is `docs/positioning.md` § The hard rule, clause 1 (no
 * surface presents the tools without the method somewhere on it), and it was failing in
 * production because the old method tier rendered only for users holding programme
 * widgets. Never hide it when empty, collapse it, or defer it below a "show more";
 * applying the empty-Favourites "one quiet line" pattern here returns Home to the bare
 * inventory it used to ship.
 *
 * ☠️ `home-layout` must keep exactly that testID: settings-account.e2e scopes to it,
 * panel-navigation.e2e counts roots by it, and .maestro/app-store-screenshots.yaml waits
 * on it for 90 s inside a 75-minute job. None of those has a compile-time guard.
 *
 * No window-width read and no breakpoint (the test pins the import's absence): the `wide`
 * flag existed for header actions that no longer exist, and the card row wraps on its own.
 */
export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);

  const { selectedDate } = useSelectedDate();
  const hour = new Date().getHours();
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseLocalNoon(selectedDate));

  const greeting = t(pickGreetingKey(hour));
  const fullName = resolveDisplayName(profile ?? null, user);
  const displayName = fullName ? firstWord(fullName) : null;
  const greetingLine = displayName
    ? t("today.greetingWithName", { greeting, name: displayName })
    : t("today.greetingPlain", { greeting });

  const { data: favorites, refetch, isRefetching } = useFavorites(userId);
  const favourites = favorites === undefined ? undefined : favoriteItems(favorites);

  /**
   * Eyebrow and `h1`, and it stops there (#960).
   *
   * Home carries no derived prose. Exactly two children is the assertion (`home-greeting`),
   * not the absence of a testID: a `queryByTestId(...).toBeNull()` for copy that no longer
   * exists passes forever and rots silently.
   */
  const greetingBlock = (
    <View testID="home-greeting" className="pb-5">
      <Text variant="eyebrow">
        {/* Home always describes the device's current local day (#250), so it
            names it rather than testing a constant (#720). */}
        {t("today.eyebrow", { date: dateLabel })}
      </Text>
      <Text variant="h1" className="mt-2.5 text-[32px] font-extrabold leading-[1.1] tracking-tight">
        {greetingLine}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View testID="home-layout" className="flex-1">
        <AnimatedScrollView
          contentContainerStyle={{ padding: PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <View className={HOME_COLUMN}>
            {greetingBlock}

            <View className="gap-8">
              {/*
                Before the favourites query settles: the heading and NOTHING else — not
                the empty line. The empty line is a claim ("you have none"), and a loading
                surface never claims emptiness. Once loaded: the cards, or one muted line.
                No box, no button, no "browse" door — the catalogue is the next paragraph.
              */}
              <Section testID="home-favourites" title={t("today.sections.favorites")}>
                {favourites === undefined ? null : favourites.length === 0 ? (
                  <Text variant="muted">{t("today.favorites.empty")}</Text>
                ) : (
                  <ItemCardRow items={favourites} userId={userId} favorites={favorites} />
                )}
              </Section>

              {/* "Your tools" lost its possessive on purpose: this is the whole catalogue,
                  and nothing about it is the person's. The possessive moved to the
                  section that earns it. */}
              <Section testID="home-tools" title={t("today.sections.tools")}>
                <ItemCardRow items={TOOLS} userId={userId} favorites={favorites} />
              </Section>

              <Section testID="home-modules" title={t("today.sections.modules")}>
                <ItemCardRow items={MODULES} userId={userId} favorites={favorites} />
              </Section>
            </View>
          </View>
        </AnimatedScrollView>
      </View>
      <HomeTour />
    </SafeAreaView>
  );
}
