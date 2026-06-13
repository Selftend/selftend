import { router } from "expo-router";
import * as Linking from "expo-linking";
import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import * as React from "react";
import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProfileAvatar } from "@/src/components/app/profile-avatar";
import { SocialConnections } from "@/src/components/app/social-connections";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/react-native-reusables/popover";
import { Text } from "@/src/components/react-native-reusables/text";
import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useUserProfile } from "@/src/features/profile/queries";
import { supportedLanguages } from "@/src/i18n";
import { appEnv } from "@/src/lib/env";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useLanguage } from "@/src/providers/i18n-provider";
import { useSession } from "@/src/providers/session-provider";
import { useThemeStore, type ThemePreference } from "@/src/stores/theme-store";
import type { TriggerRef } from "@rn-primitives/popover";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const THEME_ICONS: Record<ThemePreference, MaterialIconName> = {
  system: "desktop-windows",
  light: "light-mode",
  dark: "dark-mode",
};

export function UserMenu() {
  const { t } = useTranslation("navigation");
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const { session, user } = useSession();
  const isSignedIn = Boolean(session);
  const { data: profile } = useUserProfile(user);
  const { language, setLanguage } = useLanguage();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const email = user?.email;
  const avatarUrl = profile?.avatarUrl ?? null;

  function openGitHub() {
    popoverTriggerRef.current?.close();
    if (Platform.OS === "web") {
      globalThis.window?.open(appEnv.githubRepoUrl, "_blank", "noopener,noreferrer");
      return;
    }
    void Linking.openURL(appEnv.githubRepoUrl);
  }

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    // Deregister this device's push channel BEFORE sign-out (while RLS context is still
    // valid), so server-driven reminders stop firing for a device the user has left.
    await cancelAllReminders(user?.id ?? null);
    await signOut();
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button
          accessibilityLabel={t("userMenu.openMenu")}
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
        >
          {isSignedIn ? (
            <ProfileAvatar avatarUrl={avatarUrl} email={email} />
          ) : (
            <Icon name="more-vert" className="size-6 text-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-0">
        <View className="gap-3 p-3">
          {isSignedIn ? (
            <View className="flex-row items-center gap-3">
              <ProfileAvatar avatarUrl={avatarUrl} email={email} className="size-10" />
              <View className="flex-1">
                <Text
                  className="text-sm text-muted-foreground font-normal leading-4"
                  numberOfLines={1}
                >
                  {email ?? t("userMenu.account")}
                </Text>
              </View>
            </View>
          ) : null}

          <View>
            <Text className="text-xs font-medium text-muted-foreground px-2 pb-1">
              {t("languageToggle.toggle")}
            </Text>
            {supportedLanguages.map((code) => (
              <Pressable
                accessibilityLabel={t(`languageToggle.${code}`)}
                accessibilityRole="button"
                accessibilityState={{ selected: language === code }}
                key={code}
                className="flex-row items-center gap-3 rounded-sm px-2 py-2 active:bg-accent"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => void setLanguage(code)}
                role="button"
              >
                <View className="size-4 items-center justify-center">
                  {language === code ? (
                    <Icon name="check" className="size-4 text-foreground" />
                  ) : null}
                </View>
                <Text className="text-sm">{t(`languageToggle.${code}`)}</Text>
              </Pressable>
            ))}
          </View>

          <View>
            <Text className="text-xs font-medium text-muted-foreground px-2 pb-1">
              {t("themeToggle.toggle")}
            </Text>
            {THEME_OPTIONS.map((value) => (
              <Pressable
                accessibilityLabel={t(`themeToggle.${value}`)}
                accessibilityRole="button"
                accessibilityState={{ selected: preference === value }}
                key={value}
                className="flex-row items-center gap-3 rounded-sm px-2 py-2 active:bg-accent"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setPreference(value)}
                role="button"
              >
                <View className="size-4 items-center justify-center">
                  {preference === value ? (
                    <Icon name="check" className="size-4 text-foreground" />
                  ) : null}
                </View>
                <Icon name={THEME_ICONS[value]} className="size-4 text-foreground" />
                <Text className="text-sm">{t(`themeToggle.${value}`)}</Text>
              </Pressable>
            ))}
          </View>

          <SocialConnections
            connections={[
              {
                id: "github",
                icon: "logo-github",
                onPress: openGitHub,
              },
              {
                id: "discord",
                icon: "logo-discord",
              },
            ]}
          />

          {isSignedIn ? (
            <View className="flex-row flex-wrap gap-3 py-0.5">
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  popoverTriggerRef.current?.close();
                  router.push("/(app)/settings");
                }}
              >
                <Icon name="settings" className="size-4" />
                <Text>{t("userMenu.settings")}</Text>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onPress={onSignOut}>
                <Icon name="logout" className="size-4" />
                <Text>{t("userMenu.signOut")}</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </PopoverContent>
    </Popover>
  );
}
