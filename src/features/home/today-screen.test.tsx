import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View as mockView } from "react-native";

import HomeScreen from "./today-screen";
import { renderWithProviders } from "@/test/render-with-providers";

let mockWidgetIds: string[] = [];
const mockAddWidget = jest.fn();
const mockRemoveWidget = jest.fn();
const mockRestoreWidget = jest.fn();
const mockReorderWidgets = jest.fn();

jest.mock("react-native-svg", () => {
  const View = mockView;
  return {
    Svg: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Circle: () => null,
  };
});

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

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: { selectedConcerns: [] } }),
  useUpdateShownButtonTours: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/src/features/onboarding/queries", () => ({
  useApplyWidgetSuggestions: () => ({
    isPending: false,
    isError: false,
    mutate: jest.fn(),
  }),
}));

jest.mock("@/src/components/app/app-onboarding-wizard", () => {
  const { View } = require("react-native");
  return {
    AppOnboardingWizard: ({
      visible,
      includeWelcome,
    }: {
      visible: boolean;
      includeWelcome?: boolean;
    }) =>
      visible ? (
        <View
          testID="suggestion-wizard-visible"
          accessibilityLabel={includeWelcome ? "with welcome" : "without welcome"}
        />
      ) : null,
  };
});

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28" }),
}));

jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: () => ({
    data: mockWidgetIds.map((widgetId, position) => ({ widgetId, position })),
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useAddWidget: () => ({ mutate: mockAddWidget, isPending: false }),
  useRemoveWidget: () => ({ mutate: mockRemoveWidget, isPending: false }),
  useRestoreWidget: () => ({ mutate: mockRestoreWidget, isPending: false }),
  useReorderWidgets: () => ({ mutate: mockReorderWidgets, isPending: false }),
}));

jest.mock("@/src/features/home/tool-row-stats", () => {
  const { View } = require("react-native");
  return {
    ToolTierRow: ({ id }: { id: string }) => <View testID={`tool-row-${id}`} />,
  };
});

jest.mock("@/src/features/home/add-widget-modal", () => {
  const { View } = require("react-native");
  return {
    AddWidgetModal: ({ visible }: { visible: boolean }) =>
      visible ? <View testID="add-widget-modal-visible" /> : null,
  };
});

jest.mock("@/src/features/home/widget-registry", () => {
  const { View } = require("react-native");
  return {
    isImplemented: () => true,
    // The id IS the title key here, so an edit-mode control is labelled
    // "Remove mood-checkin" and the assertions below name ids rather than
    // shipped copy. Two failure modes this avoids: the old form was
    // `mood-checkin ? moodCheckin.title : moodTrend.title`, which labelled
    // every other id in the file with `mood-trend`'s copy and kept doing so
    // after #973 retired that id; and pinning a test to a translated string
    // makes a copy edit look like a broken screen. Which title a widget
    // carries is widget-registry.test.tsx's question, not this file's.
    metaForWidget: (widgetId: string) => ({
      titleKey: widgetId,
      icon: "circle",
      route: `/${widgetId}`,
      // Derived rather than listed, so adding an id to a test never silently drops it
      // out of both tiers - which renders as "the screen is empty", not "the id is
      // untiered", and reads as a broken screen.
      tier: widgetId.endsWith("-programme") ? "programme" : "tool",
    }),
    // Marker per widget id so tests can assert which CARDS the programme tier renders.
    resolveWidget: (widgetId: string) => <View testID={`widget-${widgetId}`} />,
  };
});

// Real useVisibleWidgetIds -> useRoutinesToday runs against these mocks, so
// the slot-suppression tests below exercise the actual scheduling logic.
jest.mock("@/src/features/routines/queries", () => ({
  useRoutines: jest.fn(() => ({ data: [], isLoading: false })),
}));

jest.mock("@/src/features/routines/use-routine-tool-records", () => ({
  useRoutineToolRecords: jest.fn(() => ({})),
}));

beforeEach(() => {
  mockWidgetIds = [];
  jest.clearAllMocks();
  for (const mutation of [mockAddWidget, mockRemoveWidget, mockRestoreWidget, mockReorderWidgets]) {
    mutation.mockImplementation((_value, options) => options?.onSuccess?.());
  }
});

function renderPopulatedHome() {
  mockWidgetIds = ["mood-checkin", "sleep-latest"];
  renderWithProviders(<HomeScreen />);
  fireEvent(screen.getByTestId("home-layout"), "layout", {
    nativeEvent: { layout: { width: 900 } },
  });
}

/**
 * #104's day-level slot suppression is GONE (#975), and these tests are its inverse
 * rather than its deletion.
 *
 * The suppression existed because the grid wrapped every id in a fixed 200px slot, so a
 * routines widget with nothing scheduled cost a screenful of empty card - worse than no
 * card. A row costs one line, so the row stays and states the fact instead. Keeping the
 * cases and flipping the expectation is what makes that a decision on the record; a
 * deleted describe block would just look like coverage that evaporated.
 */
