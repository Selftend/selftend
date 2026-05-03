import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, useWindowDimensions, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { useSidebarStore } from "@/src/stores/sidebar-store";

const DESKTOP_BREAKPOINT = 768;

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const { isOpen, toggle, close } = useSidebarStore();

  return (
    <View className="flex-1 bg-background">
      <AppHeader showHamburger={!isDesktop} onMenuPress={toggle} />

      <View className="flex-1 flex-row">
        {isDesktop && <SidebarNav />}

        <View className="flex-1">
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: isDesktop ? { display: "none" } : undefined,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Home",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons color={color} name="home-outline" size={size} />
                ),
              }}
            />
            <Tabs.Screen
              name="history"
              options={{
                title: "History",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons color={color} name="albums-outline" size={size} />
                ),
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: "Settings",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons color={color} name="settings-outline" size={size} />
                ),
              }}
            />
          </Tabs>
        </View>
      </View>

      {/* Mobile sidebar overlay */}
      {!isDesktop && isOpen && (
        <View className="absolute inset-0 z-50 flex-row">
          <SidebarNav onSelect={close} />
          <Pressable
            className="flex-1 bg-black/50"
            onPress={close}
            accessibilityLabel="Close menu"
          />
        </View>
      )}
    </View>
  );
}
