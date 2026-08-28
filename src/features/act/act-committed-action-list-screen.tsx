import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HelpButton } from "@/src/components/app/help-button";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ErrorState, ScreenLoading } from "@/src/components/app/screen-state";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { ACT_SHARED_TOOLS } from "@/src/features/act/act-shared-tools";
import { useCommittedActionArchivePages, useCommittedActions } from "@/src/features/act/queries";
import { type ActionStatus, type CommittedAction } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { formatDayKey } from "@/src/utils/date";
import { cn } from "@/lib/utils";

const STATUS_BADGE_CLASS: Record<ActionStatus, string> = {
  active: "bg-muted text-foreground",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400",
  abandoned: "bg-muted text-muted-foreground",
};

/**
 * Committed actions, split by status rather than paged flat (#1517 tier 3).
 *
 * ☠️ **This screen is why #1516's hand-off did not work as written.** It used to make ONE
 * unbounded fetch and filter it client-side into three sections. #1516 left
 * `listCommittedActions` uncapped and said its bound would arrive "when the committed-action
 * list screen takes the keyset shape" — but a flat `created_at desc` page cuts across all
 * three sections: page one can legitimately hold zero active rows, and the sections would
 * fill raggedly as the user scrolls.
 *
 * So the read is split instead:
 *
 * - **Active stays whole and unbounded.** It is a working set, not a feed. The widget, the
 *   routines engine and the programme each treat a missing row as a row that does not
 *   exist, so a cap here would silently drop a commitment a user is still working on —
 *   a worse failure than an expensive read (#1516's argument, which stands).
 * - **Completed and abandoned are paged.** They are the only half that grows without end,
 *   and the only half that is history.
 *
 * Status sectioning names no day, so none of this is a #1513 second-frame problem. The
 * day-namer on a row is `formatDayKey(targetDate)` — a `YYYY-MM-DD` the user PICKED,
 * noon-anchored and immune to timezone conversion, which is why this screen was never one
 * of the ACT surfaces making a read-time civil-day claim.
 */
export default function ActCommittedActionListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation(["act", "errors"]);
  const { user } = useSession();
  const {
    data: activeActions,
    isLoading,
    isError: activeFailed,
    refetch: refetchActive,
  } = useCommittedActions(user?.id ?? null, "active");
  const {
    data: archivePages,
    fetchNextPage,
    hasNextPage,
    isError: archiveFailed,
    isFetchingNextPage,
    isPending: archivePending,
    refetch: refetchArchive,
  } = useCommittedActionArchivePages(user?.id ?? null);

  if (isLoading || archivePending) {
    return <ScreenLoading title={t("committedAction.listTitle")} />;
  }

  const readFailed = activeFailed || archiveFailed;
  const active = activeActions ?? [];
  const archive = archivePages?.pages.flat() ?? [];
  // The archive read filters to these two statuses in SQL; splitting the page here is
  // presentation, and it keeps the shipped three-section shape rather than flattening it.
  const completed = archive.filter((a) => a.status === "completed");
  const abandoned = archive.filter((a) => a.status === "abandoned");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader
              title={t("committedAction.listTitle")}
              right={<HelpButton helpKey="committedAction" />}
            />
            <Text variant="muted">{t("committedAction.listSubtitle")}</Text>
          </View>

          <Button onPress={() => pushWithOrigin("/modules/act/committed-action/new")}>
            <Icon name="directions-run" className="size-4 text-primary-foreground" />
            <Text>{t("committedAction.newTitle")}</Text>
          </Button>

          <SharedToolsRow heading={t("alsoTry")} tools={[ACT_SHARED_TOOLS.habits]} />

          {/*
            ☠️ A failed read is NOT an empty list. Either half failing has to say so:
            "No committed actions yet" over an error tells a user who is mid-commitment
            that nothing was ever recorded, and on the ACTIVE half it also contradicts the
            widget and the routines engine, which are reading the same rows successfully.
          */}
          {readFailed ? (
            <ErrorState
              icon="cloud-off"
              title={t("errors:fallback.title")}
              description={t("errors:fallback.description")}
              action={{
                label: t("errors:fallback.retry"),
                onPress: () => {
                  if (activeFailed) void refetchActive();
                  if (archiveFailed) void refetchArchive();
                },
              }}
            />
          ) : active.length === 0 && archive.length === 0 ? (
            <Text variant="muted">{t("committedAction.noActions")}</Text>
          ) : null}

          {active.length > 0 ? (
            <ActionGroup title={t("committedAction.activeTitle")} items={active} />
          ) : null}

          {completed.length > 0 ? (
            <ActionGroup title={t("committedAction.completedTitle")} items={completed} />
          ) : null}

          {abandoned.length > 0 ? (
            <ActionGroup title={t("committedAction.abandonedTitle")} items={abandoned} />
          ) : null}

          {/*
            ⚠️ A "Show more" button rather than an infinite `FlatList`: the three sections
            live inside this `ScrollView`, and a nested virtualised list there is the React
            Native anti-pattern that breaks both scrollers. One control extends the archive
            as a whole, because both finished sections are pages of the same read.
          */}
          {hasNextPage ? (
            <Button
              variant="secondary"
              disabled={isFetchingNextPage}
              onPress={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? <ActivityIndicator /> : null}
              <Text>{t("committedAction.showMore")}</Text>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionGroup({ title, items }: { title: string; items: CommittedAction[] }) {
  const pushWithOrigin = usePushWithOrigin();
  // Its own hook rather than `t` and the language handed down as two props:
  // both are halves of one concern, and `formatDayKey`'s default would
  // otherwise read the module-global language — a second source that only
  // happens to agree with the one the rest of the row's copy comes from.
  const { t, i18n } = useTranslation("act");

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {items.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() =>
            pushWithOrigin({
              pathname: "/modules/act/committed-action/[id]",
              params: { id: action.id },
            })
          }
          className="rounded-xl border border-border bg-card p-4 active:bg-accent/40"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 gap-1">
              <Text className="font-semibold leading-snug" numberOfLines={2}>
                {action.title}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text variant="muted" className="text-xs">
                  {t(`values.${action.lifeDomain}`)}
                </Text>
                <View className={cn("rounded-full px-2 py-0.5", STATUS_BADGE_CLASS[action.status])}>
                  <Text className="text-xs font-medium">
                    {t(`committedAction.status.${action.status}`)}
                  </Text>
                </View>
              </View>
              {action.targetDate ? (
                <Text variant="muted" className="text-xs">
                  {t("committedAction.targetDateDisplay", {
                    date: formatDayKey(action.targetDate, i18n.language),
                  })}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron-right" className="size-4 text-muted-foreground" />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
