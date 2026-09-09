import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import MoodDetailScreen from "@/src/features/mood/mood-detail-screen";
import { useMoodLog, useMoodLogs } from "@/src/features/mood/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "log-1" }),
  usePathname: () => "/tools/check-in/log-1",
  useFocusEffect: jest.fn(),
}));

const mockUseWindowDimensions = jest.fn(() => ({
  width: 750,
  height: 1334,
  scale: 2,
  fontScale: 1,
}));
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") {
        return mockUseWindowDimensions;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useDeleteMoodLog: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useMoodLog: jest.fn(),
  useMoodLogs: jest.fn(),
}));

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({ data: [] }),
  useEmotionUsageCounts: () => ({ data: {} }),
}));

const mockUseMoodLog = useMoodLog as jest.MockedFunction<typeof useMoodLog>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockRouter = jest.mocked(router);

const MOCK_ENTRY: {
  id: string;
  userId: string;
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt: string;
  loggedOffsetMinutes: number;
  dayKey: string;
  createdAt: string;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodilySensations: string;
} = {
  id: "log-1",
  userId: "user-1",
  moodScore: 4,
  emotions: ["Anxious"],
  notes: "Felt steadier after a walk",
  linkedStrategy: null,
  loggedAt: new Date("2026-05-10T08:00:00.000Z").toISOString(),
  // Captured one civil day EARLIER than the instant's viewer-local day, so the
  // relative-time assertion below can tell the two frames apart (#433 §2).
  loggedOffsetMinutes: -660,
  dayKey: "2026-05-09",
  createdAt: new Date("2026-05-10T08:00:00.000Z").toISOString(),
  situation: "",
  thoughts: "",
  behaviours: "",
  bodilySensations: "",
};

function renderEntry(overrides: Partial<typeof MOCK_ENTRY> = {}) {
  mockUseMoodLogs.mockReturnValue({
    data: [{ ...MOCK_ENTRY, ...overrides }],
  } as unknown as ReturnType<typeof useMoodLogs>);
  return renderWithProviders(<MoodDetailScreen />);
}

