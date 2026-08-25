import { ActivityIndicator, RefreshControl, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { AnimatedScrollView } from "@/src/components/app/animated-scroll-view";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  AppOnboardingWizard,
  type AppOnboardingResult,
} from "@/src/components/app/app-onboarding-wizard";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { resolveDisplayName } from "@/src/features/profile/display-name";
import { useUserProfile } from "@/src/features/profile/queries";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { parseLocalNoon } from "@/src/utils/date";
import { resolveWidget } from "@/src/features/home/widget-registry";
import { useWidgetTiers } from "@/src/features/home/widget-tiers";
import { ToolTierRow } from "@/src/features/home/tool-row-stats";
import { RightNowTier } from "@/src/features/home/right-now-tier";
import { useWidgetPreferences } from "@/src/features/home/queries";
import { useApplyWidgetSuggestions } from "@/src/features/onboarding/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { HomeTour } from "@/src/features/tours/home-tour";
import { useTourTargetRef } from "@/src/features/tours/tour-targets";
import { cn } from "@/lib/utils";

const PADDING = 24;
/**
 * Phone below, desktop at or above - the same 640 breakpoint and the same
 * `useWindowDimensions` source `ToolRow` uses, so the header actions and the rows they
 * sit above never disagree about which face the screen is wearing.
 */
const WIDE_HEADER_WIDTH = 640;

// Memoized widget body. id and userId are stable, so the (data-fetching, computation-heavy)
// widget subtree is not re-run on home's re-renders. Each widget's own query hooks still
// drive its data updates.
const WidgetContent = memo(function WidgetContent({ id, userId }: { id: string; userId: string }) {
  return resolveWidget(id, userId);
});

function pickGreetingKey(hour: number) {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0];
}

/**
 * One header action. Phone gets a 36px icon-only square, desktop the same glyph with its
 * label beside it - and the `accessibilityLabel` is set in BOTH, so the two faces are named
 * identically and the icon-only one is never a mystery glyph to a screen reader.
 *
 * 36px is under the 44px pointer target, which is why `Button` carries
 * `DEFAULT_INTERACTIVE_HIT_SLOP`: the drawn square is 36px, the touchable is not.
 */
function HeaderAction({
  icon,
  label,
  wide,
  variant,
  iconClassName,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  wide: boolean;
  variant?: "ghost";
  iconClassName: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      variant={variant}
      size={wide ? "sm" : "icon"}
      // `size="icon"` is 40px on phone by design-system default; this cluster is specified
      // at 36px, and tailwind-merge drops the `h-10 w-10` in favour of the later class.
      className={cn(!wide && "h-9 w-9")}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Icon name={icon} className={iconClassName} />
      {wide ? (
        <Text className={variant === "ghost" ? "text-primary" : undefined}>{label}</Text>
      ) : null}
    </Button>
  );
}

/**
 * The empty box's mark: one drawn ring, 44px desktop / 42px phone.
 *
 * This replaced `BreathingDotEmpty`, three concentric SVG circles whose colours were
 * `stroke`/`fill` PROPS. An SVG prop cannot read a CSS variable, so those rings were
 * hand-copied `hsla(262, 62%, 56%, …)` literals - the DEFAULT palette's accent - and they
 * stayed violet on every other palette while the `+` in the middle followed the style.
 * `useAccentHsl` fixed the value but not the mechanism, and the mechanism was the problem:
 * a prop is invisible to the token gates, so only a bespoke 8-palette render test could
 * see it. Plain classes are what the gates already read, which is why deleting that test
 * with the component is safe rather than a loss of coverage.
 */
