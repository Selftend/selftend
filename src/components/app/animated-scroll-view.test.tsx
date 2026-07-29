import { render } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { AnimatedScrollView } from "./animated-scroll-view";

// The exact failure mode of #501: reanimated's Animated.ScrollView is not a
// NativeWind-registered component, so an unregistered binding silently DROPS
// contentContainerClassName - no error, no style, no padding. Jest does not
// run NativeWind's css compiler (the remapped style arrives as an opaque
// interop object, not resolved padding values), so what this pins is the
// remap WIRING: the class prop must be consumed and land in the style slot.
// Unregistered, contentContainerStyle is undefined and the className prop
// forwards untouched - both assertions below fail, instead of the gap
// resurfacing in a review screenshot.
describe("AnimatedScrollView", () => {
  it("remaps contentContainerClassName into the contentContainerStyle slot", () => {
    const { UNSAFE_getByType } = render(
      <AnimatedScrollView contentContainerClassName="grow p-4" />,
    );

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.contentContainerStyle).toBeTruthy();
    expect(scrollView.props.contentContainerClassName).toBeUndefined();
  });
});
