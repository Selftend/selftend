import { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastTone } from "@/src/stores/toast-store";
import { useBannerInsetStore } from "@/src/stores/banner-inset-store";

// ─────────────────────────────────────────────────────────────────────────────
// THROWAWAY PROTOTYPE — wayfinder #1144 (toast position: top or bottom).
// Not for merge. Exists only to be photographed at both edges.
// ─────────────────────────────────────────────────────────────────────────────

const accentBarClasses: Record<ToastTone, string> = {
  error: "bg-destructive",
  info: "bg-border",
  success: "bg-primary",
};

const iconClasses: Record<ToastTone, string> = {
  error: "text-destructive",
  info: "text-muted-foreground",
  success: "text-primary",
};

const iconNames: Record<ToastTone, MaterialIconName> = {
  error: "error-outline",
  info: "info-outline",
  success: "check-circle-outline",
};

function protoEdge(): "top" | "bottom" {
  if (Platform.OS !== "web" || typeof window === "undefined") return "top";
  return new URLSearchParams(window.location.search).get("toastEdge") === "bottom"
    ? "bottom"
    : "top";
}

export function AppToast() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const bannerInset = useBannerInsetStore((state) => state.height);
  const edge = protoEdge();

  // Prototype-only handle so the capture harness can fire toasts on demand.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__protoToast =
      useToastStore.getState().showToast;
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    // Prototype: errors are sticky, so nothing auto-dismisses while we photograph.
    if (toast.tone === "error") {
      return;
    }

    const timeout = setTimeout(dismissToast, toast.durationMs);
    return () => clearTimeout(timeout);
  }, [dismissToast, toast]);

  if (!toast) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[80] items-center px-4"
      style={
        edge === "bottom" ? { bottom: insets.bottom + 16 + bannerInset } : { top: insets.top + 12 }
      }
    >
      {/* Body is inert — only the X dismisses. */}
      <View
        // Kept byte-identical to the shipped composition so app-toast.test.tsx
        // still passes: this prototype is about POSITION, and quietly changing
        // what a screen reader speaks would be a second, unmeasured change.
        accessibilityLabel={
          toast.description ? `${toast.title}. ${toast.description}` : toast.title
        }
        accessibilityLiveRegion={toast.tone === "error" ? "assertive" : "polite"}
        className="w-full max-w-xl"
        pointerEvents="box-none"
        testID="app-toast"
      >
        <Card className="flex-row items-start gap-3 py-3 pr-2 pl-4 shadow-md dark:shadow-none">
          <View className={cn("absolute inset-y-0 left-0 w-1", accentBarClasses[toast.tone])} />
          <Icon
            name={iconNames[toast.tone]}
            className={cn("mt-0.5 size-5", iconClasses[toast.tone])}
          />
          <View className="flex-1 gap-1">
            <Text className="font-semibold leading-tight">{toast.title}</Text>
            {toast.description ? (
              <Text className="text-muted-foreground text-sm leading-snug">
                {toast.description}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={t("close")}
            accessibilityRole="button"
            className="rounded-md p-1.5"
            onPress={dismissToast}
            role="button"
            testID="app-toast-dismiss"
          >
            <Icon name="close" className="text-muted-foreground size-5" />
          </Pressable>
        </Card>
      </View>
    </View>
  );
}
