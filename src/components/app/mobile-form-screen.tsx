import { Platform, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MobileFormScreenProps extends PropsWithChildren {
  contentClassName?: string;
  footer?: ReactNode;
}

export function MobileFormScreen({ children, contentClassName, footer }: MobileFormScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName={cn("grow p-6", contentClassName)}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? <View className="border-t border-border bg-background p-4">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
