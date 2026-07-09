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
  nats: [],
  emotions: ["Anxious"],
  emotionIntensityBefore: null as number | null,
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  emotionIntensityAfter: null as number | null,
  outcomeNotes: "",
  createdAt: "2026-05-03T12:00:00.000Z",
  updatedAt: "2026-05-03T12:00:00.000Z",
  archivedAt: null,
};

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

  it("shows before and after intensity when both are set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, emotionIntensityBefore: 80, emotionIntensityAfter: 30 },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("omits the intensity block when only the before value is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, emotionIntensityBefore: 80, emotionIntensityAfter: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("80")).toBeNull();
  });

  it("omits the intensity block when only the after value is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: { ...baseRecord, emotionIntensityBefore: null, emotionIntensityAfter: 30 },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("30")).toBeNull();
  });

  it("omits the intensity block when neither value is set", () => {
    mockUseThoughtRecord.mockReturnValue({
      data: baseRecord,
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    renderWithProviders(<ThoughtRecordSavedScreen />);

    expect(screen.queryByText("Before")).toBeNull();
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
