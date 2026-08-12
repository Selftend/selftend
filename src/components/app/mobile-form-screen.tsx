import { KeyboardAvoidingView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";

interface MobileFormScreenProps extends PropsWithChildren {
  contentClassName?: string;
  footer?: ReactNode;
  /**
   * Full-bleed chrome rendered inside the scroll view but OUTSIDE the padded
   * content column, so it spans the whole screen width even though
   * `contentClassName` caps the form at `FORM_COLUMN`. That full bleed is the
   * point for `ScreenTopBar`: its bottom hairline has to reach both edges.
   * Without it the layout is unchanged.
   */
  topBar?: ReactNode;
}

export function MobileFormScreen({
  children,
  contentClassName,
  footer,
  topBar,
}: MobileFormScreenProps) {
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
        <KeyboardAwareScrollView
          contentContainerClassName={topBar ? "grow" : cn("grow p-6", contentClassName)}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {topBar ? (
            <>
              {topBar}
              <View className={cn("grow p-6", contentClassName)}>{children}</View>
            </>
          ) : (
            children
          )}
        </KeyboardAwareScrollView>
        {footer ? <View className="border-t border-border bg-background p-4">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
