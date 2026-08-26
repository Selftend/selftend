import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { SharedToolsRow } from "@/src/components/app/shared-tools-row";
import { useCommittedActions } from "@/src/features/act/queries";
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

export default function ActCommittedActionListScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { data: actions, isLoading } = useCommittedActions(user?.id ?? null);

  if (isLoading) {
    return <ScreenLoading title={t("committedAction.listTitle")} />;
  }

  const active = actions?.filter((a) => a.status === "active") ?? [];
  const completed = actions?.filter((a) => a.status === "completed") ?? [];
  const abandoned = actions?.filter((a) => a.status === "abandoned") ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("committedAction.listTitle")} />
            <Text variant="muted">{t("committedAction.listSubtitle")}</Text>
          </View>

          <Button onPress={() => pushWithOrigin("/modules/act/committed-action/new")}>
            <Icon name="directions-run" className="size-4 text-primary-foreground" />
            <Text>{t("committedAction.newTitle")}</Text>
          </Button>

          <SharedToolsRow
            heading={t("alsoTry")}
            tools={[
              {
                key: "habits",
                route: "/tools/habits",
                icon: "task-alt",
                labelKey: "navigation:sidebar.habits",
              },
            ]}
          />

          {!actions || actions.length === 0 ? (
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
