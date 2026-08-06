import { Link } from "expo-router";

// Per-family subpath, not the "@expo/vector-icons" barrel (which bundles all 15 families).
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { UserMenu } from "@/src/components/app/user-menu";
import { DESKTOP_BREAKPOINT } from "@/src/constants/layout";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { useSession } from "@/src/providers/session-provider";
import { useColorSchemeName } from "@/src/lib/color-scheme";

// Signed-out surfaces only (#667): the signed-in chrome is the InvisibleHeader,
// so the hamburger (and the home-navigation tour target with it) lives there.
// Full retirement of this bar, including signed-out, is #669.
export function AppHeader() {
  const { t } = useTranslation("navigation");
  const { session } = useSession();
  const { width } = useWindowDimensions();
  // Community links live in the header only on desktop. On mobile the header
  // is cramped, so the Discord link moves into the account dropdown's social
  // row instead (#92).
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isSignedIn = Boolean(session);
  const iconColor = useColorSchemeName() === "dark" ? "#fafafa" : "#0a0a0a";

  return (
    <SafeAreaView edges={["top"]} className="bg-card border-b border-border">
      <View className="flex-row items-center gap-2 px-2 h-14">
        {/* The flex-1 spacer is a plain View so the pressable hit area stays
            the logo + wordmark, not the whole strip up to the right icons. */}
        <View className="min-w-0 flex-1 flex-row items-center">
          <Link href={isSignedIn ? "/(app)" : "/"} asChild>
            <Pressable
              className="min-w-0 shrink flex-row items-center gap-2 px-2"
              accessibilityRole="link"
              accessibilityLabel={t("header.goHome")}
              role="link"
            >
              <Image
                accessible={false}
                source={require("../../../assets/icon.png")}
                resizeMode="contain"
                style={{ width: 28, height: 28, borderRadius: 6 }}
              />
              <Text className="shrink text-lg font-semibold text-foreground" numberOfLines={1}>
                {t("header.appName")}
              </Text>
            </Pressable>
          </Link>
        </View>
        {isDesktop && appEnv.discordUrl ? (
          <Button
            accessibilityLabel={t("header.joinDiscord")}
            variant="ghost"
            size="icon"
            onPress={() => openExternalUrl(appEnv.discordUrl)}
          >
            <Ionicons name="logo-discord" size={22} color={iconColor} />
          </Button>
        ) : null}
        {isDesktop ? (
          <Button
            accessibilityLabel={t("header.viewGithub")}
            variant="ghost"
            size="icon"
            onPress={() => openExternalUrl(appEnv.githubRepoUrl)}
          >
            <Ionicons name="logo-github" size={22} color={iconColor} />
          </Button>
        ) : null}
        <UserMenu />
      </View>
    </SafeAreaView>
  );
}
