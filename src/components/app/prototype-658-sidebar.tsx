/**
 * PROTOTYPE #658 — THROWAWAY. Do not ship, do not extend, do not test.
 *
 * Three structurally different takes on the ChatGPT-style desktop sidebar,
 * judged inside the real signed-in shell with the old top header hidden:
 *
 *   A — "Full rail":    collapsed rail shows EVERY nav entry as an icon
 *                       (dividers between groups). Expanded by default.
 *   B — "Primary rail": collapsed rail shows only Home/Progress/Routines plus
 *                       Modules & Tools hub icons; individual modules/tools
 *                       appear only when expanded. Collapsed by default.
 *   C — "No rail":      no persistent sidebar at all; a floating hamburger
 *                       (top-left) opens the full panel as an overlay.
 *
 * Desktop web + __DEV__ only. Switch with the floating pill (bottom center)
 * or `?variant=A|B|C|off`; the choice persists in localStorage so it survives
 * in-app navigation.
 */
import { Link, router } from "expo-router";
import type { ReactNode } from "react";
import { Image, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { SidebarNav } from "@/src/components/app/sidebar-nav";
import { UserMenu } from "@/src/components/app/user-menu";

type Variant = "A" | "B" | "C" | "off";

const STORAGE_KEY = "prototype-658-variant";
const VARIANTS: Variant[] = ["A", "B", "C", "off"];
const VARIANT_NAMES: Record<Variant, string> = {
  A: "Full rail",
  B: "Primary rail",
  C: "No rail (overlay)",
  off: "Prototype off",
};

function initialVariant(): Variant {
  // jest-expo defines window without location/localStorage — treat any
  // partial environment as "off".
  try {
    if (typeof window === "undefined" || !window.location || !window.localStorage) return "off";
    const fromUrl = new URLSearchParams(window.location.search).get("variant");
    if (fromUrl && (VARIANTS as string[]).includes(fromUrl)) return fromUrl as Variant;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (VARIANTS as string[]).includes(stored)) return stored as Variant;
    return "A";
  } catch {
    return "off";
  }
}

interface Proto658State {
  variant: Variant;
  expanded: boolean;
  overlayOpen: boolean;
  setVariant: (v: Variant) => void;
  toggleExpanded: () => void;
  setOverlayOpen: (open: boolean) => void;
}

const useProto658Store = create<Proto658State>((set) => ({
  variant: initialVariant(),
  // Per-variant default state: A opens expanded, B opens as the rail.
  expanded: initialVariant() === "A",
  overlayOpen: false,
  setVariant: (v) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // storage unavailable — variant just won't persist
    }
    set({ variant: v, expanded: v === "A", overlayOpen: false });
  },
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
}));

