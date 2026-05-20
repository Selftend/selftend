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
import { useToastStore, type ToastTone } from "@/src/stores/toast-store";

const toneClasses: Record<ToastTone, string> = {
  error: "border-destructive",
  info: "border-border",
  success: "border-primary",
};

export function AppToast() {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) {
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
      className="absolute inset-x-0 z-[80] items-center px-4"
      style={{ pointerEvents: "box-none", top: insets.top + 12 }}
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
      >
        <Card className={cn("gap-0 py-4 shadow-md", toneClasses[toast.tone])}>
          <CardHeader className="gap-1 px-4">
            <CardTitle>{toast.title}</CardTitle>
            {toast.description ? <CardDescription>{toast.description}</CardDescription> : null}
          </CardHeader>
        </Card>
      </Pressable>
    </View>
  );
}
