import { fireEvent, screen } from "@testing-library/react-native";
import { ActivityIndicator, useWindowDimensions } from "react-native";
import { router } from "expo-router";

import HomeScreen from "./today-screen";
import { getTourTarget } from "@/src/features/tours/tour-targets";
import { renderWithProviders } from "@/test/render-with-providers";

let mockWidgetIds: string[] = [];
/**
 * Rows that exist in `widget_preferences` but that this build does not render. They are
 * the difference between the filtered read and the unfiltered table - the distinction the
 * `Get suggestions` gate turns on, and one this screen can only be tested against if the
 * mock can express it.
 */
let mockUnimplementedIds: string[] = [];
let mockIsLoading = false;
/** The query settled with no data: disabled, or errored. `isLoading` is false in both. */
let mockPreferencesUndefined = false;

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockDimensions = useWindowDimensions as unknown as jest.Mock;
/**
 * The screen reads its own breakpoint, and jest's default width (750) sits on the DESKTOP
 * side of it - so without setting this every test would exercise the wide face and the
 * phone face would ship uncovered.
 */
const atWidth = (width: number) => mockDimensions.mockReturnValue({ width, height: 900 });

/**
 * Home has no sortable any more (#980) - the drag left with the mode, so the tool tier is
 * a plain mapped list. What used to need a `react-native-sortables` mock here now needs an
 * `expo-router` one: every add/arrange door on this screen is a push to `/arrange`.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // `HomeTour` reads it, and only gates its queue on being at "/".
  usePathname: () => "/",
}));

const mockPush = router.push as jest.Mock;

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

// Read-only: home no longer mutates `widget_preferences` at all (#980), so this is the
// whole of its data surface. The mutation hooks moved to arrange-screen.test.tsx with the
// controls that call them.
jest.mock("@/src/features/home/queries", () => ({
  useWidgetPreferences: () => ({
    data: mockPreferencesUndefined
      ? undefined
      : mockWidgetIds.map((widgetId, position) => ({ widgetId, position })),
    isLoading: mockIsLoading,
    refetch: jest.fn(),
    isRefetching: false,
  }),
}));

jest.mock("@/src/features/home/right-now-tier", () => {
  const { View } = require("react-native");
  return {
    RightNowTier: () => <View testID="right-now-tier" />,
  };
});

jest.mock("@/src/features/home/tool-row-stats", () => {
  const { View } = require("react-native");
  return {
    ToolTierRow: ({ id }: { id: string }) => <View testID={`tool-row-${id}`} />,
  };
});

jest.mock("@/src/features/home/widget-registry", () => {
  const { View } = require("react-native");
  return {
    isImplemented: (widgetId: string) => !mockUnimplementedIds.includes(widgetId),
    // The id IS the title key here, so the assertions below name ids rather
    // than shipped copy. Two failure modes this avoids: the old form was
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
  mockUnimplementedIds = [];
  mockIsLoading = false;
  mockPreferencesUndefined = false;
  jest.clearAllMocks();
  atWidth(900);
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
});

describe("HomeScreen greeting", () => {
  it("renders the greeting with the date eyebrow", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/good (morning|afternoon|evening)\./i)).toBeTruthy();
  });

  /**
   * The whole of #960 in one assertion, and it is stated as a COUNT on purpose.
   *
   * The obvious form - `queryByTestId("dashboard-sub")).toBeNull()` - passes forever the
   * moment the node it names stops existing, so it stops testing anything the day it
   * starts being true. Counting the greeting block's children instead fails the moment
   * anyone adds a third line, whatever they call it.
   */
  it("renders exactly two elements - eyebrow and h1 - and no third line", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByTestId("home-greeting").children).toHaveLength(2);
  });

  it("keeps the greeting at two elements on a populated dashboard too", () => {
    renderPopulatedHome();
    expect(screen.getByTestId("home-greeting").children).toHaveLength(2);
  });

  it("renders the Your tools tier heading", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Your tools")).toBeTruthy();
  });

  it("renders empty state when no widgets are present", () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText(/add tools you want to check in/i)).toBeTruthy();
  });

  it("opens the arrange route from the empty state's manual action", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /add manually/i }));
    expect(mockPush).toHaveBeenCalledWith("/arrange");
  });

  it("opens the suggestion wizard only from an empty Home", () => {
    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByRole("button", { name: /get suggestions/i }));
    expect(screen.getByTestId("suggestion-wizard-visible")).toBeTruthy();
    expect(screen.getByLabelText("without welcome")).toBeTruthy();
  });

  /**
   * Arrange is a ROUTE now, not a mode, so home carries none of its controls (#980). This
   * is stated as "no editing control renders at all" rather than as a testID that no
   * longer exists: a `queryByTestId(...).toBeNull()` for a deleted node passes forever.
   */
  it("renders no arrange-mode controls - no Done, no Undo, no per-row remove", () => {
    renderPopulatedHome();

    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove mood-checkin" })).toBeNull();
    expect(screen.queryByText("Drag to rearrange")).toBeNull();
  });
});

