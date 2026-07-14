// PROTOTYPE ONLY - throwaway UI switcher, never ship to production.
// A floating bottom-centre bar for flipping between radically different UI
// variants rendered on a single route, gated by a `?variant=` search param.
// Hidden outside dev builds so a stray prototype merge can't reach users.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface PrototypeSwitcherProps {
  /** Ordered variant keys, e.g. ["A", "B", "C"]. */
  variants: string[];
  /** Human labels keyed by variant, e.g. { A: "Bottom card" }. */
  labels?: Record<string, string>;
}

export function useVariant(variants: string[]): string {
  const params = useLocalSearchParams<{ variant?: string }>();
  const raw = Array.isArray(params.variant) ? params.variant[0] : params.variant;
  return raw && variants.includes(raw) ? raw : variants[0];
}

export function PrototypeSwitcher({ variants, labels }: PrototypeSwitcherProps) {
  const insets = useSafeAreaInsets();
  const current = useVariant(variants);
  const index = Math.max(0, variants.indexOf(current));

  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    router.setParams({ variant: next });
  };

  // Web-only keyboard cycling. Ignore arrows while typing in a field.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Never render in production builds.
  if (typeof __DEV__ !== "undefined" && !__DEV__) return null;

  const label = labels?.[current];

  return (
    <View
      className="absolute inset-x-0 z-[100] items-center"
      style={{ pointerEvents: "box-none", bottom: insets.bottom + 12 }}
    >
      <View className="flex-row items-center gap-1 rounded-full border border-border bg-foreground px-1.5 py-1.5 shadow-lg shadow-black/30">
        <Pressable
          onPress={() => go(-1)}
          hitSlop={8}
          className="size-8 items-center justify-center rounded-full active:bg-background/20"
          accessibilityLabel="Previous variant"
        >
          <Icon name="chevron-left" className="size-5 text-background" />
        </Pressable>
        <View className="min-w-[132px] flex-row items-center justify-center gap-1.5 px-2">
          <Text className="text-xs font-bold text-background">{current}</Text>
          {label ? <Text className="text-xs text-background/70">— {label}</Text> : null}
        </View>
        <Pressable
          onPress={() => go(1)}
          hitSlop={8}
          className="size-8 items-center justify-center rounded-full active:bg-background/20"
          accessibilityLabel="Next variant"
        >
          <Icon name="chevron-right" className="size-5 text-background" />
        </Pressable>
      </View>
    </View>
  );
}
