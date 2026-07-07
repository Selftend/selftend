// Per-family subpath, not the "@expo/vector-icons" barrel (which bundles all 15 families).
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "nativewind";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";

type StoreId = "android" | "ios";

const STORE_ICONS: Record<StoreId, "logo-google-playstore" | "logo-apple"> = {
  android: "logo-google-playstore",
  ios: "logo-apple",
};

type GetTheAppSectionProps = {
  /** Tighter spacing for the user-menu popover. */
  compact?: boolean;
  /** Overridable in tests only; the app always uses the deployment config. */
  playStoreUrl?: string;
  appStoreUrl?: string;
};

export function GetTheAppSection({
  compact = false,
  playStoreUrl = appEnv.playStoreUrl,
  appStoreUrl = appEnv.appStoreUrl,
}: GetTheAppSectionProps) {
  const { t } = useTranslation("navigation");
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#fafafa" : "#0a0a0a";

  // Store referral is a web-only surface: advertising the Android app inside
  // the Android app (or iOS inside iOS) is noise.
  if (Platform.OS !== "web") return null;

  const stores: { id: StoreId; url: string }[] = [
    { id: "android", url: playStoreUrl },
    { id: "ios", url: appStoreUrl },
  ];

  return (
    <View>
      <Text className="px-2 pb-1 text-xs font-medium text-muted-foreground">
        {t("getTheApp.title")}
      </Text>
      <View className={compact ? "gap-1" : "gap-2"}>
        {stores.map(({ id, url }) =>
          url ? (
            <Button
              key={id}
              accessibilityLabel={t(`getTheApp.${id}Accessibility`)}
              variant="outline"
              size="sm"
              className="justify-start"
              onPress={() => openExternalUrl(url)}
            >
              <Ionicons name={STORE_ICONS[id]} size={16} color={iconColor} />
              <Text>{t(`getTheApp.${id}`)}</Text>
            </Button>
          ) : (
            <View
              key={id}
              className="h-9 flex-row items-center gap-2 rounded-md px-3 opacity-60 sm:h-8"
            >
              <Ionicons name={STORE_ICONS[id]} size={16} color={iconColor} />
              <Text className="text-sm text-muted-foreground">{t(`getTheApp.${id}`)}</Text>
              <View className="ml-auto rounded-full bg-muted px-2 py-0.5">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("getTheApp.comingSoon")}
                </Text>
              </View>
            </View>
          ),
        )}
      </View>
    </View>
  );
}
