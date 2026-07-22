import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";

interface MobileFormScreenProps extends PropsWithChildren {
  contentClassName?: string;
  footer?: ReactNode;
}

export function MobileFormScreen({ children, contentClassName, footer }: MobileFormScreenProps) {
  // KeyboardAvoidingView renders as a plain View on web; the visual-viewport
  // inset pads the footer/content above the on-screen keyboard there.
  const keyboardInset = useWebKeyboardInset();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={KEYBOARD_AVOIDING_BEHAVIOR}
        className="flex-1"
        style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
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
