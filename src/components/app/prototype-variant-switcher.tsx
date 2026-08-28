import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * PROTOTYPE ONLY - throwaway (#1515). Do not merge to `dev`.
 *
 * Floating bar for flipping between `?variant=` shapes. Hidden in production
 * builds so a stray merge cannot ship it, and it is deliberately loud so it
 * never reads as part of the design being judged.
 */
export function PrototypeVariantSwitcher({
  variants,
  current,
  names,
}: {
  variants: string[];
  current: string;
  names: Record<string, string>;
}) {
  const index = Math.max(0, variants.indexOf(current));

  const go = (delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    router.setParams({ variant: next });
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <View
      className="absolute bottom-6 self-center flex-row items-center gap-3 rounded-full bg-foreground px-3 py-2"
      style={{ left: 0, right: 0, marginHorizontal: "auto" }}
    >
      <Pressable onPress={() => go(-1)} className="p-1 active:opacity-60" role="button">
        <Icon name="chevron-left" className="size-5 text-background" />
      </Pressable>
      <Text className="text-xs font-semibold text-background">
        {`${current} - ${names[current] ?? ""}`}
      </Text>
      <Pressable onPress={() => go(1)} className="p-1 active:opacity-60" role="button">
        <Icon name="chevron-right" className="size-5 text-background" />
      </Pressable>
    </View>
  );
}

/** Reads `?variant=`, defaulting to the first shape. */
export function useVariant(variants: string[]) {
  const params = useLocalSearchParams<{ variant?: string }>();
  const raw = Array.isArray(params.variant) ? params.variant[0] : params.variant;
  return raw && variants.includes(raw) ? raw : variants[0];
}
