import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { enterKeyActivationProps } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { FORM_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";
import { DBT_GROUPS, DBT_GROUP_SLUGS } from "@/src/features/dbt/dbt-home-config";

/**
 * The learn primer at `/modules/dbt/learn` (spec §8.5): what DBT is, why
 * "dialectical", how much and how, and a door to each of the four groups.
 *
 * Static text, on the CBT learn page's card shape. Nothing records, nothing
 * varies by day or by visit, and nothing branches on anything the person has
 * entered - these pages carry the module's whole reading, including every
 * exercise the module deliberately does not build.
 *
 * ⚠️ `CrisisSupportBar` on EVERY learn page is a deliberate departure from the
 * sibling learn surfaces (CBT's distortion guide has none; ACT teaches through
 * a modal). It is argued by the content: these pages carry the abuse-boundary
 * line and the four professional referrals, and a page that names those doors
 * should carry the app's own door beside them.
 */

export default function DbtLearnPrimerScreen() {
  const { t } = useTranslation("dbt");
  const pushWithOrigin = usePushWithOrigin();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <View className="gap-2">
            <ScreenHeader title={t("learn.title")} />
            <Text variant="muted">{t("learn.description")}</Text>
          </View>

          <CrisisSupportBar />

          <Card>
            <CardHeader>
              <CardTitle>{t("learn.whatTitle")}</CardTitle>
              <CardDescription>{t("learn.whatBody")}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("learn.whyTitle")}</CardTitle>
              <CardDescription>{t("learn.whyBody")}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("learn.commitmentTitle")}</CardTitle>
              <CardDescription>{t("learn.commitmentBody")}</CardDescription>
            </CardHeader>
          </Card>

          {/*
           * Pace and mode, in DBT's voice: the one place this module's over-use
           * answer is taught, static by ruling, with the professional door as
           * its last sentence and nothing behind it (ADR-0004 § "The over-use
           * obligation"). ☠️ It must not reuse the CBT card's own phrasing -
           * the same teaching, said twice in the same words, is a third surface
           * carrying a signature that `test/over-use-copy.test.ts` pins to two.
           */}
          <Card>
            <CardHeader>
              <CardTitle>{t("learn.pacing.title")}</CardTitle>
              <CardDescription>{t("learn.pacing.rhythm")}</CardDescription>
              <CardDescription>{t("learn.pacing.signs")}</CardDescription>
            </CardHeader>
          </Card>

          <View className="gap-3">
            <View>
              <Text variant="h2" className="text-xl font-bold tracking-tight">
                {t("learn.groupsTitle")}
              </Text>
              <Text variant="muted" className="mt-1 text-sm leading-snug">
                {t("learn.groupsDescription")}
              </Text>
            </View>

            {DBT_GROUPS.map((group) => {
              const open = () =>
                pushWithOrigin({
                  pathname: "/modules/dbt/learn/[group]",
                  params: { group: DBT_GROUP_SLUGS[group.key] },
                });
              return (
                <Pressable
                  key={group.key}
                  // "link", because every press navigates. ☠️ A link with no
                  // `href` is a `<div role="link">` on web, which
                  // react-native-web leaves to the browser on Enter as though
                  // it were an anchor - so the door brings its own Enter
                  // handler (#1730).
                  accessibilityRole="link"
                  onPress={open}
                  {...enterKeyActivationProps(open)}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 active:bg-accent/40"
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    className="size-9 items-center justify-center rounded-lg bg-muted"
                  >
                    <Text className="text-base font-extrabold">
                      {t(`groups.${group.key}.ordinal`)}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-semibold leading-tight">
                      {t(`groups.${group.key}.name`)}
                    </Text>
                    <Text variant="muted" className="mt-0.5 text-[12.5px] leading-snug">
                      {t(`groups.${group.key}.desc`)}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} className="text-muted-foreground" />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
