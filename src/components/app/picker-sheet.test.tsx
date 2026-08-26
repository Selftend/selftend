import { fireEvent, screen, within } from "@testing-library/react-native";
import { Modal, Pressable, ScrollView, Text } from "react-native";

import { PickerSheet } from "./picker-sheet";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal renders null whenever `visible` is false,
// which makes "the component returned null" (the #1054 web unmount gate)
// indistinguishable from "a mounted Modal rendered nothing" (native). Without
// it the gate assertion below passes whether or not the gate exists.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

afterEach(() => {
  setPlatformOS("ios");
  jest.clearAllMocks();
});

/**
 * A stand-in picker: shows the live draft and can edit it, exactly the two
 * things a real picker child does. The sheet owns the draft, so this probe
 * proves the draft cycle without any calendar in the tree.
 */
function renderSheet(overrides: Partial<React.ComponentProps<typeof PickerSheet<string>>> = {}) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    initialDraft: "seed",
    ...overrides,
  };
  const result = renderWithProviders(
    <PickerSheet<string> {...props}>
      {(draft, setDraft) => (
        <Pressable testID="probe-edit" onPress={() => setDraft("edited")}>
          <Text>{`draft:${draft}`}</Text>
        </Pressable>
      )}
    </PickerSheet>,
  );
  return { ...result, props };
}

describe("PickerSheet", () => {
  describe("the #1054 web unmount gate, inherited from PressShieldModal", () => {
    it("leaves no Modal mounted while closed on web", () => {
      setPlatformOS("web");
      renderSheet({ visible: false });

      expect(screen.queryByTestId("modal-root")).toBeNull();
    });

    it("keeps the closed Modal mounted on native, preserving the exit animation", () => {
      renderSheet({ visible: false });

      expect(screen.queryByTestId("modal-root")).not.toBeNull();
      expect(screen.queryByText("draft:seed")).toBeNull();
    });
  });

  describe("the draft cycle", () => {
    it("seeds the child with the initial draft and reflects edits live", () => {
      renderSheet();

      expect(screen.getByText("draft:seed")).toBeTruthy();
      fireEvent.press(screen.getByTestId("probe-edit"));
      expect(screen.getByText("draft:edited")).toBeTruthy();
    });

    it("commits the draft only on Done", () => {
      const { props } = renderSheet();

      fireEvent.press(screen.getByTestId("probe-edit"));
      // Editing is a draft move: nothing reaches the consumer until Done.
      expect(props.onConfirm).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Done"));

      expect(props.onConfirm).toHaveBeenCalledWith("edited");
      expect(props.onClose).toHaveBeenCalled();
    });

    it("discards the draft when the backdrop is tapped", () => {
      const { props } = renderSheet();

      fireEvent.press(screen.getByTestId("probe-edit"));
      fireEvent.press(screen.getByLabelText("Close"));

      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalled();
    });

    it("discards the draft when the modal is dismissed (Escape on web)", () => {
      const { props } = renderSheet();

      fireEvent.press(screen.getByTestId("probe-edit"));
      // react-native-web routes Escape to onRequestClose; native routes the
      // hardware back button to the same place.
      screen.UNSAFE_getByType(Modal).props.onRequestClose();

      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalled();
    });

    it("reseeds from the initial draft on reopen, so an abandoned edit cannot come back", () => {
      const { rerender } = renderSheet();

      fireEvent.press(screen.getByTestId("probe-edit"));
      expect(screen.getByText("draft:edited")).toBeTruthy();

      const child = (draft: string, setDraft: (next: string) => void) => (
        <Pressable testID="probe-edit" onPress={() => setDraft("edited")}>
          <Text>{`draft:${draft}`}</Text>
        </Pressable>
      );
      const shared = { onClose: jest.fn(), onConfirm: jest.fn(), initialDraft: "seed" };
      rerender(
        <PickerSheet<string> visible={false} {...shared}>
          {child}
        </PickerSheet>,
      );
      rerender(
        <PickerSheet<string> visible {...shared}>
          {child}
        </PickerSheet>,
      );

      expect(screen.getByText("draft:seed")).toBeTruthy();
    });
  });

  describe("the footer", () => {
    it("is a single full-width Done with no onClear", () => {
      renderSheet();

      expect(screen.getByText("Done")).toBeTruthy();
      expect(screen.queryByText("Clear")).toBeNull();
    });

    it("grows a quiet Clear beside Done when onClear is given", () => {
      const onClear = jest.fn();
      const { props } = renderSheet({ onClear });

      fireEvent.press(screen.getByTestId("probe-edit"));
      fireEvent.press(screen.getByText("Clear"));

      // Clear is a COMMIT, not a draft edit: it closes, and the abandoned
      // draft never reaches onConfirm.
      expect(onClear).toHaveBeenCalled();
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it("scrolls its card, so the footer stays reachable on a short viewport (#1231)", () => {
    renderSheet();

    // Card heights are width-invariant and already overflow a landscape phone;
    // without a scroll container the centered overflow splits top and bottom
    // and the clipped half is the footer — i.e. Done, the only way to commit.
    const scroller = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroller).getByText("Done")).toBeTruthy();
    expect(within(scroller).getByText("draft:seed")).toBeTruthy();
  });

  it("gutters the card at p-3, widening to p-6 only from the sm breakpoint (#1231)", () => {
    renderSheet();

    // ⚠️ The class STRING, not computed padding: jest does not run NativeWind's
    // css compiler, so no assertion here can see resolved pixels. What it pins
    // is the ruled gutter — `max-w-[340px]` only binds from a 388px viewport,
    // so below that it is this padding, not the cap, that sizes the card on
    // every phone. At the 360dp supported floor p-6 leaves a 38.1px day
    // target; p-3 lifts it to 41.5px.
    expect(screen.UNSAFE_getByType(ScrollView).props.contentContainerClassName).toContain(
      "p-3 sm:p-6",
    );
  });
});
