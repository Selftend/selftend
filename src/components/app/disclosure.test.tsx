import { fireEvent, screen, within } from "@testing-library/react-native";
import { useState } from "react";

import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import { Disclosure } from "@/src/components/app/disclosure";
import { renderWithProviders } from "@/test/render-with-providers";

function Harness({ label = "More options" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure
      testID="disclosure"
      label={label}
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <Input accessibilityLabel="Hidden field" />
      <Text>Folded content</Text>
    </Disclosure>
  );
}

describe("Disclosure", () => {
  it("unmounts its children while collapsed, rather than hiding them", () => {
    renderWithProviders(<Harness />);

    // A hidden-but-mounted subtree keeps its fields in the tab order and the
    // a11y tree - the usual way a disclosure becomes a trap.
    expect(screen.queryByText("Folded content")).toBeNull();
    expect(screen.queryByLabelText("Hidden field", { includeHiddenElements: true })).toBeNull();
  });

  it("reveals its children on press and folds them away again", () => {
    renderWithProviders(<Harness />);

    fireEvent.press(screen.getByTestId("disclosure"));
    expect(screen.getByText("Folded content")).toBeTruthy();
    expect(screen.getByLabelText("Hidden field")).toBeTruthy();

    fireEvent.press(screen.getByTestId("disclosure"));
    expect(screen.queryByText("Folded content")).toBeNull();
  });

  it("announces its expanded state to assistive technology", () => {
    renderWithProviders(<Harness />);

    // React Native folds `aria-expanded` into `accessibilityState`.
    const trigger = screen.getByTestId("disclosure");
    expect(trigger.props.accessibilityState.expanded).toBe(false);

    fireEvent.press(trigger);
    expect(screen.getByTestId("disclosure").props.accessibilityState.expanded).toBe(true);
  });

  it("does not add its own Space handler, which would toggle twice per press", () => {
    renderWithProviders(<Harness />);

    // React Native Web already activates `role="button"` on Space, on keyUP.
    // A keyDown handler beside it opens the section on the way down and closes
    // it on the way up, so a keyboard user sees nothing happen at all.
    expect(screen.getByTestId("disclosure").props.onKeyDown).toBeUndefined();
  });

  it("renders the label it is given, so callers can vary it with context", () => {
    renderWithProviders(<Harness label="More options for breaking this" />);

    expect(screen.getByText("More options for breaking this")).toBeTruthy();
  });
});

/**
 * The three additive props of #2143, which let the same component be an FAQ row.
 *
 * Every one of them defaults to today's behaviour, so the three shipped call
 * sites - `habit-editor-screen.tsx`, `habits-home-screen.tsx` and
 * `settings-profile-block.tsx` - are not edited and keep rendering what they
 * render now. That is the whole claim of the ticket, so each row-layout
 * assertion below is paired with the default case: an additive prop is only
 * additive if the absent case is pinned too.
 */
const ROW_LABEL = "Is Selftend free?";

function RowHarness({ headingLevel, id }: { headingLevel?: number; id?: string } = {}) {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure
      testID="disclosure"
      layout="row"
      headingLevel={headingLevel}
      id={id}
      label={ROW_LABEL}
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <Text>Folded content</Text>
    </Disclosure>
  );
}

/**
 * The trigger's parts in tree order, so "label left, chevron right" is asserted
 * as an ordering rather than inferred from a class name.
 *
 * Composites are walked, not just host nodes: `expand-more` lives on the `Icon`
 * composite and the host `Text` the icon set renders has already consumed it, so
 * a host-only walk finds no chevron at all.
 */
function triggerOrder(label: string): string[] {
  return (
    screen
      .getByTestId("disclosure")
      .findAll(() => true)
      .flatMap((node) => {
        if (node.props?.name === "expand-more" || node.props?.name === "expand-less") {
          return ["chevron"];
        }
        return node.props?.children === label ? ["label"] : [];
      })
      // A composite and the host it renders both carry the matched prop, so each
      // part shows up several times in a row. Collapsing runs leaves the ordering
      // - the thing under test - while a flipped order still turns this red.
      .filter((part, index, all) => part !== all[index - 1])
  );
}

