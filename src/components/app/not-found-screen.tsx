import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * The catch-all for a URL no route matches (`app/+not-found.tsx` re-exports it;
 * it lives here because a test file under `app/` would itself register as a
 * route).
 *
 * It used to escape through a bare `<Link href="/" replace>` - a real way out,
 * but not chrome, so the coverage gate (#1263, G4) would have had to accept
 * "chrome *or* some link home" - the exact widening that re-opens the hole the
 * rule closes. Converted instead (#1255): `ScreenTopBar` carries the one
 * Escape, and the link is gone rather than kept alongside it (R1 - two exits
 * are two promises).
 *
 * The Escape follows the trail of the *attempted* path, exactly as chrome does
 * everywhere: a wholly unknown path is a one-crumb screen whose trail hides and
 * whose hop is Home ("Back to Home"); a path with a real ancestor offers that
 * ancestor instead (`/tools/whatever` says "Back to Tools"). An unknown
 * ancestor announces "Go back" and lands here again, one segment shallower -
 * still an exit each time, converging on Home.
 */
export default function NotFoundScreen() {
  const { t } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenTopBar />
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <Text variant="h1">{t("notFound.title")}</Text>
      </View>
    </SafeAreaView>
  );
}
