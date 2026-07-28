import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import CbtHistoryScreen from "./cbt-history-screen";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { localDateKey } from "@/src/utils/date";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: jest.fn(() => ({ selectedDate: "2026-05-03", isToday: false })),
}));

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/modules/cbt/history",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

const mockUseThoughtRecords = useThoughtRecords as jest.MockedFunction<typeof useThoughtRecords>;

describe("CbtHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the translated empty state with provider wrappers and mocked backend data", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    renderWithProviders(<CbtHistoryScreen />);

    expect(screen.getByText("No records on this day")).toBeTruthy();
    expect(
      screen.getByText(
        "Try another date, or add a record from the CBT section - it appears here once saved.",
      ),
    ).toBeTruthy();
  });

  it("uses the expected route when a record is opened", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: [
        {
          archivedAt: null,
          balancedThought: "I can take this one step at a time",
          createdAt: "2026-05-03T12:00:00.000Z",
          createdOffsetMinutes: 0,
          dayKey: "2026-05-03",
          distortions: ["catastrophizing"],
          emotionIntensityAfter: null,
          emotionIntensityBefore: null,
          emotions: ["Anxious"],
          evidenceAgainst: [],
          evidenceFor: [],
          id: "record-1",
          nats: [{ text: "I cannot handle this", beliefRating: null, isHotThought: true }],
          outcomeNotes: "",
          situation: "A hard moment",
          updatedAt: "2026-05-03T12:00:00.000Z",
          userId: "user-1",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    renderWithProviders(<CbtHistoryScreen />);

    fireEvent.press(screen.getByText("I cannot handle this"));

    expect(router.push).toHaveBeenCalledWith("/modules/cbt/history/record-1");
  });

  it("uses fallback text for a saved partial record", () => {
    mockUseThoughtRecords.mockReturnValue({
      data: [
        {
          archivedAt: null,
          balancedThought: "",
          createdAt: "2026-05-03T12:00:00.000Z",
          createdOffsetMinutes: 0,
          dayKey: "2026-05-03",
          distortions: [],
          emotionIntensityAfter: null,
          emotionIntensityBefore: null,
          emotions: [],
          evidenceAgainst: [],
          evidenceFor: [],
          id: "record-1",
          nats: [],
          outcomeNotes: "",
          situation: "",
          updatedAt: "2026-05-03T12:00:00.000Z",
          userId: "user-1",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    renderWithProviders(<CbtHistoryScreen />);

    expect(screen.getByText("Untitled thought record")).toBeTruthy();
    expect(screen.getByText(/No balanced thought yet/)).toBeTruthy();
  });

  // The screen is showing 2026-05-03. This record was written at 19:00Z that
  // day, which the jest runner's own timezone (Asia/Kolkata, +05:30) reads as
  // 00:30 on the 4th - so bucketing the instant through the viewer would file it
  // on a day the user had not lived yet. Its captured offset says otherwise, and
  // the captured day is the answer (#330).
  describe("day bucketing", () => {
    const ACROSS_MIDNIGHT_AT = "2026-05-03T19:00:00.000Z";

    const showRecord = (dayKey: string, createdOffsetMinutes: number | null) => {
      mockUseThoughtRecords.mockReturnValue({
        data: [
          {
            archivedAt: null,
            balancedThought: "It will pass",
            createdAt: ACROSS_MIDNIGHT_AT,
            createdOffsetMinutes,
            dayKey,
            distortions: [],
            emotionIntensityAfter: null,
            emotionIntensityBefore: null,
            emotions: [],
            evidenceAgainst: [],
            evidenceFor: [],
            id: "record-1",
            nats: [{ text: "Caught before the flight", beliefRating: null, isHotThought: true }],
            outcomeNotes: "",
            situation: "",
            updatedAt: ACROSS_MIDNIGHT_AT,
            userId: "user-1",
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useThoughtRecords>);

      renderWithProviders(<CbtHistoryScreen />);
    };

    it("pins the premise: this instant really does straddle the viewer's midnight", () => {
      // Guards the two tests below from quietly becoming vacuous. If the runner's
      // timezone ever stopped putting this instant on the next day, they would
      // still pass while testing nothing.
      expect(localDateKey(new Date(ACROSS_MIDNIGHT_AT))).toBe("2026-05-04");
    });

    it("lists a record whose captured day differs from the viewer's local day", () => {
      // Before #330 this filter ran the instant through the viewer's timezone
      // and got 2026-05-04, so this record was missing from the 3rd entirely.
      showRecord("2026-05-03", -420);
      expect(screen.getByText("Caught before the flight")).toBeTruthy();
    });

    it("does not list it on the day its instant falls on for the viewer", () => {
      showRecord("2026-05-04", -420);
      expect(screen.queryByText("Caught before the flight")).toBeNull();
      expect(screen.getByText("No records on this day")).toBeTruthy();
    });

    it("keeps rendering where it always did when no offset was captured", () => {
      // Null is "unknown", never "UTC" (#250): entryDayKey resolved this to the
      // viewer's own day, which is exactly where the record used to appear.
      showRecord("2026-05-04", null);
      expect(screen.queryByText("Caught before the flight")).toBeNull();
    });
  });
});