describe("Disclosure as a full-width heading row (#2143)", () => {
  it("puts the label first and the chevron last in row layout", () => {
    renderWithProviders(<RowHarness />);

    expect(triggerOrder(ROW_LABEL)).toEqual(["label", "chevron"]);
  });

  it("keeps the leading chevron by default, so the form-section control is unmoved", () => {
    renderWithProviders(<Harness label={ROW_LABEL} />);

    expect(triggerOrder(ROW_LABEL)).toEqual(["chevron", "label"]);
  });

  it("fills its container in row layout, and stays self-start by default", () => {
    renderWithProviders(<RowHarness />);
    const row = String(screen.getByTestId("disclosure").props.className).split(/\s+/);
    expect(row).toContain("w-full");
    expect(row).toContain("justify-between");
    expect(row).not.toContain("self-start");

    screen.unmount();

    renderWithProviders(<Harness />);
    const inline = String(screen.getByTestId("disclosure").props.className).split(/\s+/);
    expect(inline).toContain("self-start");
    expect(inline).not.toContain("w-full");
  });

  it("still swaps expand-more for expand-less in row layout", () => {
    renderWithProviders(<RowHarness />);

    expect(screen.UNSAFE_queryAllByProps({ name: "expand-more" }).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ name: "expand-less" })).toHaveLength(0);

    fireEvent.press(screen.getByTestId("disclosure"));

    expect(screen.UNSAFE_queryAllByProps({ name: "expand-less" }).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ name: "expand-more" })).toHaveLength(0);
  });

  it("wraps the trigger in a heading at the level it is given, leaving role=button alone", () => {
    renderWithProviders(<RowHarness headingLevel={3} />);

    // The accordion pattern is a heading CONTAINING the button, never a button
    // that claims to be a heading: one node cannot carry both roles, and moving
    // `role="heading"` onto the Pressable would cost it its button semantics.
    //
    // ☠️ By props, not `getByRole("heading")`. RNTL's role queries filter on
    // `isAccessibilityElement`, which for a host View is false unless
    // `accessible` is set (`helpers/accessibility.js:88-101`) - and setting it
    // here would merge the whole subtree into one native a11y element, taking
    // the button's own focus and its expanded announcement with it. That is the
    // trade the wrapper accepts; see the component's docblock.
    const [heading] = screen.UNSAFE_getAllByProps({ role: "heading" });
    // `Number(...)`, because `Text`'s heading variants set `aria-level` as a
    // string while a level passed as a number stays one - the same precedent as
    // `policy-heading-outline.test.tsx`.
    expect(Number(heading.props["aria-level"])).toBe(3);

    const trigger = within(heading).getByTestId("disclosure");
    expect(trigger.props.accessibilityRole).toBe("button");
    expect(trigger.props.accessibilityState.expanded).toBe(false);
    expect(trigger.props["aria-controls"]).toBeTruthy();
  });

  it("stays out of the heading outline when no level is given", () => {
    renderWithProviders(<RowHarness />);

    // A form section's "More options" is a control, not a heading, and the three
    // shipped call sites must not appear in any page's outline.
    expect(screen.UNSAFE_queryAllByProps({ role: "heading" })).toHaveLength(0);
  });

  it("derives its content region from the id it is given, rather than a generated one", () => {
    renderWithProviders(<RowHarness id="faq-3" />);

    const trigger = screen.getByTestId("disclosure");
    expect(trigger.props["aria-controls"]).toBe("faq-3-content");

    fireEvent.press(trigger);
    // By `nativeID` rather than a `testID`: the content region carries no test
    // hook today, and adding one would change what the three untouched call
    // sites render.
    const [content] = screen.UNSAFE_getAllByProps({ nativeID: "faq-3-content" });
    expect(within(content).getByText("Folded content")).toBeTruthy();
  });

  it("generates a content id when none is given, and still points aria-controls at it", () => {
    renderWithProviders(<Harness />);

    const contentId = screen.getByTestId("disclosure").props["aria-controls"];
    expect(contentId).toBeTruthy();

    fireEvent.press(screen.getByTestId("disclosure"));
    const [content] = screen.UNSAFE_getAllByProps({ nativeID: contentId });
    expect(within(content).getByText("Folded content")).toBeTruthy();
  });

  it("keeps the content unmounted while collapsed in row layout too", () => {
    renderWithProviders(<RowHarness headingLevel={3} id="faq-3" />);

    expect(screen.queryByText("Folded content")).toBeNull();
  });

  it("adds no Space handler in row layout, which would toggle twice per press", () => {
    renderWithProviders(<RowHarness headingLevel={3} />);

    expect(screen.getByTestId("disclosure").props.onKeyDown).toBeUndefined();
  });
});
