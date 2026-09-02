import { fireEvent, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";

import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUpdate = jest.fn().mockResolvedValue(undefined);
// The `user_preferences` row the (mocked) database returns, or `null` for no row.
// ⚠️ Read through the REAL repository and query hook, so a test that puts a stored id
// here exercises the mapper that resolves it (#1745) - the sheet never sees this raw.
// With no row the query is left disabled, which is the pre-#1745 `data: undefined`.
let mockStoredRow: Record<string, unknown> | null = null;

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: mockStoredRow, error: null }) }),
      }),
    }),
  }),
}));
jest.mock("@/src/features/settings/queries", () => {
  const actual = jest.requireActual<typeof import("@/src/features/settings/queries")>(
    "@/src/features/settings/queries",
  );
  return {
    // Called unconditionally (hooks rule); a null user id disables the query.
    useUserPreferences: () => actual.useUserPreferences(mockStoredRow ? "user-1" : null),
    useUpdateUserPreferences: () => ({ mutateAsync: mockUpdate, isPending: false }),
  };
});
jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => false,
}));

describe("SoundsSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredRow = null;
  });

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
    // "Ocean swell" until 2026-08-30, when the breath-texture lane was retired.
    // ⚠️ `none` and not `guided`: guided is the DEFAULT, so selecting it would assert
    // nothing changed, and its label also appears in the summary row above the picker.
    // By role, so it matches the radio rather than that summary.
    fireEvent.press(screen.getByRole("radio", { name: "None" }));
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].breathSoundId).toBe("none");
  });

  it("exposes the open picker as radios in a labelled radiogroup", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    fireEvent.press(screen.getByLabelText("Choose a breath sound"));
    // byRole skips plain Views (not accessibility elements), so assert the
    // container's group semantics through its label instead.
    expect(screen.getByLabelText("Breath").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(1);
    // Default selection is the "guided" breath sound.
    expect(screen.getByRole("radio", { name: "Guided voice (female)" })).toBeChecked();
    // "Ocean swell" until the texture lane was retired; `none` is the other option
    // the breath picker still offers, and it must read as unselected.
    expect(screen.getByRole("radio", { name: "None" })).not.toBeChecked();
    // ⚠️ The male voice must be REACHABLE, not merely defined. #1136 decided two
    // voices and the ship plan counted eight files, but the app offered four until
    // 2026-08-30 — the gap was invisible because nothing asserted the picker row.
    expect(screen.getByRole("radio", { name: "Guided voice (male)" })).not.toBeChecked();
  });

  it("shows None on the lane AND highlights the None row for a stored ambient id the catalog lacks", async () => {
    // ☠️ Before #1745 the ambient lane had no resolver at all: for an unknown stored
    // id the lane label fell back to "None" while the picker highlighted NO row, so
    // the sheet disagreed with itself. The sheet does not resolve on its own - the
    // repository does, once, when the row is read - so the row goes in RAW here and
    // travels the real path: mocked database -> repository mapper -> query -> sheet.
    // Were the mapper to pass `not-a-bed` through, the lane would still read "None"
    // (the `??` null-guard) but the radio below would not be checked.
    //
    // ⚠️ The breath column is deliberately NOT the default: the resolved ambient id
    // is `none`, which is also the default, so "None" on the lane cannot by itself
    // tell a loaded row from the pre-load defaults. The male voice can.
    mockStoredRow = {
      user_id: "user-1",
      breath_sound_id: "guided-male",
      ambient_sound_id: "not-a-bed",
    };
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    expect(await screen.findByText("Guided voice (male)")).toBeTruthy();
    // The lane's own summary reads "None" - counted BEFORE the picker opens, since
    // the picker adds a "None" row of its own.
    expect(screen.getAllByText("None")).toHaveLength(1);
    fireEvent.press(screen.getByLabelText("Choose an ambient sound"));
    // And the ambient picker highlights it as the selected row, not nothing.
    expect(screen.getByRole("radio", { name: "None" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Rain" })).not.toBeChecked();
  });
});