describe("MoodDetailScreen", () => {
  beforeEach(() => {
    // Freeze only the clock (keep timer fns real so RNTL/react-query are unaffected) so the
    // relative-time assertion below is deterministic regardless of the real run date.
    jest.useFakeTimers({
      now: new Date("2026-05-31T12:00:00.000Z"),
      doNotFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "setImmediate",
        "clearImmediate",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
        "hrtime",
        "nextTick",
        "performance",
      ],
    });
    jest.clearAllMocks();
    // `mockReturnValue` outlives clearAllMocks — pin the default width back so
    // a narrow-width test cannot leak into its neighbours.
    mockUseWindowDimensions.mockReturnValue({ width: 750, height: 1334, scale: 2, fontScale: 1 });
    mockUseMoodLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodLog>);
    mockUseMoodLogs.mockReturnValue({
      data: [MOCK_ENTRY],
    } as unknown as ReturnType<typeof useMoodLogs>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the hero strip with score word and score number", () => {
    renderEntry();

    expect(screen.getByText("Good · 4")).toBeTruthy();
  });

  /**
   * #885: the header row's flanks (emoji + actions) never shrink, so every
   * pixel of narrowness comes out of the title block — at phone width the
   * labelled Edit button crushed the title to a character per line. The 2c
   * phone header collapses Edit to an icon button and keeps the date compact.
   */
  it("collapses Edit to an icon button at phone width, keeping its accessible name", () => {
    mockUseWindowDimensions.mockReturnValue({ width: 360, height: 800, scale: 2, fontScale: 1 });
    renderEntry();

    // The accessible name survives; the visible label does not.
    const edit = screen.getByLabelText("Edit");
    expect(edit).toBeTruthy();
    expect(screen.queryByText("Edit")).toBeNull();
    // The date line takes the compact captured-frame form (#870's shapes).
    expect(screen.getByText(/May 9/)).toBeTruthy();

    fireEvent.press(edit);
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/log-1/edit");
  });

  it("keeps the labelled Edit button and the full date at desktop width", () => {
    mockUseWindowDimensions.mockReturnValue({ width: 1280, height: 800, scale: 2, fontScale: 1 });
    renderEntry();

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText(/May 9, 2026/)).toBeTruthy();
  });

  /**
   * The logged-at card folds into the header line (#703). It was the emptiest card on
   * the screen: a title and one timestamp.
   */
  it("folds the timestamp into the header line, with no logged-at row", () => {
    renderEntry();

    // Relative time follows the CAPTURED day (2026-05-09, 22 days before the frozen
    // 2026-05-31), not the instant's viewer-local day (2026-05-10, "21 days ago").
    expect(screen.getByText(/^22 days ago · /)).toBeTruthy();
    expect(screen.queryByText("Logged at")).toBeNull();
  });

  it("renders Edit and Delete in the hero strip", () => {
    renderEntry();

    expect(screen.getByText("Edit")).toBeTruthy();
    // Delete is an icon button - its name lives in the a11y tree, not on screen.
    expect(screen.getByLabelText("Delete")).toBeTruthy();
  });

  it("routes to the edit page for the selected mood entry", () => {
    renderEntry();

    fireEvent.press(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/log-1/edit");
  });

  it("keeps the delete flow behind the confirm dialog", () => {
    renderEntry();

    fireEvent.press(screen.getByLabelText("Delete"));

    expect(screen.getByText("Delete this entry?")).toBeTruthy();
  });

  it("links out to all history from the foot of the screen", () => {
    renderEntry();

    fireEvent.press(screen.getByText("Show all history"));

    expect(mockRouter.push).toHaveBeenCalledWith("/tools/check-in/history");
  });

  /**
   * Seven possible rows, every one conditional (#703). The design draws two because its
   * sample entry has two; that is a sample, not the row set.
   */
  describe("the row set", () => {
    it("renders a row only for the fields this entry actually holds", () => {
      renderEntry();

      expect(screen.getAllByTestId("detail-row")).toHaveLength(2);
      expect(screen.getByText("Emotions")).toBeTruthy();
      expect(screen.getByText("Notes")).toBeTruthy();
      expect(screen.getByText("Felt steadier after a walk")).toBeTruthy();
    });

    it("shows no rows at all for an entry that is only a score", () => {
      renderEntry({ emotions: [], notes: "", linkedStrategy: null });

      expect(screen.queryAllByTestId("detail-row")).toHaveLength(0);
      // And no consolation copy either - an empty screen is the honest shape of a
      // one-tap check-in, not an unfinished form.
      expect(screen.queryByText("Emotions")).toBeNull();
      expect(screen.queryByText("Notes")).toBeNull();
    });

    it("treats whitespace-only reflection as empty", () => {
      renderEntry({ emotions: [], notes: "   ", situation: "\n " });

      expect(screen.queryAllByTestId("detail-row")).toHaveLength(0);
    });

    it("renders each of the four go-deeper fields that has text", () => {
      renderEntry({
        emotions: [],
        notes: "",
        situation: "Email from my manager",
        thoughts: "I am in trouble",
        behaviours: "Left it unopened",
        bodilySensations: "Jaw",
      });

      expect(screen.getAllByTestId("detail-row")).toHaveLength(4);
      expect(screen.getByText("Email from my manager")).toBeTruthy();
      expect(screen.getByText("Jaw")).toBeTruthy();
    });
  });

  /**
   * `linked_strategy` is a system marker with exactly one writer, and the shipped screen
   * printed its slug verbatim - `behavioral-activation`, untranslated, in both locales.
   */
  describe("linked strategy", () => {
    it("names the strategy instead of printing its slug, and links through", () => {
      renderEntry({ emotions: [], notes: "", linkedStrategy: "behavioral-activation" });

      expect(screen.queryByText("behavioral-activation")).toBeNull();
      fireEvent.press(screen.getByText("Behavioural activation"));

      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/activities");
    });

    it("renders no row for a slug it cannot name", () => {
      renderEntry({ emotions: [], notes: "", linkedStrategy: "some-future-strategy" });

      expect(screen.queryAllByTestId("detail-row")).toHaveLength(0);
      expect(screen.queryByText("some-future-strategy")).toBeNull();
    });
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and this href-less Pressable is a `<div role="link">` the browser
   * does nothing with, so Tab reached the linked-entry link and Enter opened nothing (#1735).
   * The link brings its own Enter handler: once per press, never on auto-repeat,
   * never on Space (a link does not activate on Space) - and never on a button,
   * which react-native-web activates itself; a second handler there would fire
   * the press twice.
   *
   * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
   * on a real `<div role="link">` - is proven once for the helper itself, on the
   * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
   */
  describe("the linked-entry link on web", () => {
    beforeEach(() => {
      setPlatformOS("web");
    });

    afterEach(() => {
      setPlatformOS("ios");
    });

    it("activates on Enter, once, and not on a held key or on Space; no button brings a handler", () => {
      // The link renders only for an entry that names a strategy.
      renderEntry({ emotions: [], notes: "", linkedStrategy: "behavioral-activation" });

      const door = screen.getByRole("link", { name: "Behavioural activation" });
      const preventDefault = jest.fn();
      door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/activities");
      expect(preventDefault).toHaveBeenCalledTimes(1);

      door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.props.onKeyDown).toBeUndefined();
      }
    });
  });
});
