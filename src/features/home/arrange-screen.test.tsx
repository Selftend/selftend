import { fireEvent, screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";

import ArrangeScreen from "./arrange-screen";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The preference rows as the TABLE holds them, unfiltered. `mockUnimplementedIds` is what
 * lets a test express the gap between the table and the screen - the gap undo's restore
 * index has to be measured against (#964).
 */
let mockWidgetIds: string[] = [];
let mockUnimplementedIds: string[] = [];
let mockIsLoading = false;
/** The query settled with no data: disabled, or errored. `isLoading` is false in both. */
let mockPreferencesUndefined = false;
/** A write is in flight - transient, and deliberately NOT the same thing as "cannot move". */
let mockMutationPending = false;
const mockAddWidget = jest.fn();
const mockRemoveWidget = jest.fn();
const mockRestoreWidget = jest.fn();
const mockReorderWidgets = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const mockBack = router.back as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockCanGoBack = router.canGoBack as jest.Mock;

/**
 * `Sortable.Grid` flattened to its rendered rows. The drag path is not testable under
 * jest, which is exactly why the handle carries a non-drag path - and it is the non-drag
 * path these tests drive.
 */
jest.mock("react-native-sortables", () => {
  const { Fragment } = require("react");
  return {
    __esModule: true,
    default: {
      Grid: ({
        data,
        renderItem,
      }: {
        data: string[];
        renderItem: (info: { item: string; index: number }) => ReactNode;
      }) => (
        <>
          {data.map((item, index) => (
            <Fragment key={item}>{renderItem({ item, index })}</Fragment>
          ))}
        </>
      ),
      Handle: ({ children }: { children?: ReactNode }) => <>{children}</>,
    },
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: () => ({
    data: mockPreferencesUndefined
      ? undefined
      : mockWidgetIds.map((widgetId, position) => ({ widgetId, position })),
    isLoading: mockIsLoading,
  }),
  useAddWidget: () => ({ mutate: mockAddWidget, isPending: mockMutationPending }),
  useRemoveWidget: () => ({ mutate: mockRemoveWidget, isPending: false }),
  useRestoreWidget: () => ({ mutate: mockRestoreWidget, isPending: false }),
  useReorderWidgets: () => ({ mutate: mockReorderWidgets, isPending: mockMutationPending }),
}));

/**
 * A three-id catalogue in a deliberate order, so "registry order" is an assertion rather
 * than a coincidence of alphabetisation. The id IS the title key, so every control is
 * labelled with the id and no test pins shipped copy.
 */
jest.mock("@/src/features/home/widget-registry", () => ({
  WIDGET_META: {
    "mood-checkin": { id: "mood-checkin" },
    "sleep-latest": { id: "sleep-latest" },
    "cbt-programme": { id: "cbt-programme" },
    "act-programme": { id: "act-programme" },
    "journal-week": { id: "journal-week" },
  },
  isImplemented: (widgetId: string) => !mockUnimplementedIds.includes(widgetId),
  metaForWidget: (widgetId: string) => ({
    titleKey: widgetId,
    icon: "circle",
    route: `/${widgetId}`,
    tier: widgetId.endsWith("-programme") ? "programme" : "tool",
  }),
}));

beforeEach(() => {
  mockWidgetIds = [];
  mockUnimplementedIds = [];
  mockIsLoading = false;
  mockPreferencesUndefined = false;
  mockMutationPending = false;
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  for (const mutation of [mockAddWidget, mockRemoveWidget, mockRestoreWidget, mockReorderWidgets]) {
    mutation.mockImplementation((_value, options) => options?.onSuccess?.());
  }
});

function renderArrange(ids: string[] = ["mood-checkin", "sleep-latest"]) {
  mockWidgetIds = ids;
  renderWithProviders(<ArrangeScreen />);
}

/** The handle is the only control carrying the a11y move actions. */
function moveVia(id: string, action: "moveEarlier" | "moveLater") {
  fireEvent(screen.getByTestId(`arrange-handle-${id}`), "accessibilityAction", {
    nativeEvent: { actionName: action },
  });
}

describe("ArrangeScreen sections", () => {
  it("names its two sections with home's own tier names", () => {
    renderArrange(["mood-checkin", "cbt-programme"]);

    expect(screen.getByText("Your tools")).toBeTruthy();
    expect(screen.getByText("Guided programmes")).toBeTruthy();
  });

  it("omits a heading for an empty section rather than heading nothing", () => {
    renderArrange(["cbt-programme"]);

    expect(screen.queryByText("Your tools")).toBeNull();
    expect(screen.getByText("Guided programmes")).toBeTruthy();
  });

  it("renders neither tier heading on a wholly empty dashboard", () => {
    renderArrange([]);

    expect(screen.queryByText("Your tools")).toBeNull();
    expect(screen.queryByText("Guided programmes")).toBeNull();
  });

  /**
   * ☠️ The drawn screen could not reach a programme card at all: it listed only `TOOLS`,
   * and both `-programme` ids live in the SAME ordered list as the tools. As drawn, a
   * programme card could be neither removed nor re-added once the modal was gone - and
   * today it can be both.
   */
  it("lets a programme card be removed and re-added", () => {
    renderArrange(["cbt-programme"]);

    fireEvent.press(screen.getByRole("button", { name: "Remove cbt-programme" }));
    expect(mockRemoveWidget).toHaveBeenCalledWith(
      "cbt-programme",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    fireEvent.press(screen.getByTestId("arrange-chip-act-programme"));
    expect(mockAddWidget).toHaveBeenCalledWith(
      "act-programme",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  /**
   * The programme tier is NOT reorderable, and that is the one place this screen departs
   * from #980 as written (owner decision, 2026-08-14). #977 seats it in a fixed
   * CBT-then-ACT order, so a drag here would write a `position` home ignores - the
   * row-snaps-back lie #975 removed from the tool tier.
   */
  it("gives programme rows no drag handle", () => {
    renderArrange(["mood-checkin", "cbt-programme"]);

    expect(screen.getByTestId("arrange-handle-mood-checkin")).toBeTruthy();
    expect(screen.queryByTestId("arrange-handle-cbt-programme")).toBeNull();
  });

  /**
   * Rows are inert: the only interactive children are the handle and the remove button.
   * Not a disabled row press, not one buried under `pointerEvents="none"` - a row that
   * was never a `Pressable`, so it is not a tab stop and is announced as nothing.
   */
  it("renders rows with exactly two interactive children and no row press", () => {
    renderArrange(["mood-checkin"]);

    // The row's own name is text, not a button: no "mood-checkin" button exists, only the
    // two controls that act ON it.
    expect(screen.queryByRole("button", { name: "mood-checkin" })).toBeNull();
    expect(screen.getByTestId("arrange-handle-mood-checkin")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove mood-checkin" })).toBeTruthy();
  });
});

describe("ArrangeScreen reorder", () => {
  /**
   * `set_widget_order` reassigns only the positions its named ids already hold, so a tool
   * move must not name the programme row. Passing the flat cross-tier list would renumber
   * 0..n-1 over both tiers - home re-partitions and the row snaps back, which reads as
   * "drag does nothing" rather than as a wrong write.
   */
  it("names only the tool tier's ids, leaving the programme row's position untouched", () => {
    renderArrange(["mood-checkin", "cbt-programme", "sleep-latest"]);

    moveVia("sleep-latest", "moveEarlier");

    expect(mockReorderWidgets).toHaveBeenCalledWith(
      ["sleep-latest", "mood-checkin"],
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("moves a row later through the handle's move-later action", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    moveVia("mood-checkin", "moveLater");

    expect(mockReorderWidgets).toHaveBeenCalledWith(
      ["sleep-latest", "mood-checkin"],
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("writes nothing when the move would leave the list", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    moveVia("mood-checkin", "moveEarlier");
    moveVia("sleep-latest", "moveLater");

    expect(mockReorderWidgets).not.toHaveBeenCalled();
  });

  /**
   * `moveEarlier` / `moveLater` survive as the action NAMES, and the labels a screen
   * reader reads out are still the shipped move strings - the chevron pair went, the two
   * moves did not.
   */
  it("exposes both moves as named accessibility actions on the handle", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    const handle = screen.getByTestId("arrange-handle-mood-checkin");
    expect(handle.props.accessibilityActions).toEqual([
      { name: "moveEarlier", label: "Move mood-checkin earlier" },
      { name: "moveLater", label: "Move mood-checkin later" },
    ]);
    expect(handle.props.accessibilityRole).toBe("button");
    expect(handle.props.focusable).toBe(true);
  });

  /**
   * ⚠️ The hint must not name the arrow keys. react-native-web does not implement
   * `accessibilityHint` at all - the string appears nowhere in `react-native-web/dist` - so
   * it reaches ONLY native AT, and native is the one platform with no arrow keys to press:
   * there the path is the rotor's `moveEarlier` / `moveLater`. Naming the keys told the
   * only listener to do the one thing it cannot. State the outcome instead. Mirrors
   * `manage-emotions-modal.test.tsx` for the emotion list's half of the same pair (#1047).
   */
  it("hints at the outcome, not at keys the platform reading it does not have", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    const hint = screen.getByTestId("arrange-handle-mood-checkin").props.accessibilityHint;
    expect(hint).toBe("Moves this tool up or down in the list.");
    expect(hint).not.toMatch(/arrow|key/i);
  });

  it("leaves the lone row's handle unfocusable - there is nowhere to move it", () => {
    renderArrange(["mood-checkin"]);

    expect(screen.getByTestId("arrange-handle-mood-checkin").props.focusable).toBe(false);
  });

  /**
   * ☠️ The keyboard half was withheld on a lone row from the start and the rotor half was
   * not, so native AT was still offered "Move X earlier" / "Move X later" on the one row
   * that has nowhere to go - and both returned early and did nothing (#1049). An action a
   * screen reader reads out and then declines to perform is worse than no action: the user
   * cannot tell it apart from a bug in their own gesture. `focusable: false` hid the whole
   * thing from the keyboard, which is why this only ever reached VoiceOver and TalkBack.
   */
  it("offers the lone row's handle no move at all - both would have refused", () => {
    renderArrange(["mood-checkin"]);

    expect(screen.getByTestId("arrange-handle-mood-checkin").props.accessibilityActions).toEqual(
      [],
    );
  });

  /**
   * And the hint goes with them. It is read AFTER the label, so on a lone row it followed
   * "Drag to reorder X" with an outcome - "Moves this tool up or down in the list." - that
   * nothing on the row could produce. Nothing to describe, nothing said.
   */
  it("withholds the lone row's hint - there is no outcome left to describe", () => {
    renderArrange(["mood-checkin"]);

    expect(
      screen.getByTestId("arrange-handle-mood-checkin").props.accessibilityHint,
    ).toBeUndefined();
  });

  it("writes nothing when a lone row's move is dispatched anyway", () => {
    renderArrange(["mood-checkin"]);

    moveVia("mood-checkin", "moveLater");

    expect(mockReorderWidgets).not.toHaveBeenCalled();
  });

  /**
   * The arrow keys are the WEB half of the same two moves, and jest runs the native
   * platform - so the assertion here is that the fork exists and native carries no
   * `onKeyDown` (the shape `consent-gate.test.tsx` uses for the same reason). The keys
   * themselves are asserted in `home-widgets.e2e.test.ts`, which drives a real browser.
   *
   * `role="button"` is what makes the handle a tab stop on web: react-native-web gives a
   * button-role View `tabIndex=0` unless `focusable === false`, which is why the lone-row
   * case above takes it back out of the tab order rather than leaving a focusable control
   * whose keys do nothing.
   */
  it("carries no web key handler on native", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    expect(screen.getByTestId("arrange-handle-mood-checkin").props.onKeyDown).toBeUndefined();
  });

  /**
   * ☠️ Reordering by keyboard has to work more than ONCE per row.
   *
   * `focusable` is `tabIndex` under react-native-web, so folding "a write is in flight"
   * into it takes the focused handle out of the tab order while the reorder settles - the
   * user's second Arrow press lands on the document and the row stops moving. `canMove` is
   * therefore structural only; the in-flight guard lives in `reorderWidgets`, where a
   * rejected move costs a no-op rather than the focus ring.
   */
  it("keeps the handle focusable while a write is in flight", () => {
    mockMutationPending = true;
    renderArrange(["mood-checkin", "sleep-latest"]);

    expect(screen.getByTestId("arrange-handle-mood-checkin").props.focusable).toBe(true);
  });

  it("still refuses the move itself while a write is in flight", () => {
    mockMutationPending = true;
    renderArrange(["mood-checkin", "sleep-latest"]);

    moveVia("mood-checkin", "moveLater");

    expect(mockReorderWidgets).not.toHaveBeenCalled();
  });

  it("moves the same row twice in a row", () => {
    // Three rows, so the second move has somewhere to go. The mocked mutation resolves
    // synchronously and the mocked query does not re-order, so this asserts the second
    // press is ACCEPTED rather than the final resting order.
    renderArrange(["mood-checkin", "sleep-latest", "journal-week"]);

    moveVia("mood-checkin", "moveLater");
    moveVia("mood-checkin", "moveLater");

    expect(mockReorderWidgets).toHaveBeenCalledTimes(2);
  });
});

describe("ArrangeScreen chip run", () => {
  it("lists every not-added id, in registry order", () => {
    renderArrange(["sleep-latest"]);

    const chips = within(screen.getByTestId("arrange-chip-run"))
      .getAllByRole("button")
      .map((node) => node.props.testID as string);
    expect(chips).toEqual([
      "arrange-chip-mood-checkin",
      "arrange-chip-cbt-programme",
      "arrange-chip-act-programme",
      "arrange-chip-journal-week",
    ]);
  });

  it("is add-only - an already-added id has no chip", () => {
    renderArrange(["sleep-latest"]);

    expect(screen.queryByTestId("arrange-chip-sleep-latest")).toBeNull();
  });

  it("adds on tap", () => {
    renderArrange(["sleep-latest"]);

    fireEvent.press(screen.getByTestId("arrange-chip-mood-checkin"));

    expect(mockAddWidget).toHaveBeenCalledWith(
      "mood-checkin",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  /**
   * ☠️ The chip run is derived by SUBTRACTING owned ids, so an unsettled query does not
   * merely flash the wrong list - it offers a chip for a widget you already have.
   * `add_widget_preference` is idempotent so the tap writes nothing, but it pushes an
   * `add` onto the undo stack, and undoing an add REMOVES the widget. One tap in that
   * window and one undo deletes a row the user never touched.
   */
  it("withholds the whole run until the preference rows arrive", () => {
    mockPreferencesUndefined = true;
    renderArrange(["sleep-latest"]);

    expect(screen.queryByTestId("arrange-chip-run")).toBeNull();
    expect(screen.queryByTestId("arrange-chip-sleep-latest")).toBeNull();
    expect(screen.queryByTestId("arrange-chip-mood-checkin")).toBeNull();
    // And it does not claim the opposite either - "everything is added" is a statement
    // about rows nobody has read yet.
    expect(screen.queryByText("Everything is already on your home screen.")).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("shows the spinner while loading and never falls through to a section", () => {
    mockIsLoading = true;
    mockPreferencesUndefined = true;
    renderArrange([]);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByText("Your tools")).toBeNull();
    expect(screen.queryByTestId("arrange-chip-run")).toBeNull();
  });

  it("says so rather than running an empty row once everything is added", () => {
    renderArrange([
      "mood-checkin",
      "sleep-latest",
      "cbt-programme",
      "act-programme",
      "journal-week",
    ]);

    expect(screen.queryByTestId("arrange-chip-run")).toBeNull();
    expect(screen.getByText("Everything is already on your home screen.")).toBeTruthy();
  });

  /**
   * The run holds both `-programme` ids, so its copy cannot say "tool" - a re-added CBT
   * programme would arrive under the wrong noun. #980 is explicit about tier naming, and
   * the two tier headings above are the place tier words belong.
   */
  it("heads the run with tier-neutral copy, since it offers programmes too", () => {
    renderArrange(["mood-checkin"]);

    expect(screen.getByText("Add to your home screen")).toBeTruthy();
    expect(screen.getByTestId("arrange-chip-cbt-programme")).toBeTruthy();
  });

  it("carries no search field and no descriptions", () => {
    renderArrange(["sleep-latest"]);

    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
    // The chip is its name and nothing else: one text node inside the pressable.
    const chip = screen.getByTestId("arrange-chip-mood-checkin");
    expect(within(chip).getAllByText(/./)).toHaveLength(1);
  });
});

describe("ArrangeScreen undo", () => {
  it("disables undo before the first edit", () => {
    renderArrange();

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("undoes multiple removals in reverse order", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    fireEvent.press(screen.getByRole("button", { name: "Remove mood-checkin" }));
    fireEvent.press(screen.getByRole("button", { name: "Remove sleep-latest" }));

    fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(mockRestoreWidget).toHaveBeenLastCalledWith(
      { widgetId: "sleep-latest", position: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(mockRestoreWidget).toHaveBeenLastCalledWith(
      { widgetId: "mood-checkin", position: 0 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  /**
   * ☠️ The bug this slice fixes, and the reason the capture reads the PREFERENCE ROWS.
   *
   * `restoreWidgetPreference` splices into the UNFILTERED list, so the index it is handed
   * must be the row's index in the full `widget_preferences` order. Captured from a
   * rendered (filtered) array, a dashboard holding an id this build cannot render puts
   * every later row back one slot too early - here, `sleep-latest` would come back at 1
   * instead of 2. (One face of #964.)
   */
  it("restores by the row's index in the FULL preference order, not the rendered one", () => {
    mockUnimplementedIds = ["some-future-widget"];
    renderArrange(["mood-checkin", "some-future-widget", "sleep-latest"]);

    fireEvent.press(screen.getByRole("button", { name: "Remove sleep-latest" }));
    fireEvent.press(screen.getByRole("button", { name: "Undo" }));

    expect(mockRestoreWidget).toHaveBeenCalledWith(
      { widgetId: "sleep-latest", position: 2 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("undoes an add by removing it, and a reorder by writing the previous order", () => {
    renderArrange(["mood-checkin", "sleep-latest"]);

    fireEvent.press(screen.getByTestId("arrange-chip-journal-week"));
    fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(mockRemoveWidget).toHaveBeenLastCalledWith(
      "journal-week",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    moveVia("sleep-latest", "moveEarlier");
    fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(mockReorderWidgets).toHaveBeenLastCalledWith(
      ["mood-checkin", "sleep-latest"],
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe("ArrangeScreen Done", () => {
  /**
   * `Done` is `router.back()` and nothing else, which is what makes hardware back and
   * browser back mean Done by construction rather than by a second handler kept in step.
   */
  it("goes back", () => {
    renderArrange();

    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * The one case back cannot serve: arrange opened as the first entry in the stack, where
   * `router.back()` silently no-ops and the button looks broken. Handled by the shared
   * `backWithFallback` (#475), not by a second local `canGoBack` branch.
   */
  it("falls back to home when there is no history to go back to", () => {
    mockCanGoBack.mockReturnValue(false);
    renderArrange();

    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});

describe("ArrangeScreen banner", () => {
  it("ships the one sentence, and not the false reassurance", () => {
    renderArrange();

    expect(
      screen.getByText("Drag to reorder, or remove what you don't check in with."),
    ).toBeTruthy();
    // ☠️ "Nothing is deleted - it stays in Tools" held for 8 of 23 tool ids: the Tools hub
    // is exactly 8 tiles and most removable ids live under /modules or /routines.
    expect(screen.queryByText(/stays in Tools/i)).toBeNull();
  });

  it("withholds the banner when there is nothing to drag or remove", () => {
    renderArrange([]);

    expect(screen.queryByText(/Drag to reorder/)).toBeNull();
  });
});
