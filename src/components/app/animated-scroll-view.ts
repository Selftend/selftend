import Animated from "react-native-reanimated";
import { remapProps } from "nativewind";

// reanimated's Animated.ScrollView is not one of the core components NativeWind
// registers, so `contentContainerClassName` silently vanishes on it - every
// parallax-wired home rendered with NO content padding (#501), the same
// registration gap mood-history-list documents for SectionList. remapProps
// registers the mapping once; screens import THIS binding (not reanimated's)
// so a screen cannot compile against an unregistered copy.
remapProps(Animated.ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

export const AnimatedScrollView = Animated.ScrollView;
