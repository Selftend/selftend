import { router, usePathname } from "expo-router";
import {
  BrainIcon,
  HistoryIcon,
  HomeIcon,
  LifeBuoyIcon,
  SettingsIcon,
} from "lucide-react-native";
import * as React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/(app)/(tabs)/", icon: HomeIcon, matchPrefix: null },
  {
    label: "History",
    href: "/(app)/(tabs)/history",
    icon: HistoryIcon,
    matchPrefix: "/history",
  },
  {
    label: "CBT",
    href: "/(app)/cbt",
    icon: BrainIcon,
    matchPrefix: "/cbt",
  },
  {
    label: "Settings",
    href: "/(app)/(tabs)/settings",
    icon: SettingsIcon,
    matchPrefix: "/settings",
  },
  {
    label: "Support",
    href: "/(app)/support",
    icon: LifeBuoyIcon,
    matchPrefix: "/support",
  },
] as const;

interface SidebarNavProps {
  includeTopInset?: boolean;
  onSelect?: () => void;
}

export function SidebarNav({ includeTopInset = false, onSelect }: SidebarNavProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function isActive(href: string, matchPrefix: string | null) {
    if (matchPrefix) {
      return pathname.startsWith(matchPrefix);
    }
    return pathname === "/" || pathname === "/(app)/(tabs)/";
  }

  return (
    <View
      className="w-60 bg-card border-r border-border"
      style={{
        paddingTop: includeTopInset ? insets.top : 0,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="px-3 py-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.matchPrefix);
          return (
            <Pressable
              key={item.href}
              onPress={() => {
                router.push(item.href as Parameters<typeof router.push>[0]);
                onSelect?.();
              }}
              className={cn(
                "flex-row items-center gap-3 px-3 py-2.5 rounded-md",
                active ? "bg-primary/10" : "active:bg-muted/50"
              )}
            >
              <Icon
                as={item.icon}
                className={cn(
                  "size-5",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <Text
                className={cn(
                  "text-sm font-medium",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
