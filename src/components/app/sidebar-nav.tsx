import { router, usePathname, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { toolAccent } from "@/src/features/home/tool-accent";

interface NavItemDef {
  labelKey: string;
  href: Href;
  icon: MaterialIconName;
  matchPrefix: string | null;
  activeWhen?: (pathname: string) => boolean;
  badgeKey?: "badgeLive" | "badgeSoon";
  accentKey?: string;
}

const TODAY_ITEM: NavItemDef = {
  labelKey: "sidebar.home",
  href: "/(app)/(tabs)",
  icon: "home",
  matchPrefix: null,
};

const MODULE_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.cbt",
    href: "/modules/cbt",
    icon: "psychology",
    matchPrefix: "/modules/cbt",
    activeWhen: (pathname) => pathname === "/modules/cbt" || pathname.startsWith("/modules/cbt/"),
    accentKey: "module-cbt",
  },
  {
    labelKey: "sidebar.act",
    href: "/modules/act",
    icon: "explore",
    matchPrefix: "/modules/act",
    accentKey: "module-act",
  },
  {
    labelKey: "sidebar.dbt",
    href: "/modules/dbt",
    icon: "anchor",
    matchPrefix: "/modules/dbt",
    badgeKey: "badgeSoon",
  },
];

const TOOL_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.moodTracker",
    href: "/tools/mood-tracker",
    icon: "mood",
    matchPrefix: "/tools/mood-tracker",
    accentKey: "mood",
  },
  {
    labelKey: "sidebar.journal",
    href: "/tools/journal",
    icon: "edit-note",
    matchPrefix: "/tools/journal",
    accentKey: "journal",
  },
  {
    labelKey: "sidebar.breathing",
    href: "/tools/breathing",
    icon: "air",
    matchPrefix: "/tools/breathing",
    accentKey: "breathing",
  },
  {
    labelKey: "sidebar.mindfulness",
    href: "/tools/mindfulness",
    icon: "self-improvement",
    matchPrefix: "/tools/mindfulness",
    accentKey: "mindfulness",
  },
  {
    labelKey: "sidebar.grounding",
    href: "/tools/grounding",
    icon: "anchor",
    matchPrefix: "/tools/grounding",
    accentKey: "grounding",
  },
  {
    labelKey: "sidebar.gratitudeLog",
    href: "/tools/gratitude-log",
    icon: "favorite",
    matchPrefix: "/tools/gratitude-log",
    accentKey: "gratitude",
  },
  {
    labelKey: "sidebar.meditation",
    href: "/tools/meditation",
    icon: "self-improvement",
    matchPrefix: "/tools/meditation",
    accentKey: "meditation",
  },
  {
    labelKey: "sidebar.sleep",
    href: "/tools/sleep",
    icon: "bedtime",
    matchPrefix: "/tools/sleep",
    accentKey: "sleep",
  },
  {
    labelKey: "sidebar.habits",
    href: "/tools/habits",
    icon: "task-alt",
    matchPrefix: "/tools/habits",
    accentKey: "habits",
  },
];

const ACCOUNT_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.notifications",
    href: "/(app)/notifications",
    icon: "notifications",
    matchPrefix: "/notifications",
  },
  {
    labelKey: "sidebar.settings",
    href: "/(app)/(tabs)/settings",
    icon: "settings",
    matchPrefix: "/settings",
  },
  {
    labelKey: "sidebar.support",
    href: "/(app)/support",
    icon: "support",
    matchPrefix: "/support",
  },
];

interface SidebarNavProps {
  includeTopInset?: boolean;
  onSelect?: () => void;
}

export function SidebarNav({ includeTopInset = false, onSelect }: SidebarNavProps) {
  const { t } = useTranslation("navigation");
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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

  function renderNavItem(item: NavItemDef) {
    const active = isActive(item);
    const label = t(item.labelKey);
    const badgeLabel = item.badgeKey ? t(`sidebar.${item.badgeKey}`) : null;
    const isLive = item.badgeKey === "badgeLive";
    const accent = toolAccent(item.accentKey ?? "");

    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        key={item.labelKey}
        onPress={() => {
          router.push(item.href);
          onSelect?.();
        }}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        role="button"
        className={cn(
          "flex-row items-center gap-3 rounded-md px-3 py-2.5",
          active ? accent.chip : "active:bg-muted/50",
        )}
      >
        <Icon
          name={item.icon}
          className={cn("size-6", active ? accent.icon : "text-muted-foreground")}
        />
        <Text
          className={cn("flex-1 text-sm font-medium", active ? accent.icon : "text-foreground")}
        >
          {label}
        </Text>
        {badgeLabel ? (
          <View className={cn("rounded-full px-2 py-0.5", isLive ? "bg-act/15" : "bg-muted")}>
            <Text
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isLive ? "text-act" : "text-muted-foreground",
              )}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  function renderGroupLabel(label: string, href?: Href) {
    const active = href ? pathname === href : false;
    const className = cn(
      "px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider",
      active ? "text-primary" : "text-muted-foreground",
    );

    if (!href) {
      return (
        <Text className={className} key={`group-${label}`}>
          {label}
        </Text>
      );
    }

    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        key={`group-${label}`}
        onPress={() => {
          router.push(href);
          onSelect?.();
        }}
        role="button"
      >
        <Text className={className}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View
      className="w-60 flex-shrink-0 border-r border-border bg-card"
      style={{
        paddingTop: includeTopInset ? insets.top : 0,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView contentContainerClassName="grow px-3 py-4">
        <View className="gap-1">
          {renderNavItem(TODAY_ITEM)}

          {renderGroupLabel(t("sidebar.modules"), "/modules")}
          {MODULE_ITEMS.map((item) => renderNavItem(item))}

          {renderGroupLabel(t("sidebar.tools"), "/tools")}
          {TOOL_ITEMS.map((item) => renderNavItem(item))}
        </View>

        <View className="grow" />

        <View className="gap-1 pt-3">
          <View className="mx-1 mb-2 h-px bg-border" />
          {ACCOUNT_ITEMS.map((item) => renderNavItem(item))}
        </View>
      </ScrollView>
    </View>
  );
}
