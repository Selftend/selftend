import { fireEvent, screen } from "@testing-library/react-native";

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

  // Two "Close" controls, deliberately and temporarily (#1252): the wrapper's
  // pinned Escape, plus the in-scroll X this sheet has always carried. That X
  // is the affordance the whole escape effort was named after — it lives
  // inside the ScrollView and scrolls away on the first swipe — and removing
  // it (along with moving the title down into the body) is W19/#1257. Until
  // then both must work, so both are pressed here rather than the assertion
  // being loosened to whichever one comes first.
  it("calls onDismiss from the pinned Escape", () => {
    const onDismiss = jest.fn();
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={onDismiss} />);
    fireEvent.press(screen.getByTestId("modal-escape"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("calls onDismiss from the in-scroll close control", () => {
    const onDismiss = jest.fn();
    renderWithProviders(<HelpSheet helpKey="beliefs" visible onDismiss={onDismiss} />);
    const inScroll = screen
      .getAllByLabelText("Close")
      .filter((node) => node.props.testID !== "modal-escape");
    expect(inScroll).toHaveLength(1);
    fireEvent.press(inScroll[0]);
    expect(onDismiss).toHaveBeenCalled();
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
