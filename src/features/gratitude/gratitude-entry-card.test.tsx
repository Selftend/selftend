import { entryDayKey } from "@/src/lib/occurrence-time";
import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { GratitudeEntryCard } from "@/src/features/gratitude/gratitude-entry-card";
import { useSetGratitudeEntryStarred } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/gratitude-log",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/gratitude/queries", () => ({
  useSetGratitudeEntryStarred: jest.fn(),
}));

const mockStar = useSetGratitudeEntryStarred as jest.MockedFunction<
  typeof useSetGratitudeEntryStarred
>;
const mockRouter = jest.mocked(router);

function makeEntry(overrides: Partial<GratitudeEntry> = {}): GratitudeEntry {
  return {
    id: "g-1",
    userId: "user-1",
    level: 3,
    items: ["laughed", "kind-person", "ttt", "", ""],
    note: "",
    loggedAt: "2026-06-03T08:00:00.000Z",
    loggedOffsetMinutes: null,
    dayKey: entryDayKey("2026-06-03T08:00:00.000Z", null),
    createdAt: "2026-06-03T08:00:00.000Z",
    updatedAt: "2026-06-03T08:00:00.000Z",
    events: [],
    goodMoment: "",
    missIfGone: "",
    hiddenGood: "",
    lifeItems: ["", "", ""],
    starred: false,
    ...overrides,
  };
}

describe("GratitudeEntryCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStar.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as never);
  });

  it("renders a compact hairline row with the first thing emphasized and the rest joined", () => {
    renderWithProviders(<GratitudeEntryCard entry={makeEntry()} />);

    expect(screen.getByText("laughed")).toBeTruthy();
    expect(screen.getByText("kind-person · ttt")).toBeTruthy();
    expect(screen.getByText(/days ago/)).toBeTruthy();
    expect(screen.queryByText("Show more")).toBeNull();
  });

  it("opens the detail screen when the row is pressed", () => {
    renderWithProviders(<GratitudeEntryCard entry={makeEntry()} />);

    fireEvent.press(screen.getByLabelText(/View gratitude entry from/));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/tools/gratitude-log/[id]",
      params: { id: "g-1" },
    });
  });

  it("toggles the star without opening the row", () => {
    const mutateAsync = jest.fn().mockResolvedValue(makeEntry({ starred: true }));
    mockStar.mockReturnValue({ mutateAsync, isPending: false } as never);
    renderWithProviders(<GratitudeEntryCard entry={makeEntry()} />);

    fireEvent(screen.getByLabelText("Favourite"), "press", { stopPropagation: jest.fn() });

    expect(mutateAsync).toHaveBeenCalledWith({ id: "g-1", starred: true });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("a starred entry exposes the Favourited action label", () => {
    renderWithProviders(
      <GratitudeEntryCard
        entry={makeEntry({ items: ["only one", "", "", "", ""], starred: true })}
      />,
    );

    expect(screen.getByLabelText("Favourited")).toBeTruthy();
  });
});
