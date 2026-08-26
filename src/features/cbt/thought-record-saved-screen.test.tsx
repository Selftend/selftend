import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import ThoughtRecordSavedScreen from "@/src/features/cbt/thought-record-saved-screen";
import { useThoughtRecord } from "@/src/features/cbt/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  useLocalSearchParams: () => ({ id: "record-1" }),
  usePathname: () => "/modules/cbt/saved/record-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecord: jest.fn(),
}));

const mockUseThoughtRecord = useThoughtRecord as jest.MockedFunction<typeof useThoughtRecord>;

const baseRecord = {
  id: "record-1",
  userId: "user-1",
  situation: "A hard moment",
  nats: [] as { text: string; beliefRating: number | null; isHotThought: boolean }[],
  emotions: ["Anxious"],
  emotionIntensityBefore: null as number | null,
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  emotionIntensityAfter: null as number | null,
  outcomeNotes: "",
  beliefAfter: null as number | null,
  createdAt: "2026-05-03T12:00:00.000Z",
  updatedAt: "2026-05-03T12:00:00.000Z",
  archivedAt: null,
};

const hotNat = (beliefRating: number | null) => ({
  text: "They will call me out",
  beliefRating,
  isHotThought: true,
});

describe("ThoughtRecordSavedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the calm completion heading", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: baseRecord,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.getByText("You examined a thought.")).toBeTruthy();
  });

  it("shows the belief pair when the hot thought is rated and re-rated", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, nats: [hotNat(85)], beliefAfter: 40 },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.getByText("85")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
  });

  it("omits the belief block when only the before rating is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, nats: [hotNat(85)], beliefAfter: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("85")).toBeNull();
  });

  it("omits the belief block when only the after rating is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, nats: [hotNat(null)], beliefAfter: 40 },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("40")).toBeNull();
  });

  it("omits the belief block when neither rating is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: baseRecord,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("Belief before")).toBeNull();
  });

  it("keeps the intensity pair, under the belief pair, when both of its values exist", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: {
        ...baseRecord,
        nats: [hotNat(85)],
        beliefAfter: 40,
        emotionIntensityBefore: 80,
        emotionIntensityAfter: 30,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.getByText("Belief before")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("omits the intensity block when one of its values is missing", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, emotionIntensityBefore: 80, emotionIntensityAfter: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("80")).toBeNull();
  });

  it("renders the not-found state when the record query resolves with no data", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.getByText("Nothing to show")).toBeTruthy();
    expect(screen.queryByText("You examined a thought.")).toBeNull();
  });

  it("navigates to the record detail when View record is pressed", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: baseRecord,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    fireEvent.press(screen.getByText("View record"));

    expect(router.replace).toHaveBeenCalledWith("/modules/cbt/history/record-1");
  });

  it("navigates home when Back home is pressed", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: baseRecord,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    fireEvent.press(screen.getByText("Back home"));

    expect(router.replace).toHaveBeenCalledWith("/(app)");
  });
});
