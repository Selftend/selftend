import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import CbtHistoryScreen from "./cbt-history-screen";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { renderWithProviders } from "@/test/render-with-providers";

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

    expect(screen.getByText("No thought records yet")).toBeTruthy();
    expect(
      screen.getByText(
        "Create your first record from the CBT section. It will appear here once saved.",
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
});
