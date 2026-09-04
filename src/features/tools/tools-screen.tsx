import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ItemCard } from "@/src/features/favorites/item-card";
import { TOOL_ITEMS } from "@/src/features/favorites/items";
import { useSession } from "@/src/providers/session-provider";

/**
 * The eight tool hubs, through THE ONE CARD (#1955). The tiles and the array that
 * ordered them moved to `src/features/favorites/items.ts`, because catalogue order is
 * the favourites feature's business: Home's Favourites is that array filtered.
 *
 * This screen's own stat implementation is gone with them. It was wrong three ways
 * (spec #1885 §2.3): it claimed emptiness while loading, capped mood at 30 rows for a
 * 7-day summary against ADR-0001, and labelled a trailing window "this week". The card
 * reads Home's stat rows instead, so one implementation exists.
 */
export default function ToolsScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("tools.title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("tools.description")}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {TOOL_ITEMS.map((item) => (
              <ItemCard key={item.key} item={item} userId={userId} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
