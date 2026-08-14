import { Link, usePathname, type Href } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { currentStateProps, DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { CHROME_ACCENT_MARK } from "@/src/lib/theme/chrome";

// No nav row carries a status chip (#1020). The field was a three-value union -
// LIVE, SOON, BETA - and all three came off at once, which left the rendering
// branch with nothing to render, so it went too rather than sitting here as a
// corpse waiting for a fourth value.
//
// SOON was the load-bearing one. It sat on DBT, over a screen headed "On the
// roadmap", inside a binary Apple had cited under Guideline 2.1 *App
// Completeness* - a nav entry advertising a module the app does not have. BETA
// went with it: CBT and ACT are both fully usable, so the word understated them
// and handed the same reviewer a second thing to doubt.
interface NavItemDef {
  labelKey: string;
  href: Href;
  icon: MaterialIconName;
  matchPrefix: string | null;
  activeWhen?: (pathname: string) => boolean;
  a11yKey?: string;
}

const TODAY_ITEM: NavItemDef = {
  labelKey: "sidebar.home",
  href: "/(app)",
  icon: "home",
  matchPrefix: null,
};

const PROGRESS_ITEM: NavItemDef = {
  labelKey: "sidebar.progress",
  href: "/(app)/progress",
  icon: "insights",
  matchPrefix: "/progress",
};

// Routines lives with the Home & Insights pair (spec #37, "Navigation
// placement") - not a fourth module pillar and not another tools entry.
const ROUTINES_ITEM: NavItemDef = {
  labelKey: "sidebar.routines",
  href: "/(app)/routines",
  icon: "checklist",
  matchPrefix: "/routines",
};

const MODULE_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.cbt",
    href: "/modules/cbt",
    icon: "psychology",
    matchPrefix: "/modules/cbt",
    activeWhen: (pathname) => pathname === "/modules/cbt" || pathname.startsWith("/modules/cbt/"),
    a11yKey: "sidebar.cbtA11y",
  },
  {
    labelKey: "sidebar.act",
    href: "/modules/act",
    icon: "explore",
    matchPrefix: "/modules/act",
    a11yKey: "sidebar.actA11y",
  },
  {
    labelKey: "sidebar.dbt",
    href: "/modules/dbt",
    icon: "anchor",
    matchPrefix: "/modules/dbt",
    a11yKey: "sidebar.dbtA11y",
  },
];

const TOOL_ITEMS: NavItemDef[] = [
  {
    labelKey: "sidebar.moodTracker",
    href: "/tools/check-in",
    icon: "mood",
    matchPrefix: "/tools/check-in",
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
  {
    labelKey: "sidebar.habits",
    href: "/tools/habits",
    icon: "task-alt",
    matchPrefix: "/tools/habits",
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
    href: "/(app)/settings",
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
    return pathname === "/";
  }

  function renderNavItem(item: NavItemDef) {
    const active = isActive(item);
    const label = t(item.labelKey);
    const accessibilityLabel = item.a11yKey ? t(item.a11yKey) : label;

    return (
      // `dangerouslySingular` (#989): the panel is LATERAL navigation between peer
      // destinations, and expo-router's default NAVIGATE only reuses the route it is
      // already on - a target sitting deeper in the stack is pushed again. Going
      // Routines -> Home therefore left TWO mounted Home screens, so every query on it
      // ran twice. Singular moves the existing screen to the top instead, which also
      // keeps Back meaning "the screen I came from". The id substitutes dynamic segments
      // with their params, so it can never collapse two different `[id]` screens - and
      // no panel destination is dynamic anyway.
      <Link href={item.href} key={item.labelKey} dangerouslySingular asChild>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="link"
          {...currentStateProps(active, "page")}
          onPress={() => {
            onSelect?.();
          }}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          role="link"
          className={cn(
            "flex-row items-center gap-3 rounded-md px-3 py-2.5",
            active ? "bg-primary/10" : "active:bg-muted/50",
          )}
        >
          {/*
            One accent for every row (#587). The nav used to paint each row in
            its own module's hue — a green ACT row, a violet CBT row, a teal
            breathing row — which is the clearest "distinguishes items in a set"
            case in the app and the one the ruling names outright. What the
            colour here has to carry is WHICH ROW IS ACTIVE, and that is one bit,
            not eleven; it is the app accent's job.

            The three channels stay as they were, because they were never about
            the hue: the chip fill, this glyph and the ink label all move
            together, alongside `aria-current="page"`, so colour is not the only
            signal that a row is selected.
          */}
          <Icon
            key={active ? "icon-active" : "icon-inactive"}
            name={item.icon}
            className={cn("size-6", active ? CHROME_ACCENT_MARK : "text-muted-foreground")}
          />
          {/*
            Primary ink, not the raw accent (#403/#421): the label is 14px text
            and an active row paints `bg-primary/10` behind it, where the
            published `--primary` reads 4.41:1 light and 4.22:1 dark. The icon
            above keeps the accent — it is decorative, duplicated by this label.
          */}
          <Text
            className={cn(
              "flex-1 text-sm font-medium",
              active ? "text-primary-ink" : "text-foreground",
            )}
          >
            {label}
          </Text>
          {/*
            The status chip stood here (#587 gave LIVE the neutral pill, #421 §3
            gave BETA `primary`'s ink on `bg-primary/15`). #1020 took the last
            value off the last row, so the branch is gone with it. The contrast
            work it prompted is not wasted and is not orphaned - `--primary-ink`
            is still certified by test/theme-token-sync.ts, and `bg-primary/15`
            is still painted by the habit editor and four routines surfaces.
          */}
        </Pressable>
      </Link>
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
      <Link href={href} key={`group-${label}`} dangerouslySingular asChild>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="link"
          {...currentStateProps(active, "page")}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => {
            onSelect?.();
          }}
          role="link"
        >
          <Text className={className}>{label}</Text>
        </Pressable>
      </Link>
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
          {renderNavItem(PROGRESS_ITEM)}
          {renderNavItem(ROUTINES_ITEM)}

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
