import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ItemCard } from "@/src/features/favorites/item-card";
import { MODULE_ITEMS } from "@/src/features/favorites/items";
import { useSession } from "@/src/providers/session-provider";

/**
 * The three modules, through THE ONE CARD (#1955). The tiles moved to
 * `src/features/favorites/items.ts` with the tools, in the one array Home filters.
 *
 * What the module tile lost on the way (spec #1885 §2.1): its long description (the CBT
 * one carried "Evidence-based strategies for…", a claim shape not reintroduced), the
 * `border-t` footer that had one occupant across three cards, the mark's border (a box in
 * a bordered box) and the forward arrow. What replaced the description is a short
 * fragment in the same register as the eight tool subtitles. The "Soon" badge and the
 * roadmap footer had already gone at #1020; DBT is a real destination.
 */
export default function ModulesScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;

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
            {MODULE_ITEMS.map((item) => (
              <ItemCard key={item.key} item={item} userId={userId} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
