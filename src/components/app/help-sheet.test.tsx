import { fireEvent, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { HelpSheet } from "./help-sheet";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

// Marker Modal: the stock jest Modal cannot distinguish "returned null" (the
// web unmount gate, #1054) from "mounted but closed" (native). See the
// helper's docs.
jest.mock("react-native", () => require("@/test/modal-marker-mock").reactNativeWithModalMarker());

afterEach(() => setPlatformOS("ios"));

describe("HelpSheet", () => {
  it("renders the title and all three sections for a key", () => {
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={jest.fn()} />);
    expect(screen.getByText("Core beliefs")).toBeTruthy();
    expect(screen.getByLabelText("Core beliefs")).toBeTruthy();
    expect(
      screen.getByText("Deep, long-held rules about yourself, others, or the world."),
    ).toBeTruthy();
    expect(screen.getByText("What it is")).toBeTruthy();
    expect(screen.getByText("How it works")).toBeTruthy();
    expect(screen.getByText("Why it helps")).toBeTruthy();
  });

  it("renders content inside a centered max-width container", () => {
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={jest.fn()} />);
    expect(screen.getByTestId("help-sheet-content")).toBeTruthy();
  });

  // Exactly one close affordance (M5, #1257): the wrapper's pinned Escape.
  // The in-scroll X this sheet used to carry — the affordance the whole
  // escape effort was named after, since it scrolled away on the first
  // swipe — is gone, and only the pinned row closes the sheet.
  it("renders the pinned Escape as the only close control, and it dismisses", () => {
    const onDismiss = jest.fn();
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={onDismiss} />);
    const closes = screen.getAllByLabelText("Close");
    expect(closes).toHaveLength(1);
    expect(closes[0].props.testID).toBe("modal-escape");
    fireEvent.press(closes[0]);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("keeps the title inside the scroll body, off the escape row (M5)", () => {
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={jest.fn()} />);
    const scroller = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroller).getByText("Core beliefs")).toBeTruthy();
    expect(within(scroller).queryByTestId("modal-escape")).toBeNull();
  });

  // The #1054 web unmount gate, behaviorally: a dismissed react-native-web
  // Modal lingers for its 250ms fade-out as a non-inert focus trap, so on web
  // a closed sheet must leave NO Modal in the tree at all.
  it("leaves no Modal mounted when closed on web (#1054)", () => {
    setPlatformOS("web");
    renderWithProviders(<HelpSheet helpKey="beliefs" visible={false} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId("modal-root")).toBeNull();
  });

  it("keeps the Modal mounted when closed on native, preserving the exit animation", () => {
    renderWithProviders(<HelpSheet helpKey="beliefs" visible={false} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId("modal-root")).not.toBeNull();
    // Mounted is not showing: the closed sheet renders no content on native.
    expect(screen.queryByText("Core beliefs")).toBeNull();
  });
});
