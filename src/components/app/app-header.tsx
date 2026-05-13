import { router } from "expo-router";
import { MenuIcon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { UserMenu } from "@/src/components/app/user-menu";
import { useSession } from "@/src/providers/session-provider";

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
            accessible={false}
            source={require("../../../assets/icon.png")}
            resizeMode="contain"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          />
          <Text className="shrink text-lg font-semibold text-foreground" numberOfLines={1}>
            {t("header.appName")}
          </Text>
        </Pressable>
        <UserMenu />
      </View>
    </SafeAreaView>
  );
}
