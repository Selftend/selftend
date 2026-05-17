import { router, usePathname } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface NavItemDef {
  labelKey: string;
  href: string;
  icon: MaterialIconName;
  matchPrefix: string | null;
  activeWhen?: (pathname: string) => boolean;
  badgeKey?: "badgeLive" | "badgeSoon";
}

const TODAY_ITEM: NavItemDef = {
  labelKey: "sidebar.home",
  href: "/(app)/(tabs)/",
  icon: "home",
  matchPrefix: null,
};

const MY_PLAN_ITEM: NavItemDef = {
  labelKey: "sidebar.myPlan",
  href: "/(app)/plan",
  icon: "checklist",
  matchPrefix: "/plan",
  activeWhen: (pathname) => pathname === "/plan" || pathname.startsWith("/plan/"),
};

const MODULE_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.cbt",
    href: "/modules/cbt",
    icon: "psychology",
    matchPrefix: "/modules/cbt",
    badgeKey: "badgeLive",
    activeWhen: (pathname) => pathname === "/modules/cbt" || pathname.startsWith("/modules/cbt/"),
  },
  {
    labelKey: "sidebar.act",
    href: "/modules/act",
    icon: "explore",
    matchPrefix: "/modules/act",
    badgeKey: "badgeSoon",
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
  },
  {
    labelKey: "sidebar.journal",
    href: "/tools/journal",
    icon: "edit-note",
    matchPrefix: "/tools/journal",
  },
  {
    labelKey: "sidebar.breathing",
    href: "/tools/breathing",
    icon: "air",
    matchPrefix: "/tools/breathing",
  },
  {
    labelKey: "sidebar.mindfulness",
    href: "/tools/mindfulness",
    icon: "self-improvement",
    matchPrefix: "/tools/mindfulness",
  },
  {
    labelKey: "sidebar.timer",
    href: "/tools/timer",
    icon: "timer",
    matchPrefix: "/tools/timer",
  },
  {
    labelKey: "sidebar.grounding",
    href: "/tools/grounding",
    icon: "anchor",
    matchPrefix: "/tools/grounding",
  },
  {
    labelKey: "sidebar.gratitudeLog",
    href: "/tools/gratitude-log",
    icon: "favorite",
    matchPrefix: "/tools/gratitude-log",
  },
  {
    labelKey: "sidebar.meditation",
    href: "/tools/meditation",
    icon: "self-improvement",
    matchPrefix: "/tools/meditation",
  },
  {
    labelKey: "sidebar.sleep",
    href: "/tools/sleep",
    icon: "bedtime",
    matchPrefix: "/tools/sleep",
  },
];

const ACCOUNT_ITEMS: NavItemDef[] = [
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

    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        key={item.href}
        onPress={() => {
          router.push(item.href as Parameters<typeof router.push>[0]);
          onSelect?.();
        }}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        role="button"
        className={cn(
          "flex-row items-center gap-3 rounded-md px-3 py-2.5",
          active ? "bg-primary/10" : "active:bg-muted/50",
        )}
      >
        <Icon
          name={item.icon}
          className={cn("size-6", active ? "text-primary" : "text-muted-foreground")}
        />
        <Text
          className={cn("flex-1 text-sm font-medium", active ? "text-primary" : "text-foreground")}
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

  function renderGroupLabel(label: string, href?: string) {
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
          router.push(href as Parameters<typeof router.push>[0]);
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
          {renderNavItem(MY_PLAN_ITEM)}

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
