import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";

/**
 * "Looking back" (#1835) - the record over time, across tools. It computes
 * nothing (#1840): no cross-tool scalar, no trend, no comparison.
 *
 * The 30-day mood trend that used to open this screen is gone. It was the one
 * tool's chart standing in for every tool's record, and the map that removed it
 * (#1826) also removed the frame it carried - `noMoodData` read "Log a mood to
 * start your trend", an imperative wrapped around a debt the user does not owe.
 * The screen states what is there and stops.
 *
 * The recovery-plan door is here (#1905) - the one thing on this screen a
 * person can act on, and the one thing here that is written rather than
 * computed. The time view lands next (#1906), and brings the only marks this
 * screen will ever draw.
 */
export default function ProgressScreen() {
  const { t } = useTranslation("navigation");
  const pushWithOrigin = usePushWithOrigin();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Column on the padded box, not inside it - see `layout.ts` (#1721). */}
      <ScrollView contentContainerClassName={cn("grow p-6", HOME_COLUMN)}>
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("progress.title")} />
            <Text variant="muted">{t("progress.description")}</Text>
          </View>

          {/*
            One pinned prompt (#1665). Four questions used to rotate by
            `new Date().getDay() % 4` - the card's only sentence changed daily
            on a rule nobody could see, which is a schedule, not a library
            (the same mechanism #765 removed from habits home). Content may
            vary only in a fixed order the user advances themselves.
          */}
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.reflectionTitle")}</CardTitle>
              <CardDescription>{t("progress.reflectionDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text className="italic text-muted-foreground">{t("progress.prompt")}</Text>
            </CardContent>
          </Card>

          {/*
            The screen's only door (#1905, from #1840 decision 5). #1833 found
            exactly one cross-technique review object in the literature - the
            end-of-therapy blueprint - and it survived that research where
            computed aggregates did not, because it is USER-WRITTEN.

            ☠️ Unconditional, and its wording never varies. Hiding it at zero
            would make a door's presence a function of the record - and it is
            most useful when there is nothing to look back on yet.

            ☠️ A DOOR, NOT A COPY. `RecoveryTimelineCard` is not hoisted here:
            it states per tool, first use plus a lifetime count, where this
            screen's unit is the day. A preview of the plan is the spanning
            scalar #1840 cut, re-entering as a card.

            ⚠️ `AccessibleCardLink` costs the description on web - its
            `accessibilityLabel` hides the children and its `accessibilityHint`
            is unimplemented by react-native-web. Acceptable here by that
            component's own rule: the title fully names the destination and the
            description is context, not a read value.

            `usePushWithOrigin`, never a bare push: `/modules/cbt/recovery`
            climbs to `/modules/cbt`, so an Origin-less arrival would offer Up
            into a module the person was never in.
          */}
          <AccessibleCardLink
            title={t("progress.recoveryTitle")}
            description={t("progress.recoveryDescription")}
            onPress={() => pushWithOrigin("/modules/cbt/recovery")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
