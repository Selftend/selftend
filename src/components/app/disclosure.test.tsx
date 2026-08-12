import { fireEvent, screen } from "@testing-library/react-native";
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
