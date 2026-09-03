import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * Where an under-floor verdict lands (#1764, spec #227 §3).
 *
 * ⚠️ **Deliberately unfinished, and the unfinished parts are #1765's**: the
 * `/crisis` and Find A Helpline links, deletion of the auth user that already
 * exists on three of the four entry paths, and the device-local flag that stops
 * an immediate same-device retry. This ticket owns the routing, and a route
 * needs somewhere to arrive - shipping the gate without this file would drop an
 * under-floor person into the app, which is the one outcome the gate exists to
 * prevent.
 *
 * What is already true and must stay true through #1765:
 *
 * - **Nothing has been written.** The gate persists an attestation only on a
 *   pass, so there is no `age_floor_met = false` row anywhere - which is also
 *   why arriving here is not remembered yet.
 * - **No way forward, and no invitation to answer again.** There is no button,
 *   no retry, and no hint about what a passing answer would have been. A screen
 *   that offered "try again" would be a screen that taught the floor.
 * - **It does not scold.** It states a rule and where the person stands against
 *   it, and nothing else. No wrongdoing is implied, because none occurred.
 */
export function UnderFloorScreen() {
  const { t } = useTranslation("auth");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow items-center justify-center p-6">
        <Card className="w-full max-w-lg" testID="under-floor-screen">
          <CardHeader>
            <CardTitle>{t("underFloor.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <Text>{t("underFloor.body")}</Text>
              <Text className="text-muted-foreground text-sm">{t("underFloor.retention")}</Text>
              <Text className="text-muted-foreground text-sm">{t("underFloor.closing")}</Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
