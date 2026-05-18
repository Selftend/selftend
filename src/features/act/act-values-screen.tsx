import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { useBullsEyeSnapshots, useValueEntries } from "@/src/features/act/queries";
import { RelatedTools } from "@/src/features/act/related-tools";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

export default function ActValuesScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { data: entries, isLoading } = useValueEntries(user?.id ?? null);
  const { data: snapshots } = useBullsEyeSnapshots(user?.id ?? null);

  const latestRating = (domain: ACTLifeDomain): number | null => {
    const snap = snapshots?.find((s) => s.domain === domain);
    return snap?.alignmentRating ?? null;
  };

  const entryForDomain = (domain: ACTLifeDomain) =>
    entries?.find((e) => e.lifeDomain === domain) ?? null;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t("values.listTitle")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("values.listTitle")}</Text>
            </View>
            <Text variant="muted">{t("values.listSubtitle")}</Text>
          </View>

          <Button
            variant="secondary"
            onPress={() =>
              router.push("/modules/act/values/bulls-eye" as Parameters<typeof router.push>[0])
            }
          >
            <Icon name="my-location" className="size-4 text-foreground" />
            <Text>{t("values.bullsEyeButton")}</Text>
          </Button>

          <Text variant="muted" className="text-xs">
            {t("values.domainIntro")}
          </Text>

          <RelatedTools
            tools={[{ icon: "edit-note", nameKey: "journal", href: "/tools/journal" }]}
          />

          <View className="gap-3">
            {ACT_LIFE_DOMAINS.map((domain) => {
              const entry = entryForDomain(domain);
              const rating = entry?.currentAlignmentRating ?? latestRating(domain);
              const hasEntry = Boolean(entry?.valueStatement);

              return (
                <Pressable
                  key={domain}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/modules/act/values/[domain]",
                      params: { domain },
                    } as Parameters<typeof router.push>[0])
                  }
                  className="rounded-xl border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold">{t(`values.${domain}`)}</Text>
                      {hasEntry ? (
                        <Text variant="muted" className="text-xs leading-snug" numberOfLines={2}>
                          {entry!.valueStatement}
                        </Text>
                      ) : (
                        <Text variant="muted" className="text-xs italic">
                          {t("values.notSet")}
                        </Text>
                      )}
                      {rating !== null ? (
                        <View className="mt-1 flex-row items-center gap-1">
                          <AlignmentBar rating={rating} />
                          <Text className="text-xs text-act">
                            {t("values.alignmentLabel", { rating })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Icon
                      name={hasEntry ? "chevron-right" : "add"}
                      className={cn("size-4", hasEntry ? "text-muted-foreground" : "text-act")}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlignmentBar({ rating }: { rating: number }) {
  return (
    <View className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
      <View className="h-full rounded-full bg-act" style={{ width: `${(rating / 10) * 100}%` }} />
    </View>
  );
}
