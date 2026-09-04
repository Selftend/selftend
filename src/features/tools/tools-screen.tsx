import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ItemCardRow } from "@/src/features/favorites/item-card";
import { TOOLS } from "@/src/features/favorites/items";
import { useFavorites } from "@/src/features/favorites/queries";
import { useSession } from "@/src/providers/session-provider";

/**
 * The eight tool hubs — the first eight of the favourites catalogue, through the one
 * card (#1955). The star is live here too: one component means favouriting works from
 * the catalogue pages, accepted deliberately rather than as a side effect.
 *
 * The hub's own stat implementation is gone. It claimed emptiness while loading
 * (`?? 0` rendered "No logs yet" to a user with two hundred), capped a 7-day mood
 * summary at 30 rows against ADR-0001, and labelled a trailing window "this week". The
 * card's stat line is Home's, keyed by tool key — one implementation, two surfaces.
 */
export default function ToolsScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: favorites } = useFavorites(userId);

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

          <ItemCardRow items={TOOLS} userId={userId} favorites={favorites} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
