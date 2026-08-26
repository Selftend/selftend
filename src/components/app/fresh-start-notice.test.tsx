import { act, fireEvent, screen } from "@testing-library/react-native";

import { FreshStartNotice } from "./fresh-start-notice";
import { useFreshStartNoticeStore } from "@/src/stores/fresh-start-notice-store";
import { renderWithProviders } from "@/test/render-with-providers";

const TITLE = "We couldn't restore your previous session";

describe("FreshStartNotice (#1450)", () => {
  afterEach(() => {
    // The previous test's tree may still be mounted when this runs, so the
    // store write is a React update.
    act(() => useFreshStartNoticeStore.setState({ visible: false }));
  });

  it("renders nothing until a failed restore raises it", () => {
    renderWithProviders(<FreshStartNotice />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  // The copy's contract: calm, guilt-free, and GENERIC - the client cannot
  // tell cleanup from any other invalidation, so it never claims a reason.
  it("shows the generic fresh-start copy when raised", () => {
    useFreshStartNoticeStore.getState().showFreshStartNotice();

    renderWithProviders(<FreshStartNotice />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText("You're starting fresh.")).toBeTruthy();
  });

  it("dismiss ends it for good - once per event, never repeated", () => {
    useFreshStartNoticeStore.getState().showFreshStartNotice();

    renderWithProviders(<FreshStartNotice />);
    fireEvent.press(screen.getByLabelText("Dismiss"));

    expect(screen.queryByText(TITLE)).toBeNull();
    expect(useFreshStartNoticeStore.getState().visible).toBe(false);
  });
});
