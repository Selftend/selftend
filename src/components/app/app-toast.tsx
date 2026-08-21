import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { cn } from "@/lib/utils";
import { SUCCESS_TOAST_MS, useToastStore, type ToastTone } from "@/src/stores/toast-store";

const toneClasses: Record<ToastTone, string> = {
  error: "border-destructive",
  success: "border-primary",
};

export function AppToast() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  // Through the hook, never `getState()`: an imperative store read in render is
  // the React Compiler purity trap. `getState()` stays correct for the imperative
  // WRITES outside React, like `query-client.ts`'s global save-failed toast.
  const toast = useToastStore((state) => state.visible);
  const dismissToast = useToastStore((state) => state.dismissToast);

  // The store is a pure state machine, so the dismiss timer lives here (#1336),
  // keyed on the visible toast's identity so a promoted queue entry gets its own
  // full 2500ms rather than inheriting what was left of its predecessor's.
  //
  // No timeout is EVER scheduled for an error: an error stays until the user
  // dismisses it. That is why the guard is `tone !== "success"` rather than a
  // null check - a new tone could not silently acquire a timer.
  useEffect(() => {
    if (toast?.tone !== "success") {
      return;
    }

    const timeout = setTimeout(dismissToast, SUCCESS_TOAST_MS);
    return () => clearTimeout(timeout);
    // Keyed on the id rather than on `toast` itself: identity is the store's to
    // change, but the id is the toast's own, so nothing short of a genuinely
    // different toast can restart the countdown.
  }, [dismissToast, toast?.id, toast?.tone]);

  if (!toast) {
    return null;
  }

  return (
    <View
      // box-none must be the prop, not style.pointerEvents: "box-none" is invalid CSS
      // and gets ignored when passed via NativeWind's style, leaving this overlay
      // interactive and able to swallow taps. The prop uses RNW's box-none polyfill.
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[80] items-center px-4"
      style={{ top: insets.top + 12 }}
    >
      <Pressable
        accessibilityHint={t("toast.dismissHint")}
        accessibilityLabel={
          toast.description ? `${toast.title}. ${toast.description}` : toast.title
        }
        accessibilityLiveRegion="polite"
        accessibilityRole="button"
        className="w-full max-w-xl"
        onPress={dismissToast}
        role="button"
        // Scoping handle for the specs that assert on toast CONTENT rather than on
        // the toast existing - `gdpr-export.e2e` moved onto it when the export's
        // permanent success line became a toast (#982). Without it a spec has to
        // match the copy anywhere on the page, which passes just as happily
        // against a stale permanent node.
        testID="app-toast"
      >
        <Card className={cn("gap-0 py-4 shadow-md dark:shadow-none", toneClasses[toast.tone])}>
          <CardHeader className="gap-1 px-4">
            <CardTitle>{toast.title}</CardTitle>
            {toast.description ? <CardDescription>{toast.description}</CardDescription> : null}
          </CardHeader>
        </Card>
      </Pressable>
    </View>
  );
}
