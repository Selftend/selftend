import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ItemCardRow } from "@/src/features/favorites/item-card";
import { MODULES } from "@/src/features/favorites/items";
import { useFavorites } from "@/src/features/favorites/queries";
import { useSession } from "@/src/providers/session-provider";

/**
 * The three modules — the last three of the favourites catalogue, through the one card
 * (#1955). The module tile's long description, its footer and its forward arrow are
 * gone with #1887's card: the "what it is" slot holds a short fragment now, the star
 * owns the trailing column, and a module draws no stat line at all.
 *
 * No tile carries a status (#1020): the footer whose one occupant was "Overview" is
 * deleted, and with it the slot a "Soon" could return to. The module landings carry
 * their own copy (`cbt:home.description`), which is where the longer description lives.
 */
export default function ModulesScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: favorites } = useFavorites(userId);

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

          <ItemCardRow items={MODULES} userId={userId} favorites={favorites} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
