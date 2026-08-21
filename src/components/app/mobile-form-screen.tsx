import { KeyboardAvoidingView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import { useWebKeyboardInset } from "@/src/lib/use-web-keyboard-inset";
import { INSET_LAYER, useInsetPublisher } from "@/src/stores/layered-inset-store";

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
  // The sticky footer is layer 1 of the bottom-inset ladder (#1339). It is
  // NOT suppressed on data-entry paths: form screens are where most toasts
  // fire, and that hand-maintained path list is exactly the drift this model
  // replaces. Because the footer is already lifted onto the keyboard, its
  // measured edge INCLUDES the keyboard - so the ladder's max needs no special
  // case for layer 0 here. That lift is also why keyboardInset is the revision:
  // on web onLayout is a ResizeObserver, and a footer that MOVES without
  // resizing would never re-publish its edge there.
  const { attachHost: attachFooter, onLayout: onFooterLayout } = useInsetPublisher(
    INSET_LAYER.strip,
    keyboardInset,
  );

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
        {footer ? (
          <View
            onLayout={onFooterLayout}
            ref={attachFooter}
            className="border-t border-border bg-background p-4"
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