/**
 * The header cluster is `tune` + `Add tool`, and it renders iff the TOOL tier is
 * non-empty. Both actions act on rows; with no rows there is nothing to arrange and
 * nothing to add beside, and the dashed box carries its own `Add manually` so no door
 * closes.
 */
describe("HomeScreen header actions (#979)", () => {
  it("renders neither action while the tool tier is empty", () => {
    renderWithProviders(<HomeScreen />);

    expect(screen.queryByRole("button", { name: "Arrange" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add tool" })).toBeNull();
  });

  it("renders exactly the two actions once a tool row is owned", () => {
    renderPopulatedHome();

    expect(screen.getByRole("button", { name: "Arrange" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add tool" })).toBeTruthy();
  });

  it("still withholds them when the only rows are programme cards", () => {
    // The tier that owns the actions is `Your tools`, so a programme card does not
    // conjure them - the same split the dashed box is on.
    mockWidgetIds = ["cbt-programme"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId("widget-cbt-programme")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Arrange" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add tool" })).toBeNull();
  });

  /**
   * Both actions lead to `/arrange`, and neither is a toggle. `Arrange` used to flip a
   * mode and relabel itself `Done`; `Add tool` used to open `AddWidgetModal`. Adding lives
   * on the arrange screen as the chip run, so this is one destination reached by the two
   * verbs people arrive with.
   */
  it("opens the arrange route from both header actions", () => {
    renderPopulatedHome();

    fireEvent.press(screen.getByRole("button", { name: "Arrange" }));
    expect(mockPush).toHaveBeenLastCalledWith("/arrange");

    fireEvent.press(screen.getByRole("button", { name: "Add tool" }));
    expect(mockPush).toHaveBeenLastCalledWith("/arrange");
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  /**
   * The two faces. Phone is 36px icon-only; desktop puts the label beside the glyph. Both
   * carry the same `accessibilityLabel`, so the icon-only face is never an unnamed glyph -
   * which is what makes shrinking it to a square safe at all.
   */
  it("draws 36px icon-only actions on phone, with the label still announced", () => {
    atWidth(390);
    renderPopulatedHome();

    for (const name of ["Arrange", "Add tool"]) {
      const button = screen.getByRole("button", { name });
      expect(button.props.className as string).toContain("h-9 w-9");
    }
    // The label is announced, not drawn: no visible text node carries it on phone.
    expect(screen.queryByText("Add tool")).toBeNull();
  });

  it("labels the actions in text on desktop", () => {
    atWidth(900);
    renderPopulatedHome();

    expect(screen.getByText("Arrange")).toBeTruthy();
    expect(screen.getByText("Add tool")).toBeTruthy();
  });

  /**
   * The tour half of the same fact. `HomeTour` builds its queue from targets that are
   * already REGISTERED (`getTourTarget(...) !== null`), so an unmounted cluster makes the
   * `home:edit` stop skip itself - and skipping is not dismissing, so the stop is never
   * written to `shown_button_tours` and still fires the first time the user owns a tool.
   */
  it("leaves home-edit unregistered while the cluster is unmounted, and registers it after", () => {
    const { unmount } = renderWithProviders(<HomeScreen />);
    expect(getTourTarget("home-edit")).toBeNull();
    unmount();

    renderPopulatedHome();
    expect(getTourTarget("home-edit")).not.toBeNull();
  });
});

/**
 * The dashed box is the TOOL TIER's empty state, and the offer inside it is gated one
 * level wider than the box itself. Both halves are consequences of
 * `apply_widget_recommendations` opening with a whole-table delete.
 */
describe("HomeScreen empty state (#979)", () => {
  it("renders the box beside a programme card, not instead of it", () => {
    mockWidgetIds = ["cbt-programme"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId("home-empty-state")).toBeTruthy();
    expect(screen.getByTestId("widget-cbt-programme")).toBeTruthy();
  });

  it("offers Add manually alone once any row exists, whatever tier it is in", () => {
    mockWidgetIds = ["cbt-programme"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByRole("button", { name: /add manually/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /get suggestions/i })).toBeNull();
  });

  /**
   * The gate is the UNFILTERED row count. A preference row this build cannot render is
   * invisible on screen but present in the table, and `apply_widget_recommendations`
   * would delete it just the same - so the offer has to stay hidden even though the
   * screen looks completely empty.
   */
  it("withholds Get suggestions when the only row is one this build cannot render", () => {
    mockWidgetIds = ["some-future-widget"];
    mockUnimplementedIds = ["some-future-widget"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId("home-empty-state")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add manually/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /get suggestions/i })).toBeNull();
  });

  /**
   * The other half of #964. Withholding the destructive offer stopped the wipe; it did
   * not stop the box telling a user with a full table that they have added nothing. No
   * OTA channel means an old build can outlive the ids a newer one wrote, so this is
   * permanent by construction rather than a migration window.
   */
  it("says the rows need a newer build, not that nothing was added", () => {
    mockWidgetIds = ["some-future-widget"];
    mockUnimplementedIds = ["some-future-widget"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByText(/needs a newer version/i)).toBeTruthy();
    expect(screen.queryByText(/Add tools you want to check in with each day/i)).toBeNull();
    // The recovery affordance stays: this user can still build a dashboard by hand.
    expect(screen.getByRole("button", { name: /add manually/i })).toBeTruthy();
  });

  it("still says nothing-added-yet when the table really is empty", () => {
    renderWithProviders(<HomeScreen />);

    expect(screen.getByText(/Add tools you want to check in with each day/i)).toBeTruthy();
    expect(screen.queryByText(/needs a newer version/i)).toBeNull();
  });

  // One renderable row is enough to make the tier real, so the unsupported line must not
  // appear beside rows the user can actually see.
  it("does not claim an unsupported dashboard when something does render", () => {
    mockWidgetIds = ["cbt-programme", "some-future-widget"];
    mockUnimplementedIds = ["some-future-widget"];
    renderWithProviders(<HomeScreen />);

    expect(screen.queryByText(/needs a newer version/i)).toBeNull();
  });

  it("offers both choices, Add manually first, on a wholly empty dashboard", () => {
    renderWithProviders(<HomeScreen />);

    // Order is the assertion, not just presence: `Add manually` leads.
    const order = screen.UNSAFE_root.findAll(
      (node) =>
        node.props?.children === "Add manually" || node.props?.children === "Get suggestions",
    )
      .map((node) => node.props.children as string)
      // One label is carried by a stack of Text wrappers, so keep first sightings only.
      .filter((label, index, all) => all.indexOf(label) === index);
    expect(order).toEqual(["Add manually", "Get suggestions"]);
  });

  /**
   * Neither is primary. Three different arrangements existed across the two drawn frames
   * and the shipped code, so there was nothing to preserve - and the two are peers, one
   * building the dashboard by hand and the other by questionnaire.
   *
   * Asserted on the class string rather than a computed style: NativeWind never resolves
   * `className` into `style` under jest, so a style assertion here would read `undefined`
   * and pass for the wrong reason.
   */
  it("gives both choices the outline variant, neither the primary fill", () => {
    renderWithProviders(<HomeScreen />);

    for (const name of [/add manually/i, /get suggestions/i]) {
      const className = screen.getByRole("button", { name }).props.className as string;
      expect(className).toContain("border-border");
      expect(className).not.toContain("bg-primary");
    }
  });

  /** A loading surface never claims emptiness. */
  it("renders the spinner while loading and never falls through to the box", () => {
    mockIsLoading = true;
    renderWithProviders(<HomeScreen />);

    expect(screen.queryByTestId("home-empty-state")).toBeNull();
    expect(screen.queryByText(/add tools you want to check in/i)).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  /**
   * `undefined` is not zero, and this is the case `isLoading` does NOT cover: the query is
   * disabled (no user id yet on web hydration) or it errored, so `isLoading` is false and
   * `data` never arrived. The box may render - an unknown dashboard and an empty one look
   * the same - but the offer to REWRITE the table must not, because
   * `apply_widget_recommendations` would delete rows nobody has seen.
   */
  it("withholds Get suggestions when the preference rows never arrived", () => {
    mockPreferencesUndefined = true;
    renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId("home-empty-state")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add manually/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /get suggestions/i })).toBeNull();
  });

  /**
   * The ring is 44px on desktop and 42px on phone, and both are plain classes rather than
   * SVG props - which is the whole reason `BreathingDotEmpty` and its 8-palette render
   * test could go. `includeHiddenElements` is required: the mark is decoration, so it is
   * `accessibilityElementsHidden`, and RNTL hides such subtrees from queries by default.
   */
  it("draws the mark at 44px on desktop and 42px on phone", () => {
    const markClass = () =>
      screen.getByTestId("home-empty-mark", { includeHiddenElements: true }).props
        .className as string;

    atWidth(900);
    renderWithProviders(<HomeScreen />);
    expect(markClass()).toContain("size-11");

    screen.unmount();
    atWidth(390);
    renderWithProviders(<HomeScreen />);
    expect(markClass()).toContain("size-[42px]");
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
    // Programme ids render as cards; tool ids render as rows. #977 reshaped the card
    // itself, but the partition is what decides which of the two an id gets.
    expect(screen.getByTestId("widget-cbt-programme")).toBeTruthy();
    expect(screen.queryByTestId("tool-row-cbt-programme")).toBeNull();
  });

  it("renders Right now above the Your tools heading, not below it", () => {
    // The heading used to live in the page header, which put it ABOVE the `Right now`
    // tier - so the tier was not first, and `Your tools` was separated from the rows it
    // names by everything in between.
    renderMixedHome();

    const order = screen.UNSAFE_root.findAll(
      (node) =>
        node.props?.testID === "right-now-tier" ||
        (typeof node.props?.children === "string" && node.props.children === "Your tools"),
    ).map((node) => (node.props.testID === "right-now-tier" ? "right-now" : "your-tools"));

    expect(order[0]).toBe("right-now");
    expect(order).toContain("your-tools");
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

  it("seats CBT before ACT whatever order the preferences hold", () => {
    // The slice's one novel ordering rule (#977). Onboarding writes these ids in the
    // order the user tapped the module chips, so `position` order would seat ACT first
    // for anyone who picked ACT first - which is why the programme tier does not use it.
    mockWidgetIds = ["act-programme", "cbt-programme"];
    renderWithProviders(<HomeScreen />);
    fireEvent(screen.getByTestId("home-layout"), "layout", {
      nativeEvent: { layout: { width: 900 } },
    });

    const rendered = screen
      .getAllByTestId(/^widget-(cbt|act)-programme$/)
      .map((node) => node.props.testID);
    expect(rendered).toEqual(["widget-cbt-programme", "widget-act-programme"]);
  });

  it("renders one card for a user with a single module interest", () => {
    mockWidgetIds = ["act-programme"];
    renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId("widget-act-programme")).toBeTruthy();
    expect(screen.queryByTestId("widget-cbt-programme")).toBeNull();
    expect(screen.getByText("Guided programmes")).toBeTruthy();
  });

  it("renders the tool tier in preference order", () => {
    // Home is a read-only view of `widget_preferences` in `position` order; reordering
    // is arrange-screen.test.tsx's question now. Order is still asserted HERE, because
    // "arrange writes the order" and "home renders that order" are two different claims
    // and only the second one is this screen's.
    renderMixedHome();

    const rendered = screen.getAllByTestId(/^tool-row-/).map((node) => node.props.testID as string);
    expect(rendered).toEqual(["tool-row-mood-checkin", "tool-row-sleep-latest"]);
  });
});
