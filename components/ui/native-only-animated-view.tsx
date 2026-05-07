import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { Platform } from "react-native";
import Animated from "react-native-reanimated";

/**
 * This component is used to wrap animated views that should only be animated on native.
 * @param props - The props for the animated view.
 * @returns The animated view if the platform is native, otherwise the children.
 * @example
 * <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
 *   <Text>I am only animated on native</Text>
 * </NativeOnlyAnimatedView>
 */
function NativeOnlyAnimatedView(props: React.ComponentPropsWithoutRef<typeof Animated.View>) {
  const reduceMotionEnabled = useReduceMotionEnabled();

  if (Platform.OS === "web") {
    return <>{props.children as React.ReactNode}</>;
  }

  if (reduceMotionEnabled) {
    return <Animated.View {...props} entering={undefined} exiting={undefined} layout={undefined} />;
  }

  return <Animated.View {...props} />;
}

export { NativeOnlyAnimatedView };
