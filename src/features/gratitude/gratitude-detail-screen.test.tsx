import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import GratitudeDetailScreen from "@/src/features/gratitude/gratitude-detail-screen";
import {
  useDeleteGratitudeEntry,
  useGratitudeEntries,
  useGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  useLocalSearchParams: () => ({ id: "g-1" }),
  usePathname: () => "/tools/gratitude-log/g-1",
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useGratitudeEntries: jest.fn(),
  useGratitudeEntry: jest.fn(),
  useDeleteGratitudeEntry: jest.fn(),
  useSetGratitudeEntryStarred: jest.fn(),
}));

const mockUseGratitudeEntries = useGratitudeEntries as jest.MockedFunction<
  typeof useGratitudeEntries
>;
const mockUseGratitudeEntry = useGratitudeEntry as jest.MockedFunction<typeof useGratitudeEntry>;
const mockUseDeleteGratitudeEntry = useDeleteGratitudeEntry as jest.MockedFunction<
  typeof useDeleteGratitudeEntry
>;
const mockUseSetGratitudeEntryStarred = useSetGratitudeEntryStarred as jest.MockedFunction<
  typeof useSetGratitudeEntryStarred
>;

const cachedEntry = {
  id: "g-1",
  userId: "user-1",
  level: 3,
  items: ["laughed", "", "kind-person", "", ""],
  lifeItems: ["", "", ""],
  events: [],
  goodMoment: "",
  missIfGone: "",
  hiddenGood: "",
  starred: false,
  note: "",
  loggedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("GratitudeDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGratitudeEntries.mockReturnValue({
      data: [cachedEntry],
    } as unknown as ReturnType<typeof useGratitudeEntries>);
    mockUseGratitudeEntry.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useGratitudeEntry>);
    mockUseDeleteGratitudeEntry.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteGratitudeEntry>);
    mockUseSetGratitudeEntryStarred.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSetGratitudeEntryStarred>);
  });

  it("keeps the compact header on the think room pour", () => {
    const { UNSAFE_getByType } = renderWithProviders(<GratitudeDetailScreen />);
    // The root carries the think room re-pour; a wrong or missing room fails here.
    expectNeutralRoom(UNSAFE_getByType(SafeAreaView));
  });

  it("renders one numbered list without legacy prompt labels", () => {
    renderWithProviders(<GratitudeDetailScreen />);

    expect(screen.getByText(/Logged .* · 2 things/)).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("laughed")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("kind-person")).toBeTruthy();
    expect(screen.queryByText("What made you laugh?")).toBeNull();
  });

  it("keeps deletion behind the shared confirmation dialog", async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteGratitudeEntry.mockReturnValue({ mutateAsync, isPending: false } as never);
    renderWithProviders(<GratitudeDetailScreen />);

    fireEvent.press(screen.getByLabelText("Delete"));
    expect(screen.getByText("Delete this entry?")).toBeTruthy();
    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("g-1"));
  });
});