function EmptyStateMark({ wide }: { wide: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="home-empty-mark"
      className={cn(
        "items-center justify-center rounded-full border border-primary/30 bg-primary/10",
        wide ? "size-11" : "size-[42px]",
      )}
    >
      <Icon name="add" size={22} className="text-primary" />
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useUserProfile(user);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const { selectedDate } = useSelectedDate();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_HEADER_WIDTH;
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

  const { data: preferences, isLoading, refetch, isRefetching } = useWidgetPreferences(userId);
  const { data: userPreferences } = useUserPreferences(userId);
  const applySuggestions = useApplyWidgetSuggestions(userId);

  const editButtonsRef = useTourTargetRef("home-edit");

  /**
   * The tier partition, shared with `/arrange` rather than restated here (see
   * `widget-tiers.ts`). Both screens must agree on it or they lie to each other.
   *
   * Day-level slot suppression is GONE with the fixed-height grid: `routines-today` used
   * to be withheld entirely on a day with nothing scheduled, because a 200px empty card
   * was worse than no card. A row costs one line and says "Nothing scheduled today",
   * which is a fact the old grid had no room to state.
   */
  const { widgetIds, toolIds, programmeIds } = useWidgetTiers(preferences);

  /**
   * `Get suggestions` runs `apply_widget_recommendations`, which opens with
   * `delete from public.widget_preferences where user_id = uid` - a whole-dashboard
   * rewrite. That is correct on first run and destructive anywhere else, so the offer is
   * gated twice over.
   *
   * On the UNFILTERED row count, not on `widgetIds`: a row for an id this build does not
   * implement is invisible to the screen but very much present in the table, and it would
   * be deleted just the same. (One face of #964; the general defect stays open.)
   *
   * And on the rows having actually ARRIVED. `undefined` is not zero - it is what the
   * query holds while disabled (`enabled: Boolean(userId)`, briefly false on web
   * hydration) and after an error, and in neither state is `isLoading` true to catch it.
   * `(preferences ?? []).length === 0` would read both as "the table is empty" and offer
   * to rewrite a dashboard nobody has seen. The box still renders in those states,
   * because an unknown dashboard and an empty one look the same; what must not happen is
   * the destructive offer appearing beside it.
   */
  const dashboardIsEmpty = preferences !== undefined && preferences.length === 0;

  /**
   * Rows exist, and NONE of them is something this build can render (#964).
   *
   * `isImplemented` filters ids the running build does not know, and the repo has no OTA
   * channel - old native builds persist indefinitely - so a user who rebuilt their
   * dashboard on web out of newer ids opens their phone to a screen with nothing on it.
   *
   * The destructive half of this is already handled: `Get suggestions` is gated on the
   * UNFILTERED count, so it cannot offer to rewrite a table it cannot see. What was left
   * is that the box then said "Add tools you want to check in with each day" to someone
   * who has added plenty - home stating something false about the user's record, which is
   * the one thing an empty state must never do.
   */
  const dashboardIsUnsupported =
    preferences !== undefined && preferences.length > 0 && widgetIds.length === 0;

  /**
   * Home no longer writes to `widget_preferences` at all - it reads them and renders
   * them. Add, remove, reorder and undo moved to `/arrange` with the mode that used to
   * host them (#980), so there is no mutation on this screen to guard, no undo stack to
   * keep, and no state that can be left stranded by a row leaving.
   */
  const openArrange = () => router.push("/arrange");

  /**
   * Eyebrow and `h1`, and it stops there (#960).
   *
   * Home carries no derived prose: live state is shown by `Right now` existing, recorded
   * state by the row that owns it, and the absence of both by absence. The tinted hero box
   * went with the third line - a box exists to separate its contents from the page, and
   * two lines of chrome at the top of a scroll have nothing to be separated from.
   *
   * Exactly two children is the assertion (`home-greeting`), not the absence of a testID:
   * a `queryByTestId(...).toBeNull()` for copy that no longer exists passes forever and
   * rots silently.
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

  /**
   * The `Your tools` heading and its actions, rendered with the rows they name rather
   * than in the page header. They used to sit in `header`, which put this heading
   * ABOVE the `Right now` tier - so the tier was not first, and the heading was
   * separated from its own list by everything in between.
   */
  const toolsHeader = (
    <View className="flex-row items-center justify-between gap-3">
      {/* Section heading row. The heading is bare - one tier, one name. */}
      <Text variant="h2" className="min-w-0 flex-1 text-xl font-bold tracking-tight">
        {t("home.tiers.tools")}
      </Text>
      {/*
        Two actions, and they render iff the tool tier is non-empty: both of them act on
        rows, and there are no rows to act on. The empty box below carries its own
        `Add manually`, so nothing becomes unreachable.

        The tour target rides this cluster, and that is deliberate rather than tolerated:
        `HomeTour` builds its queue from targets that are already REGISTERED, so an
        unmounted cluster makes the `home:edit` stop skip - silently, and without marking
        it shown, which is what leaves it to fire the first time the user owns a tool.
      */}
      {toolIds.length > 0 ? (
        <View className="flex-row items-center gap-1.5" ref={editButtonsRef}>
          {/*
            Both actions open `/arrange`, and neither is a toggle any more (#980). The
            first once flipped a mode and relabelled itself `Done`; `Done` is now the
            route's own control, which is what makes hardware and browser back mean the
            same thing. The second opened `AddWidgetModal`, and adding lives on that same
            screen as a chip run - so this is one destination reached by the two verbs
            people arrive with.
          */}
          <HeaderAction
            icon="tune"
            label={t("home.arrangeLabel")}
            wide={wide}
            variant="ghost"
            iconClassName="size-5 text-primary"
            onPress={openArrange}
          />
          <HeaderAction
            icon="add"
            label={t("home.addToolLabel")}
            wide={wide}
            iconClassName="size-5 text-primary-foreground"
            onPress={openArrange}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <View
        // `home-layout` is load-bearing beyond this screen: settings-account.e2e scopes
        // to it and .maestro/app-store-screenshots.yaml waits on it for 90s.
        testID="home-layout"
        className="flex-1"
      >
        <AnimatedScrollView
          contentContainerStyle={{ padding: PADDING }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {greetingBlock}

          {/*
            `Right now` is home's FIRST tier and is NOT id-driven: zero rows in
            `widget_preferences`, derived entirely from live state, absent from arrange
            mode without a special case, and collapsing to nothing - heading included -
            once the day is satisfied. On a loading or empty dashboard it renders
            nothing, because no owned id means no eligible nudge.
          */}
          <RightNowTier userId={userId} widgetIds={widgetIds} />

          {/*
            Above the branch, not inside it: this block holds the `home-edit` tour
            target, and `HomeTour` builds its queue from targets that are already
            registered. Mounted only after the widget query settles, the dashboard tip
            loses that race and is silently dropped.
          */}
          {toolsHeader}

          {/*
            A loading surface never claims emptiness. The spinner is the first branch and
            the dashed box is unreachable until the query settles, so `Add tools you want
            to check in with each day` is never shown to someone who has some.
          */}
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="mt-1 gap-7">
              {/*
                The dashed box is the TOOL TIER's empty state, not the page's - it renders
                beside a programme card rather than instead of it. The design never drew
                that state; the split falls out of `apply_widget_recommendations` being a
                whole-dashboard rewrite, so only the offer inside the box is gated on the
                page being empty.

                No starter cards. A starter tap has exactly two possible meanings and both
                break: `open the tool` leaves home permanently empty so the screen never
                resolves itself, and `add and open` silently writes a persisted row from a
                card that reads as a suggestion - with undo living on a screen an empty
                dashboard has no reason to be on.
              */}
              {toolIds.length === 0 ? (
                <View
                  testID="home-empty-state"
                  className="items-center gap-3.5 rounded-2xl border border-dashed border-border px-6 py-10"
                >
                  <EmptyStateMark wide={wide} />
                  <View className="items-center gap-1.5 px-6">
                    <Text className="text-center text-[15px] font-semibold">
                      {t(dashboardIsUnsupported ? "today.unsupportedTitle" : "today.emptyTitle")}
                    </Text>
                    <Text
                      variant="muted"
                      className="text-center text-[13px] leading-relaxed max-w-[34ch]"
                    >
                      {t(
                        dashboardIsUnsupported
                          ? "today.unsupportedDescription"
                          : "today.emptyDescription",
                      )}
                    </Text>
                  </View>
                  {/*
                    Neither button is primary, and `Add manually` is first. Three different
                    arrangements existed across the two frames and the shipped code, so
                    there was no intent to preserve - and the two choices are peers: one
                    builds the dashboard by hand, the other by questionnaire.
                  */}
                  <View className="mt-2 w-full max-w-sm gap-2 sm:flex-row">
                    <Button variant="outline" className="flex-1" onPress={openArrange}>
                      <Text>{t("today.addManually")}</Text>
                    </Button>
                    {dashboardIsEmpty ? (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => setSuggestionsVisible(true)}
                      >
                        <Text>{t("today.getSuggestions")}</Text>
                      </Button>
                    ) : null}
                  </View>
                </View>
              ) : (
                /*
                  Two tiers over ONE ordered list, and home renders both as plain lists.

                  The sortable left with the mode (#980). Home is now a read-only view of
                  `widget_preferences` in `position` order - which also retires the whole
                  `Sortable.Grid` cache-a-stale-prop family of defects from this screen,
                  since `renderItem` no longer exists here to hand a row a prop that
                  changes after mount.
                */
                <View className="gap-1">
                  {toolIds.map((id) => (
                    <ToolTierRow key={id} id={id} userId={userId} />
                  ))}
                </View>
              )}

              {programmeIds.length > 0 ? (
                <View className="gap-2">
                  <Text variant="h2" className="text-xl font-bold tracking-tight">
                    {t("home.tiers.programmes")}
                  </Text>
                  {programmeIds.map((id) => (
                    <WidgetContent key={id} id={id} userId={userId ?? ""} />
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </AnimatedScrollView>
      </View>

      {suggestionsVisible && dashboardIsEmpty ? (
        <AppOnboardingWizard
          visible
          // The empty-dashboard re-offer: skipping only hides a suggestion
          // and saves nothing, so its Escape stays a bare X (M2, #1258).
          skipPersists={false}
          includeWelcome={false}
          initialConcerns={userPreferences?.selectedConcerns ?? []}
          isPending={applySuggestions.isPending}
          errorMessage={
            applySuggestions.isError ? t("settings:onboarding.appSaveError") : undefined
          }
          onFinish={(result: AppOnboardingResult) => {
            applySuggestions.mutate(result, {
              onSuccess: () => setSuggestionsVisible(false),
            });
          }}
          onSkip={() => setSuggestionsVisible(false)}
        />
      ) : null}
      <HomeTour />
    </SafeAreaView>
  );
}
