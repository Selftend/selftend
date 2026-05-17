import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

type ModuleKey = "cbt" | "act" | "dbt";

interface ModuleTile {
  key: ModuleKey;
  href: string;
  abbreviation: string;
  nameKey: string;
  descriptionKey: string;
  badgeKey: "soon" | null;
  footerKey: "inDesign" | "onRoadmap" | null;
  containerClass: string;
  markClass: string;
  badgeClass: string;
}

const MODULES: ModuleTile[] = [
  {
    key: "cbt",
    href: "/modules/cbt",
    abbreviation: "CBT",
    nameKey: "today.modules.cbtName",
    descriptionKey: "today.modules.cbtDescription",
    badgeKey: null,
    footerKey: null,
    containerClass: "border-primary/30",
    markClass: "bg-primary/15 border-primary/30",
    badgeClass: "bg-act/15 text-act",
  },
  {
    key: "act",
    href: "/modules/act",
    abbreviation: "ACT",
    nameKey: "today.modules.actName",
    descriptionKey: "today.modules.actDescription",
    badgeKey: null,
    footerKey: null,
    containerClass: "border-act/30",
    markClass: "bg-act/15 border-act/30",
    badgeClass: "bg-act/15 text-act",
  },
  {
    key: "dbt",
    href: "/modules/dbt",
    abbreviation: "DBT",
    nameKey: "today.modules.dbtName",
    descriptionKey: "today.modules.dbtDescription",
    badgeKey: "soon",
    footerKey: "onRoadmap",
    containerClass: "border-be/30",
    markClass: "bg-be/15 border-be/30",
    badgeClass: "bg-muted text-muted-foreground",
  },
];

const MARK_TEXT_CLASS: Record<ModuleKey, string> = {
  cbt: "text-primary",
  act: "text-act",
  dbt: "text-be",
};

export default function ModulesScreen() {
  const { t } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("modulesPage.title")}</Text>
            </View>
            <Text variant="muted" className="max-w-[64ch]">
              {t("modulesPage.description")}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {MODULES.map((module) => (
              <ModuleCard key={module.key} module={module} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({ module }: { module: ModuleTile }) {
  const { t } = useTranslation("navigation");
  const isLocked = module.badgeKey === "soon";

  return (
    <Pressable
      accessibilityHint={t(module.descriptionKey)}
      accessibilityLabel={t(module.nameKey)}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(module.href as Parameters<typeof router.push>[0])}
      className={cn(
        "min-w-[280px] flex-1 basis-[280px] gap-4 rounded-2xl border bg-card p-5 active:bg-accent/40",
        module.containerClass,
      )}
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={cn("size-12 items-center justify-center rounded-xl border", module.markClass)}
        >
          <Text className={cn("text-sm font-bold tracking-wider", MARK_TEXT_CLASS[module.key])}>
            {module.abbreviation}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{t(module.nameKey)}</Text>
        </View>
        {module.badgeKey ? (
          <View className={cn("rounded-full px-2 py-0.5", module.badgeClass)}>
            <Text
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                module.badgeClass,
              )}
            >
              {t(`modulesPage.stats.${module.badgeKey}`)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="muted" className="text-sm leading-5">
        {t(module.descriptionKey)}
      </Text>
      <View className="flex-row items-center justify-between border-t border-border pt-3">
        <Text variant="muted" className="text-xs">
          {module.footerKey ? t(`modulesPage.stats.${module.footerKey}`) : ""}
        </Text>
        <Icon
          name={isLocked ? "schedule" : "arrow-forward"}
          className="size-4 text-muted-foreground"
        />
      </View>
    </Pressable>
  );
}
