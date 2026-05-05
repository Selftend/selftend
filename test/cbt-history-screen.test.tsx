import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import CbtHistoryScreen from "@/app/(app)/cbt/history";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
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
          automaticThought: "I cannot handle this",
          balancedThought: "I can take this one step at a time",
          createdAt: "2026-05-03T12:00:00.000Z",
          distortions: ["catastrophizing"],
          emotions: ["Anxious"],
          id: "record-1",
          situation: "A hard moment",
          updatedAt: "2026-05-03T12:00:00.000Z",
          userId: "user-1",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecords>);

    renderWithProviders(<CbtHistoryScreen />);

    fireEvent.press(screen.getByText("I cannot handle this"));

    expect(router.push).toHaveBeenCalledWith("/cbt/record-1");
  });
});
