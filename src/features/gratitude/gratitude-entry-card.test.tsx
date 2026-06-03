import { fireEvent, screen } from "@testing-library/react-native";

import { GratitudeEntryCard } from "@/src/features/gratitude/gratitude-entry-card";
import {
  useDeleteGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
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
  useDeleteGratitudeEntry: jest.fn(),
}));

const mockStar = useSetGratitudeEntryStarred as jest.MockedFunction<
  typeof useSetGratitudeEntryStarred
>;
const mockDelete = useDeleteGratitudeEntry as jest.MockedFunction<typeof useDeleteGratitudeEntry>;

function makeEntry(overrides: Partial<GratitudeEntry> = {}): GratitudeEntry {
  return {
    id: "g-1",
    userId: "user-1",
    level: 3,
    items: ["laughed", "kind-person", "ttt", "", ""],
    note: "",
    loggedAt: "2026-06-03T08:00:00.000Z",
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
    mockDelete.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as never);
  });

  it("collapsed shows the first two answers and a Show more affordance, hiding the rest", () => {
    renderWithProviders(<GratitudeEntryCard entry={makeEntry()} />);

    expect(screen.getByText("What made you laugh?")).toBeTruthy();
    expect(screen.getByText("laughed")).toBeTruthy();
    expect(screen.getByText("Who was kind to you?")).toBeTruthy();
    expect(screen.getByText("kind-person")).toBeTruthy();
    expect(screen.getByText("Show more")).toBeTruthy();
    // 3rd answer hidden while collapsed
    expect(screen.queryByText("ttt")).toBeNull();
    expect(screen.queryByText("What simple pleasure did you enjoy?")).toBeNull();
    // action row hidden while collapsed
    expect(screen.queryByText("Open")).toBeNull();
  });

  it("expanding reveals the remaining answers and the action row", () => {
    renderWithProviders(<GratitudeEntryCard entry={makeEntry()} />);

    fireEvent.press(screen.getByText("Show more"));

    expect(screen.getByText("ttt")).toBeTruthy();
    expect(screen.getByText("What simple pleasure did you enjoy?")).toBeTruthy();
    expect(screen.getByText("Show less")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("an entry with two or fewer answers shows everything and the action row, with no Show more", () => {
    renderWithProviders(
      <GratitudeEntryCard entry={makeEntry({ items: ["only one", "", "", "", ""] })} />,
    );

    expect(screen.getByText("only one")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.queryByText("Show more")).toBeNull();
  });

  it("a starred entry shows the Favorited action label", () => {
    renderWithProviders(
      <GratitudeEntryCard
        entry={makeEntry({ items: ["only one", "", "", "", ""], starred: true })}
      />,
    );

    expect(screen.getByText("Favorited")).toBeTruthy();
  });
});