export function useProto658Active(): boolean {
  const variant = useProto658Store((s) => s.variant);
  return __DEV__ && Platform.OS === "web" && variant !== "off";
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

interface RailItem {
  icon: MaterialIconName;
  labelKey: string;
  href: string;
}

const PRIMARY_ITEMS: RailItem[] = [
  { icon: "home", labelKey: "sidebar.home", href: "/(app)" },
  { icon: "insights", labelKey: "sidebar.progress", href: "/(app)/progress" },
  { icon: "checklist", labelKey: "sidebar.routines", href: "/(app)/routines" },
];

const MODULE_RAIL_ITEMS: RailItem[] = [
  { icon: "psychology", labelKey: "sidebar.cbt", href: "/modules/cbt" },
  { icon: "explore", labelKey: "sidebar.act", href: "/modules/act" },
  { icon: "anchor", labelKey: "sidebar.dbt", href: "/modules/dbt" },
];

const TOOL_RAIL_ITEMS: RailItem[] = [
  { icon: "mood", labelKey: "sidebar.moodTracker", href: "/tools/mood-tracker" },
  { icon: "edit-note", labelKey: "sidebar.journal", href: "/tools/journal" },
  { icon: "air", labelKey: "sidebar.breathing", href: "/tools/breathing" },
  { icon: "anchor", labelKey: "sidebar.grounding", href: "/tools/grounding" },
  { icon: "favorite", labelKey: "sidebar.gratitudeLog", href: "/tools/gratitude-log" },
  { icon: "self-improvement", labelKey: "sidebar.meditation", href: "/tools/meditation" },
  { icon: "bedtime", labelKey: "sidebar.sleep", href: "/tools/sleep" },
  { icon: "task-alt", labelKey: "sidebar.habits", href: "/tools/habits" },
];

const HUB_ITEMS: RailItem[] = [
  { icon: "widgets", labelKey: "sidebar.modules", href: "/modules" },
  { icon: "handyman", labelKey: "sidebar.tools", href: "/tools" },
];

const ACCOUNT_RAIL_ITEMS: RailItem[] = [
  { icon: "notifications", labelKey: "sidebar.notifications", href: "/(app)/notifications" },
  { icon: "settings", labelKey: "sidebar.settings", href: "/(app)/settings" },
  { icon: "support", labelKey: "sidebar.support", href: "/(app)/support" },
];

function RailButton({ item }: { item: RailItem }) {
  const { t } = useTranslation("navigation");
  return (
    <Link href={item.href as never} asChild>
      <Pressable
        accessibilityLabel={t(item.labelKey)}
        accessibilityRole="link"
        role="link"
        className="items-center justify-center rounded-md p-2.5 active:bg-muted/50 web:hover:bg-muted/50"
      >
        <Icon name={item.icon} className="size-6 text-muted-foreground" />
      </Pressable>
    </Link>
  );
}

function RailDivider() {
  return <View className="mx-2 my-1.5 h-px bg-border" />;
}

function LogoHomeLink({ withWordmark }: { withWordmark: boolean }) {
  const { t } = useTranslation("navigation");
  return (
    <Link href="/(app)" asChild>
      <Pressable
        accessibilityLabel={t("header.goHome")}
        accessibilityRole="link"
        role="link"
        className="flex-row items-center gap-2 rounded-md p-1.5"
      >
        <Image
          accessible={false}
          source={require("../../../assets/icon.png")}
          resizeMode="contain"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        {withWordmark ? (
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {t("header.appName")}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

function CollapseToggle({ expanded }: { expanded: boolean }) {
  const toggleExpanded = useProto658Store((s) => s.toggleExpanded);
  return (
    <Pressable
      accessibilityLabel={expanded ? "Collapse sidebar" : "Expand sidebar"}
      accessibilityRole="button"
      role="button"
      onPress={toggleExpanded}
      className="items-center justify-center rounded-md p-2.5 active:bg-muted/50 web:hover:bg-muted/50"
    >
      <Icon
        name={expanded ? "chevron-left" : "chevron-right"}
        className="size-6 text-muted-foreground"
      />
    </Pressable>
  );
}

/** Expanded state shared by A and B: logo row + the real production panel. */
function ExpandedPanel() {
  return (
    <View className="border-r border-border bg-card">
      <View className="w-60 flex-row items-center justify-between px-3 pt-3">
        <LogoHomeLink withWordmark />
        <CollapseToggle expanded />
      </View>
      {/* The production panel keeps its own w-60/border; the doubled border is
          a prototype artifact, ignore it. */}
      <View className="flex-1 -mr-px">
        <SidebarNav />
      </View>
    </View>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <View className="w-14 flex-shrink-0 items-stretch border-r border-border bg-card">
      <View className="items-center pt-3 pb-1">
        <LogoHomeLink withWordmark={false} />
      </View>
      <ScrollView contentContainerClassName="grow items-stretch px-1.5 pb-2">
        <CollapseToggle expanded={false} />
        {children}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

function VariantA() {
  const expanded = useProto658Store((s) => s.expanded);
  if (expanded) return <ExpandedPanel />;
  return (
    <Rail>
      {PRIMARY_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
      <RailDivider />
      {MODULE_RAIL_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
      <RailDivider />
      {TOOL_RAIL_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
      <View className="grow" />
      <RailDivider />
      {ACCOUNT_RAIL_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
    </Rail>
  );
}

function VariantB() {
  const expanded = useProto658Store((s) => s.expanded);
  if (expanded) return <ExpandedPanel />;
  return (
    <Rail>
      {PRIMARY_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
      <RailDivider />
      {HUB_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
      <View className="grow" />
      <RailDivider />
      {ACCOUNT_RAIL_ITEMS.map((i) => (
        <RailButton key={i.labelKey} item={i} />
      ))}
    </Rail>
  );
}

function VariantC() {
  const overlayOpen = useProto658Store((s) => s.overlayOpen);
  const setOverlayOpen = useProto658Store((s) => s.setOverlayOpen);
  const { t } = useTranslation("navigation");

  if (!overlayOpen) return null;
  return (
    <View className="absolute inset-0 z-40 flex-row">
      <View className="border-r border-border bg-card">
        <View className="w-60 flex-row items-center justify-between px-3 pt-3">
          <LogoHomeLink withWordmark />
          <Pressable
            accessibilityLabel={t("header.closeNav")}
            accessibilityRole="button"
            role="button"
            onPress={() => setOverlayOpen(false)}
            className="items-center justify-center rounded-md p-2.5 active:bg-muted/50 web:hover:bg-muted/50"
          >
            <Icon name="close" className="size-6 text-muted-foreground" />
          </Pressable>
        </View>
        <View className="flex-1 -mr-px">
          <SidebarNav onSelect={() => setOverlayOpen(false)} />
        </View>
      </View>
      <Pressable
        accessibilityLabel={t("header.closeNav")}
        accessibilityRole="button"
        role="button"
        className="flex-1 bg-black/50"
        onPress={() => setOverlayOpen(false)}
      />
    </View>
  );
}

/** Floating hamburger for variant C (and nothing else). */
export function Proto658FloatingHamburger() {
  const active = useProto658Active();
  const variant = useProto658Store((s) => s.variant);
  const overlayOpen = useProto658Store((s) => s.overlayOpen);
  const setOverlayOpen = useProto658Store((s) => s.setOverlayOpen);
  const { t } = useTranslation("navigation");

  if (!active || variant !== "C" || overlayOpen) return null;
  return (
    <Pressable
      accessibilityLabel={t("header.openNav")}
      accessibilityRole="button"
      role="button"
      onPress={() => setOverlayOpen(true)}
      className="absolute left-4 top-4 z-30 rounded-full border border-border bg-card p-3 shadow-md web:hover:bg-muted/50"
    >
      <Icon name="menu" className="size-6 text-foreground" />
    </Pressable>
  );
}

/**
 * Floating profile button, top-right on every width — the UserMenu freed from
 * the header. The real cluster membership (Discord/Reddit/YouTube/GitHub) is
 * ticket #659; the prototype floats just the profile for now.
 */
export function Proto658FloatingProfile() {
  const active = useProto658Active();
  if (!active) return null;
  return (
    <View className="absolute right-4 top-4 z-30 rounded-full border border-border bg-card shadow-md">
      <UserMenu />
    </View>
  );
}

/**
 * Mobile pieces (all variants share one mobile treatment): no header, a
 * floating hamburger, and the panel showing logo + wordmark only while open.
 * Wired to AppShell's existing sidebar store via props, not the proto store.
 */
export function Proto658MobileHamburger({ onPress }: { onPress: () => void }) {
  const active = useProto658Active();
  const { t } = useTranslation("navigation");
  if (!active) return null;
  return (
    <Pressable
      accessibilityLabel={t("header.openNav")}
      accessibilityRole="button"
      role="button"
      onPress={onPress}
      className="absolute left-4 top-4 z-30 rounded-full border border-border bg-card p-3 shadow-md web:hover:bg-muted/50"
    >
      <Icon name="menu" className="size-6 text-foreground" />
    </Pressable>
  );
}

export function Proto658MobilePanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("navigation");
  return (
    <View className="absolute inset-0 z-50 flex-row">
      <View className="border-r border-border bg-card" style={{ paddingTop: insets.top }}>
        <View className="w-60 flex-row items-center justify-between px-3 pt-3">
          <LogoHomeLink withWordmark />
          <Pressable
            accessibilityLabel={t("header.closeNav")}
            accessibilityRole="button"
            role="button"
            onPress={onClose}
            className="items-center justify-center rounded-md p-2.5 active:bg-muted/50 web:hover:bg-muted/50"
          >
            <Icon name="close" className="size-6 text-muted-foreground" />
          </Pressable>
        </View>
        <View className="-mr-px flex-1">
          <SidebarNav onSelect={onClose} />
        </View>
      </View>
      <Pressable
        accessibilityLabel={t("header.closeNav")}
        accessibilityRole="button"
        role="button"
        className="flex-1 bg-black/50"
        onPress={onClose}
      />
    </View>
  );
}

/** The sidebar slot: what ProtectedLayout renders instead of <SidebarNav /> on desktop. */
export function Proto658Sidebar() {
  const variant = useProto658Store((s) => s.variant);
  if (variant === "A") return <VariantA />;
  if (variant === "B") return <VariantB />;
  return <VariantC />;
}

/** Dev-only floating switcher pill, bottom center. */
export function Proto658Switcher() {
  const variant = useProto658Store((s) => s.variant);
  const setVariant = useProto658Store((s) => s.setVariant);
  if (!__DEV__ || Platform.OS !== "web") return null;

  const index = VARIANTS.indexOf(variant);
  const cycle = (delta: number) => {
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    setVariant(next);
    // Keep the URL shareable/reload-stable without triggering navigation.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", next);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-4 z-50 items-center">
      <View className="flex-row items-center gap-1 rounded-full border border-border bg-foreground px-2 py-1 shadow-lg">
        <Pressable
          accessibilityLabel="Previous variant"
          accessibilityRole="button"
          role="button"
          onPress={() => cycle(-1)}
          className="rounded-full p-1.5"
        >
          <Icon name="chevron-left" className="size-5 text-background" />
        </Pressable>
        <Pressable
          accessibilityLabel="Go home to compare"
          accessibilityRole="button"
          role="button"
          onPress={() => router.replace("/(app)" as never)}
        >
          <Text className="min-w-44 text-center text-sm font-semibold text-background">
            {variant} — {VARIANT_NAMES[variant]}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Next variant"
          accessibilityRole="button"
          role="button"
          onPress={() => cycle(1)}
          className="rounded-full p-1.5"
        >
          <Icon name="chevron-right" className="size-5 text-background" />
        </Pressable>
      </View>
    </View>
  );
}