describe("HomeScreen routines row on a day with nothing scheduled (inverts #104)", () => {
  const { useRoutines } = jest.requireMock("@/src/features/routines/queries") as {
    useRoutines: jest.Mock;
  };

  function makeRoutine(cadence: "daily" | "on-demand" | "custom", customDays: number[] = []) {
    return {
      id: "r-1",
      userId: "user-1",
      name: "Morning reset",
      reminderEnabled: false,
      reminderHour: null,
      reminderMinute: null,
      reminderTimezone: null,
      cadence,
      customDays,
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
      steps: [
        {
          id: "r-1-step-0",
          routineId: "r-1",
          userId: "user-1",
          toolId: "mood",
          position: 0,
          createdAt: "2026-07-01T08:00:00.000Z",
          updatedAt: "2026-07-01T08:00:00.000Z",
        },
      ],
    };
  }

  function renderHomeWithRoutinesWidget() {
    mockWidgetIds = ["routines-today", "mood-checkin"];
    renderWithProviders(<HomeScreen />);
    fireEvent(screen.getByTestId("home-layout"), "layout", {
      nativeEvent: { layout: { width: 900 } },
    });
  }

  it("keeps the row when routines exist but none are scheduled today", () => {
    useRoutines.mockReturnValue({ data: [makeRoutine("on-demand")], isLoading: false });

    renderHomeWithRoutinesWidget();

    expect(screen.getByTestId("tool-row-routines-today")).toBeTruthy();
    expect(screen.getByTestId("tool-row-mood-checkin")).toBeTruthy();
  });

  it("keeps the row when a routine is scheduled today", () => {
    useRoutines.mockReturnValue({ data: [makeRoutine("daily")], isLoading: false });

    renderHomeWithRoutinesWidget();

    expect(screen.getByTestId("tool-row-routines-today")).toBeTruthy();
    expect(screen.getByTestId("tool-row-mood-checkin")).toBeTruthy();
  });

  it("keeps the row at zero routines so the onboarding doorway still shows", () => {
    useRoutines.mockReturnValue({ data: [], isLoading: false });

    renderHomeWithRoutinesWidget();

    expect(screen.getByTestId("tool-row-routines-today")).toBeTruthy();
  });

  it("keeps the row in edit mode so it can be removed or reordered", () => {
    useRoutines.mockReturnValue({ data: [makeRoutine("on-demand")], isLoading: false });

    renderHomeWithRoutinesWidget();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    expect(screen.getByTestId("tool-row-routines-today")).toBeTruthy();
  });
});

describe("HomeScreen hero", () => {
  it("renders the greeting hero with date eyebrow", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/good (morning|afternoon|evening)\./i)).toBeTruthy();
  });

  it("renders the Your tools tier heading", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Your tools")).toBeTruthy();
  });

  it("renders empty state when no widgets are present", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/add tools you want to check in/i)).toBeTruthy();
  });

  it("renders Add tool button", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByRole("button", { name: /add to your dashboard/i })).toBeTruthy();
  });

  it("opens the add-widget modal from the manual action", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /add manually/i }));
    expect(screen.getByTestId("add-widget-modal-visible")).toBeTruthy();
  });

  it("opens the suggestion wizard only from an empty Home", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /get suggestions/i }));
    expect(screen.getByTestId("suggestion-wizard-visible")).toBeTruthy();
    expect(screen.getByLabelText("without welcome")).toBeTruthy();
  });

  it("shows undo only in edit mode and disables it before the first edit", () => {
    renderPopulatedHome();

    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    fireEvent.press(screen.getAllByRole("button", { name: "Done" })[0]);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("undoes multiple removals in reverse order", () => {
    renderPopulatedHome();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    fireEvent.press(screen.getByRole("button", { name: "Remove mood-checkin" }));
    fireEvent.press(screen.getByRole("button", { name: "Remove sleep-latest" }));

    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeEnabled();
    fireEvent.press(undo);
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
});

/**
 * The tier split (#950's model, built here in #975): `widget_preferences` stays ONE
 * ordered list and the renderer partitions it by the tier the registry declares. Nothing
 * about the table changes, which is why there is no migration in this slice.
 */
describe("HomeScreen tiers", () => {
  function renderMixedHome() {
    mockWidgetIds = ["mood-checkin", "cbt-programme", "sleep-latest"];
    renderWithProviders(<HomeScreen />);
    fireEvent(screen.getByTestId("home-layout"), "layout", {
      nativeEvent: { layout: { width: 900 } },
    });
  }

  it("renders tool ids as rows and programme ids as cards", () => {
    renderMixedHome();

    expect(screen.getByTestId("tool-row-mood-checkin")).toBeTruthy();
    expect(screen.getByTestId("tool-row-sleep-latest")).toBeTruthy();
    // The programme tier keeps its card until #977 reshapes it - the point of building
    // the partition now is that neither programme id is left homeless in between.
    expect(screen.getByTestId("widget-cbt-programme")).toBeTruthy();
    expect(screen.queryByTestId("tool-row-cbt-programme")).toBeNull();
  });

  it("gives each tier its own level-2 heading", () => {
    renderMixedHome();

    expect(screen.getByText("Your tools")).toBeTruthy();
    expect(screen.getByText("Guided programmes")).toBeTruthy();
  });

  it("omits the programmes heading when no programme id is owned", () => {
    renderPopulatedHome();

    expect(screen.getByText("Your tools")).toBeTruthy();
    expect(screen.queryByText("Guided programmes")).toBeNull();
  });

  it("reorders within a tier, naming only that tier's ids", () => {
    // `set_widget_order` reassigns only the positions its named ids already hold, so a
    // tool move must not name the programme row. Passing the flat cross-tier list would
    // renumber 0..n-1 over both tiers - the renderer re-partitions and the row snaps
    // back, which reads as "drag does nothing" rather than as a wrong write.
    renderMixedHome();
    fireEvent.press(screen.getByRole("button", { name: "Edit widgets" }));

    fireEvent.press(screen.getByRole("button", { name: "Move sleep-latest earlier" }));

    expect(mockReorderWidgets).toHaveBeenCalledWith(
      ["sleep-latest", "mood-checkin"],
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
