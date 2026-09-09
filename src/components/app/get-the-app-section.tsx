// Per-family subpath, not the "@expo/vector-icons" barrel (which bundles all 15 families).
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { useColorSchemeName } from "@/src/lib/color-scheme";

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
  const iconColor = useColorSchemeName() === "dark" ? "#fafafa" : "#0a0a0a";

  // Store referral is a web-only surface: advertising the Android app inside
  // the Android app (or iOS inside iOS) is noise.
  if (Platform.OS !== "web") return null;

  // An unconfigured store is absent, not "coming soon": both apps are published,
  // so the only build reaching an empty URL is a fork that opted out, and it is
  // never coming to a listing we could name. With neither store configured the
  // heading would sit over nothing, so the whole section goes.
  const stores: { id: StoreId; url: string }[] = [
    { id: "android", url: playStoreUrl },
    { id: "ios", url: appStoreUrl },
  ].filter((store): store is { id: StoreId; url: string } => Boolean(store.url));

  if (stores.length === 0) return null;

  return (
    <View>
      <Text className="px-2 pb-1 text-xs font-medium text-muted-foreground">
        {t("getTheApp.title")}
      </Text>
      <View className={compact ? "gap-1" : "gap-2"}>
        {stores.map(({ id, url }) => (
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
        ))}
      </View>
    </View>
  );
}
