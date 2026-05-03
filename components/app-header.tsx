import { router } from "expo-router";
import { MenuIcon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { UserMenu } from "@/components/user-menu";

interface AppHeaderProps {
  showHamburger?: boolean;
  onMenuPress?: () => void;
}

export function AppHeader({ showHamburger, onMenuPress }: AppHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} className="bg-card border-b border-border">
      <View className="flex-row items-center px-2 h-14">
        <View className="flex-row items-center gap-1">
          {showHamburger ? (
            <Button variant="ghost" size="icon" onPress={onMenuPress}>
              <Icon as={MenuIcon} className="size-5 text-foreground" />
            </Button>
          ) : null}
          <Pressable
            className="flex-row items-center gap-2 px-2"
            onPress={() => router.push("/(app)/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
          >
            <Image
              source={require("../assets/icon.png")}
              resizeMode="contain"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
            <Text className="text-lg font-semibold text-foreground">Selftend</Text>
          </Pressable>
        </View>
        <View className="flex-1" />
        <UserMenu />
      </View>
    </SafeAreaView>
  );
}
