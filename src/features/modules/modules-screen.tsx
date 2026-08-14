import { router, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { CHROME_RULE, CHROME_TEXT, CHROME_WASH } from "@/src/lib/theme/chrome";

type ModuleKey = "cbt" | "act" | "dbt";

// The tile no longer has a `badgeKey` (#1020). It held one value, `"soon"`, on
// one tile, DBT - and the pill it rendered was the second of two places the app
// advertised a module it does not have, the sidebar row being the first.
//
// `footerKey` survives the same sweep with different wording rather than being
// deleted, because the DBT tile still needs to say what it is. "On the roadmap"
// promised a module; "Overview" describes the screen you actually land on. Its
// sibling value `"inDesign"` came off here too - no tile ever carried it.
interface ModuleTile {
  key: ModuleKey;
  href: Href;
  abbreviation: string;
  nameKey: string;
  descriptionKey: string;
  footerKey: "overview" | null;
}

const MODULES: ModuleTile[] = [
  {
    key: "cbt",
    href: "/modules/cbt",
    abbreviation: "CBT",
    nameKey: "today.modules.cbtName",
    descriptionKey: "today.modules.cbtDescription",
    footerKey: null,
  },
  {
    key: "act",
    href: "/modules/act",
    abbreviation: "ACT",
    nameKey: "today.modules.actName",
    descriptionKey: "today.modules.actDescription",
    footerKey: null,
  },
  {
    key: "dbt",
    href: "/modules/dbt",
    abbreviation: "DBT",
    nameKey: "today.modules.dbtName",
    descriptionKey: "today.modules.dbtDescription",
    footerKey: "overview",
  },
];

// Three cards, one treatment (#587). Each tile used to carry its own
// `containerClass` / `markClass` / `MARK_TEXT_CLASS` triple - a violet-bordered
// CBT card, a green ACT card, a blue DBT card - and this screen plus /tools were
// the two #558's prototype found byte-identical after the rooms went neutral,
// because none of that colour was ever poured. It sat right here, in the table.
//
// The abbreviation inside the mark is `text-sm font-bold` (14px, under WCAG's
// 18.66px bold large-text threshold), so it owes the 4.5:1 small-text floor on
// the wash behind it. That was the whole reason the old map existed: each hue
// needed its own ink to clear it, and `cbt` had to wait for #421 to give
// `primary` an ink at all. `text-foreground` on `bg-muted` is the pairing the
// app holds to that floor everywhere else, so the per-module map has nothing
// left to say.
const MARK_CLASS = cn(CHROME_WASH, CHROME_RULE);

export default function ModulesScreen() {
  const { t } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("modulesPage.title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("modulesPage.description")}
            </Text>
            <Text variant="muted" className="max-w-[64ch]">
              {t("modulesPage.whereToStart")}
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

  return (
    <Pressable
      accessibilityHint={t(module.descriptionKey)}
      accessibilityLabel={t(module.nameKey)}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(module.href)}
      className="min-w-[280px] flex-1 basis-[280px] gap-4 rounded-2xl border border-border bg-card p-5 active:bg-accent/40"
      role="button"
    >
      <View className="flex-row items-center gap-3">
        <View className={cn("size-12 items-center justify-center rounded-xl border", MARK_CLASS)}>
          <Text className={cn("text-sm font-bold tracking-wider", CHROME_TEXT)}>
            {module.abbreviation}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{t(module.nameKey)}</Text>
        </View>
      </View>
      <Text variant="muted" className="text-sm leading-5">
        {t(module.descriptionKey)}
      </Text>
      <View className="flex-row items-center justify-between border-t border-border pt-3">
        <Text variant="muted" className="text-xs">
          {module.footerKey ? t(`modulesPage.stats.${module.footerKey}`) : ""}
        </Text>
        {/* Always the forward arrow. DBT used to draw `schedule` - a clock face,
            the wordless form of "not yet" - and every tile here leads somewhere
            that exists, so every tile points forward. */}
        <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
      </View>
    </Pressable>
  );
}
