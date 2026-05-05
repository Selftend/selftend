import { router, usePathname } from "expo-router";
import {
  BookHeartIcon,
  BookOpenIcon,
  BrainIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HistoryIcon,
  HomeIcon,
  LifeBuoyIcon,
  SmilePlusIcon,
  SettingsIcon,
  ShapesIcon,
  WindIcon,
} from "lucide-react-native";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface NavItemDef {
  labelKey: string;
  href: string;
  icon: typeof HomeIcon;
  matchPrefix: string | null;
  activeWhen?: (pathname: string) => boolean;
}

const MAIN_NAV_ITEMS: NavItemDef[] = [
  { labelKey: "sidebar.home", href: "/(app)/(tabs)/", icon: HomeIcon, matchPrefix: null },
  { labelKey: "sidebar.settings", href: "/(app)/(tabs)/settings", icon: SettingsIcon, matchPrefix: "/settings" },
  { labelKey: "sidebar.support", href: "/(app)/support", icon: LifeBuoyIcon, matchPrefix: "/support" },
];

const CBT_NAV_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.cbtOverview",
    href: "/cbt",
    icon: BrainIcon,
    matchPrefix: "/cbt",
    activeWhen: (pathname: string) =>
      pathname === "/cbt" ||
      (pathname.startsWith("/cbt/") &&
        !pathname.startsWith("/cbt/learn") &&
        !pathname.startsWith("/cbt/history")),
  },
  { labelKey: "sidebar.cbtHistory", href: "/cbt/history", icon: HistoryIcon, matchPrefix: "/cbt/history" },
  { labelKey: "sidebar.cbtLearn", href: "/cbt/learn", icon: BookOpenIcon, matchPrefix: "/cbt/learn" },
];

const TOOL_PLACEHOLDER_NAV_ITEMS: NavItemDef[] = [
  { labelKey: "sidebar.moodTracker", href: "/tools/mood-tracker", icon: SmilePlusIcon, matchPrefix: "/tools/mood-tracker" },
  { labelKey: "sidebar.meditation", href: "/tools/meditation", icon: WindIcon, matchPrefix: "/tools/meditation" },
  { labelKey: "sidebar.act", href: "/tools/act", icon: ShapesIcon, matchPrefix: "/tools/act" },
  { labelKey: "sidebar.gratitudeLog", href: "/tools/gratitude-log", icon: BookHeartIcon, matchPrefix: "/tools/gratitude-log" },
];

interface SidebarNavProps {
  includeTopInset?: boolean;
  onSelect?: () => void;
}

export function SidebarNav({ includeTopInset = false, onSelect }: SidebarNavProps) {
  const { t } = useTranslation("navigation");
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const toolsActive = pathname.startsWith("/cbt") || pathname.startsWith("/tools");
  const cbtActive = pathname.startsWith("/cbt");
  const [toolsOpen, setToolsOpen] = React.useState(toolsActive);
  const [cbtOpen, setCbtOpen] = React.useState(cbtActive);

  React.useEffect(() => {
    if (toolsActive) {
      setToolsOpen(true);
    }
    if (cbtActive) {
      setCbtOpen(true);
    }
  }, [cbtActive, toolsActive]);

  function isActive(item: NavItemDef) {
    if (item.activeWhen) {
      return item.activeWhen(pathname);
    }

    const { matchPrefix } = item;
    if (matchPrefix) {
      return pathname.startsWith(matchPrefix);
    }
    return pathname === "/" || pathname === "/(app)/(tabs)/";
  }

  function getLevelPadding(level: number) {
    return level === 0 ? "px-3" : level === 1 ? "pl-8 pr-3" : "pl-12 pr-3";
  }

  function renderNavItem(item: NavItemDef, level = 0) {
    const active = isActive(item);
    const label = t(item.labelKey);
    return (
      <Pressable
        key={item.href}
        onPress={() => {
          router.push(item.href as Parameters<typeof router.push>[0]);
          onSelect?.();
        }}
        className={cn(
          "flex-row items-center gap-3 rounded-md py-2.5",
          getLevelPadding(level),
          active ? "bg-primary/10" : "active:bg-muted/50"
        )}
      >
        <Icon
          as={item.icon}
          className={cn("size-5", active ? "text-primary" : "text-muted-foreground")}
        />
        <Text className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderSubmenuTrigger({
    active,
    icon,
    label,
    level,
    onPress,
    open,
  }: {
    active: boolean;
    icon: typeof ShapesIcon;
    label: string;
    level: number;
    onPress: () => void;
    open: boolean;
  }) {
    const highlighted = active && !open;
    return (
      <Pressable
        accessibilityLabel={open ? t("sidebar.collapse", { label }) : t("sidebar.expand", { label })}
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        className={cn(
          "flex-row items-center gap-3 rounded-md py-2.5",
          getLevelPadding(level),
          highlighted ? "bg-primary/10" : "active:bg-muted/50"
        )}
      >
        <Icon
          as={icon}
          className={cn("size-5", highlighted ? "text-primary" : "text-muted-foreground")}
        />
        <Text className={cn("flex-1 text-sm font-medium", highlighted ? "text-primary" : "text-foreground")}>
          {label}
        </Text>
        <Icon
          as={open ? ChevronDownIcon : ChevronRightIcon}
          className={cn("size-4", highlighted ? "text-primary" : "text-muted-foreground")}
        />
      </Pressable>
    );
  }

  return (
    <View
      className="w-60 bg-card border-r border-border"
      style={{
        paddingTop: includeTopInset ? insets.top : 0,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView contentContainerClassName="px-3 py-4 gap-1">
        {renderNavItem(MAIN_NAV_ITEMS[0])}

        <View className="gap-1 py-1">
          {renderSubmenuTrigger({
            active: toolsActive,
            icon: ShapesIcon,
            label: t("sidebar.tools"),
            level: 0,
            onPress: () => setToolsOpen((open) => !open),
            open: toolsOpen,
          })}
          {toolsOpen ? (
            <View className="gap-1">
              {renderSubmenuTrigger({
                active: cbtActive,
                icon: BrainIcon,
                label: "CBT",
                level: 1,
                onPress: () => setCbtOpen((open) => !open),
                open: cbtOpen,
              })}
              {cbtOpen ? CBT_NAV_ITEMS.map((item) => renderNavItem(item, 2)) : null}
              {TOOL_PLACEHOLDER_NAV_ITEMS.map((item) => renderNavItem(item, 1))}
            </View>
          ) : null}
        </View>

        {MAIN_NAV_ITEMS.slice(1).map((item) => renderNavItem(item))}
      </ScrollView>
    </View>
  );
}
