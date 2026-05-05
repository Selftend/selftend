import { router } from "expo-router";
import * as Linking from "expo-linking";
import { MenuIcon } from "lucide-react-native";
import { Image, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { UserMenu } from "@/components/user-menu";
import { appEnv } from "@/src/lib/env";
import { resolveThemePreference, useSystemColorScheme } from "@/src/lib/color-scheme";
import { useSession } from "@/src/providers/session-provider";
import { useThemeStore } from "@/src/stores/theme-store";

interface AppHeaderProps {
  showHamburger?: boolean;
  onMenuPress?: () => void;
}

export function AppHeader({ showHamburger, onMenuPress }: AppHeaderProps) {
  const { t } = useTranslation("navigation");
  const { session } = useSession();
  const isSignedIn = Boolean(session);

  return (
    <SafeAreaView edges={["top"]} className="bg-card border-b border-border">
      <View className="flex-row items-center gap-2 px-2 h-14">
        {showHamburger ? (
          <Button
            accessibilityLabel={t("header.openNav")}
            variant="ghost"
            size="icon"
            onPress={onMenuPress}
          >
            <Icon as={MenuIcon} className="size-5 text-foreground" />
          </Button>
        ) : null}
        <Pressable
          className="min-w-0 flex-1 flex-row items-center gap-2 px-2"
          onPress={() => router.push(isSignedIn ? "/(app)/(tabs)" : "/")}
          accessibilityRole="button"
          accessibilityLabel={t("header.goHome")}
        >
          <Image
            source={require("../assets/icon.png")}
            resizeMode="contain"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          />
          <Text className="shrink text-lg font-semibold text-foreground" numberOfLines={1}>
            {t("header.appName")}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <GitHubButton />
          <LanguageToggle />
          <ThemeToggle />
          {isSignedIn ? <UserMenu /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function GitHubButton() {
  const { t } = useTranslation("navigation");
  const preference = useThemeStore((state) => state.preference);
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = resolveThemePreference(preference, systemColorScheme);
  const openGitHub = () => {
    if (Platform.OS === "web") {
      globalThis.window?.open(appEnv.githubRepoUrl, "_blank", "noopener,noreferrer");
      return;
    }

    void Linking.openURL(appEnv.githubRepoUrl);
  };

  return (
    <Button
      accessibilityLabel={t("header.openGithub")}
      className="size-9 rounded-full"
      onPress={openGitHub}
      size="icon"
      variant="ghost"
    >
      <Ionicons
        color={colorScheme === "dark" ? "#fafafa" : "#0a0a0a"}
        name="logo-github"
        size={20}
      />
    </Button>
  );
}
