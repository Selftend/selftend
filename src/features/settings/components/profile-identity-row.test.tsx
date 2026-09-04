import { render, screen } from "@testing-library/react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { ProfileIdentityRow } from "@/src/features/settings/components/profile-identity-row";
import { STYLE_NAMES, THEME_TOKENS } from "@/src/lib/theme/styles";
import { useStyleStore } from "@/src/stores/style-store";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

// The avatar circle behind the initial. It used to be two hand-written violet
// literals - `hsla(262, 62%, 56%, 0.18)` and `hsla(280, 48%, 60%, 0.20)`, the
// DEFAULT palette's accent copied out of PRIMARY_TRIPLES by hand - so the circle
// stayed violet on every other palette while the initial inside it
// (`text-primary`) followed the style. The two read as one element, which is
// what made the mismatch obvious enough to report.
//
// A copied literal is invisible to every gate the theme work added: it is not a
// class name, not a CSS variable, and not an argument to a known helper. Only a
// rendered assertion catches it, which is why this file exists.
describe("ProfileIdentityRow avatar wash", () => {
  const props = {
    avatarUri: undefined,
    hasAvatar: false,
    name: "Tester",
    showEmail: true,
    email: "tester@example.com",
    initial: "T",
  };

  const washOf = (root: ReactTestInstance): string[] | undefined =>
    root.findAll((node) => node.props?.testID === "profile-avatar-wash")[0]?.props?.colors;

  it.each(STYLE_NAMES)("pours %s's own accent", (style) => {
    useStyleStore.setState({ style, hydrated: true });
    const view = render(<ProfileIdentityRow {...props} />);

    // Scheme-agnostic: only that the wash carries THIS palette's accent hue.
    const degrees = (["light", "dark"] as const).map(
      (scheme) => THEME_TOKENS[style][scheme]["--primary"].split(" ")[0],
    );

    for (const stop of washOf(view.UNSAFE_root) ?? []) {
      expect(degrees.some((d) => stop.startsWith(`hsla(${d},`))).toBe(true);
    }
    view.unmount();
  });

  // Discrimination: without this, a constant that merely happened to start with
  // the right number would satisfy the assertion above for one palette.
  it("pours a different wash for a different palette", () => {
    // Unmounted before the style changes - a store update with the row still
    // mounted is an un-acted React update.
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const first = render(<ProfileIdentityRow {...props} />);
    const lilac = washOf(first.UNSAFE_root);
    first.unmount();

    useStyleStore.setState({ style: "sage-garden", hydrated: true });
    const second = render(<ProfileIdentityRow {...props} />);
    const sage = washOf(second.UNSAFE_root);
    second.unmount();

    expect(sage).not.toEqual(lilac);
  });

  it("keeps the wash a wash, not a fill", () => {
    useStyleStore.setState({ style: "quiet-lilac", hydrated: true });
    const view = render(<ProfileIdentityRow {...props} />);

    // The initial sits on top of this; an opaque circle would bury it.
    for (const stop of washOf(view.UNSAFE_root) ?? []) {
      const alpha = Number(stop.replace(/.*,\s*([\d.]+)\)$/, "$1"));
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(0.5);
    }
    view.unmount();
  });
});

/**
 * What the circle and the two lines show, per identity state (#1829). The row is
 * pure props, so these are the four shapes `SettingsProfileBlock` can hand it.
 */
describe("ProfileIdentityRow contents", () => {
  const base = { avatarUri: undefined, hasAvatar: false };

  /**
   * ☠️ `includeHiddenElements` is required, not incidental. The circle is
   * `aria-hidden`, and RNTL drops hidden subtrees from EVERY query by default -
   * `*ByTestId` included - so the row being correctly hidden from assistive tech
   * is what puts its contents beyond an ordinary query.
   */
  const hidden = { includeHiddenElements: true };

  it("draws a person glyph when there is no letter to take", () => {
    render(<ProfileIdentityRow {...base} name="Guest" showEmail={false} email="" initial={null} />);

    expect(screen.getByTestId("profile-avatar-person", hidden)).toBeTruthy();
    expect(screen.getByText("Guest")).toBeTruthy();
  });

  it("draws the letter when there is one, and no glyph", () => {
    render(
      <ProfileIdentityRow {...base} name="Alex" showEmail email="alex@example.com" initial="A" />,
    );

    expect(screen.getByText("A", hidden)).toBeTruthy();
    expect(screen.queryByTestId("profile-avatar-person", hidden)).toBeNull();
    expect(screen.getByText("alex@example.com")).toBeTruthy();
  });

  it("omits the email sub-line when it is not asked for", () => {
    render(
      <ProfileIdentityRow
        {...base}
        name="person@example.com"
        showEmail={false}
        email="person@example.com"
        initial="P"
      />,
    );

    // Once, in the name slot - not twice.
    expect(screen.getAllByText("person@example.com")).toHaveLength(1);
  });

  /**
   * ☠️ react-native-web implements neither `accessibilityElementsHidden` nor
   * `importantForAccessibility`, so `aria-hidden` is the only one of the three
   * that hides this circle on web. Without it the glyph or letter is announced
   * ahead of the name that says the same thing one element over.
   */
  it("hides the decorative circle from assistive tech on web too", () => {
    const view = render(
      <ProfileIdentityRow {...base} name="Guest" showEmail={false} email="" initial={null} />,
    );

    // ☠️ Identified by `importantForAccessibility="no"`, which is the CIRCLE's
    // alone - `Icon` sets its own `aria-hidden` plus `"no-hide-descendants"`, so
    // a bare "some node is aria-hidden" search finds the glyph and passes with
    // the circle wide open. (Confirmed by mutation: that version survived
    // deleting the prop under test.)
    const circle = view.UNSAFE_root.findAll(
      (node) => typeof node.type === "string" && node.props?.importantForAccessibility === "no",
    );

    expect(circle).toHaveLength(1);
    expect(circle[0].props["aria-hidden"]).toBe(true);
    // The name itself must NOT be hidden - only the circle restating it.
    expect(screen.getByText("Guest")).toBeTruthy();
  });
});
