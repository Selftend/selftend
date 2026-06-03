import { screen } from "@testing-library/react-native";
import { Text as mockText } from "react-native";
import type { ReactNode } from "react";

import GratitudeDetailScreen from "@/src/features/gratitude/gratitude-detail-screen";
import {
  useDeleteGratitudeEntry,
  useGratitudeEntries,
  useGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import { renderWithProviders } from "@/test/render-with-providers";

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

  it("renders the 1st today question and its answer", () => {
    renderWithProviders(<GratitudeDetailScreen />);

    expect(screen.getByText("What made you laugh?")).toBeTruthy();
    expect(screen.getByText("laughed")).toBeTruthy();
  });

  it("renders the 3rd today question and its answer", () => {
    renderWithProviders(<GratitudeDetailScreen />);

    expect(screen.getByText("What simple pleasure did you enjoy?")).toBeTruthy();
    expect(screen.getByText("kind-person")).toBeTruthy();
  });

  it("omits the 2nd today question when the slot is empty", () => {
    renderWithProviders(<GratitudeDetailScreen />);

    expect(screen.queryByText("Who was kind to you?")).toBeNull();
  });
});
