import { NativeOnlyAnimatedView } from "@/src/components/react-native-reusables/native-only-animated-view";
import { TextClassContext } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import * as PopoverPrimitive from "@rn-primitives/popover";
import * as React from "react";
import { Platform, StyleSheet } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portalHost,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
}) {
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut}>
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  "bg-popover border-border outline-none z-50 w-72 rounded-md border p-4 shadow-md dark:shadow-none shadow-black/5",
                  // ☠️ `Platform.OS === "web"`, NOT `Platform.select({ web })` -
                  // RN bakes `select` per platform at build time, so it never
                  // consults `Platform.OS` and is unobservable in jest
                  // (app-toast.tsx's own reduce-motion class carries the same
                  // note). `cursor-auto` stays unconditional on reduce motion:
                  // it is a pointer affordance, not part of the entrance
                  // motion this gates.
                  Platform.OS === "web" &&
                    cn(
                      "cursor-auto",
                      !reduceMotionEnabled &&
                        cn(
                          "animate-in fade-in-0 zoom-in-95 origin-[var(--radix-popover-content-transform-origin)]",
                          props.side === "bottom" && "slide-in-from-top-2",
                          props.side === "top" && "slide-in-from-bottom-2",
                        ),
                    ),
                  className,
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
export type { TriggerRef } from "@rn-primitives/popover";
