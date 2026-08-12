import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Text } from "@/src/components/react-native-reusables/text";
import { MeditationPracticesSection } from "@/src/features/meditation/meditation-practices-section";
import { cn } from "@/lib/utils";
import { FORM_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";

/**
 * The practices reference, on a route of its own (#853).
 *
 * It lived below the overview's drawn blocks with no route, so cutting it there
 * would have made it unreachable rather than relocated. The overview now holds
 * a door to this screen instead, and converges on the drawn design.
 */
export default function MeditationPracticesScreen() {
  const { t } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  // `?practice=` deep links used to point at the overview; the overview now
  // forwards them here, so the param keeps pre-opening the named practice.
  const { practice } = useLocalSearchParams<{ practice?: string }>();

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-4">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <View className="gap-2">
            <ScreenHeader title={t("practices.sectionLabel")} />
            <Text variant="muted">{t("practices.subtitle")}</Text>
          </View>
          <MeditationPracticesSection initialPractice={practice} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
