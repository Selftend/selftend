import { fireEvent, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateUserPreferences: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

describe("SoundsSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  // W20/#1257: the X is this sheet's ONE Escape (the sheet declines the
  // wrapper's pinned row via surface="sheet"), and it sits in its own header
  // row OUTSIDE the scroller, so it can no longer scroll away with the lanes.
  it("pins a single Close outside the scroller that dismisses the sheet", () => {
    const onDismiss = jest.fn();
    renderWithProviders(<SoundsSheet visible onDismiss={onDismiss} />);
    const closes = screen.getAllByLabelText("Close");
    expect(closes).toHaveLength(1);
    const scroller = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroller).queryByLabelText("Close")).toBeNull();
    fireEvent.press(closes[0]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders both lane pickers", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    expect(screen.getByLabelText("Choose a breath sound")).toBeTruthy();
    expect(screen.getByLabelText("Choose an ambient sound")).toBeTruthy();
  });

  it("opens the breath picker and selects a sound, writing prefs", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    fireEvent.press(screen.getByLabelText("Choose a breath sound"));
    fireEvent.press(screen.getByText("Ocean swell"));
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].breathSoundId).toBe("ocean-swell");
  });

  it("exposes the open picker as radios in a labelled radiogroup", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    fireEvent.press(screen.getByLabelText("Choose a breath sound"));
    // byRole skips plain Views (not accessibility elements), so assert the
    // container's group semantics through its label instead.
    expect(screen.getByLabelText("Breath").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(1);
    // Default selection is the "guided" breath sound.
    expect(screen.getByRole("radio", { name: "Guided voice" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Ocean swell" })).not.toBeChecked();
  });
});
