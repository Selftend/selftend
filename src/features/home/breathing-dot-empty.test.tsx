import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as mockView } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { BreathingDotEmpty } from "@/src/features/home/today-screen";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";
import { useStyleStore } from "@/src/stores/style-store";

// The dot's three rings are SVG `stroke`/`fill` props, so they cannot be a
// class and cannot be checked by any of the class or CSS-variable gates. They
// were `hsla(262, 62%, 56%, …)` literals - the default palette's accent copied
// by hand - and stayed violet on every other palette while the `+` glyph in the
// middle (`text-primary`) followed the style.
//
// test/no-static-accent-literals.test.ts catches the LITERAL spelling, but not a
// regression to a default-palette CONSTANT (`PRIMARY_TRIPLES`,
// `tintStripeColors("primary", …)`), which would look nothing like a literal and
// be exactly as wrong. Only rendering under each palette catches that, which is
// what the other two fixed surfaces already do.
//
// react-native-svg is mocked so the colour props survive into the tree; the real
// Circle renders to a native view that discards them.
jest.mock("react-native-svg", () => {
  const View = mockView;
  return {
    Svg: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Circle: (props: { stroke?: string; fill?: string }) => <View testID="dot-ring" {...props} />,
  };
});

const ringColoursOf = (root: ReactTestInstance): string[] =>
  root
    .findAll((node) => node.props?.testID === "dot-ring")
    .flatMap((node) => [node.props.stroke, node.props.fill])
    .filter((value): value is string => typeof value === "string" && value !== "none");

describe("BreathingDotEmpty rings", () => {
  it("draws rings at all, so the assertions below cannot pass vacuously", () => {
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const view = render(<BreathingDotEmpty />);

    expect(ringColoursOf(view.UNSAFE_root).length).toBeGreaterThanOrEqual(3);
    view.unmount();
  });

  it.each(STYLE_NAMES)("draws %s's own accent", (style) => {
    useStyleStore.setState({ style, hydrated: true });
    const view = render(<BreathingDotEmpty />);

    // Scheme-agnostic: only that the rings carry THIS palette's accent hue.
    const degrees = (["light", "dark"] as const).map(
      (scheme) => THEME_TOKENS[style][scheme]["--primary"].split(" ")[0],
    );

    for (const colour of ringColoursOf(view.UNSAFE_root)) {
      expect(degrees.some((d) => colour.startsWith(`hsla(${d},`))).toBe(true);
    }
    view.unmount();
  });

  // The discrimination Codex asked for: a default-palette constant would satisfy
  // every other assertion here and fail this one.
  it("draws different rings for a different palette", () => {
    // Unmounted before the style changes - a store update with the dot still
    // mounted is an un-acted React update.
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const first = render(<BreathingDotEmpty />);
    const lilac = ringColoursOf(first.UNSAFE_root);
    first.unmount();

    useStyleStore.setState({ style: "amber-noir", hydrated: true });
    const second = render(<BreathingDotEmpty />);
    const amber = ringColoursOf(second.UNSAFE_root);
    second.unmount();

    expect(amber).not.toEqual(lilac);
  });

  it("keeps the rings faint, so the + glyph on top stays readable", () => {
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const view = render(<BreathingDotEmpty />);

    for (const colour of ringColoursOf(view.UNSAFE_root)) {
      const alpha = Number(colour.replace(/.*,\s*([\d.]+)\)$/, "$1"));
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(0.5);
    }
    view.unmount();
  });
});
