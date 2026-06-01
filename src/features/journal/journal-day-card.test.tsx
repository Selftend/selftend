import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { JournalDayCard } from "@/src/features/journal/journal-day-card";
import { toLocalDateKey } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = jest.mocked(router);

function entry(id: string, createdAt: string, title: string, body: string) {
  return { id, userId: "user-1", title, body, createdAt, updatedAt: createdAt };
}

describe("JournalDayCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the entries written on the selected day", () => {
    const createdAt = "2026-05-30T12:00:00.000Z";
    const day = toLocalDateKey(createdAt);
    const entries = [
      entry("j-1", createdAt, "Day note", "three small words here"),
      entry("j-other", "2026-05-20T12:00:00.000Z", "Other day", "nope"),
    ];

    renderWithProviders(<JournalDayCard entries={entries} selectedDate={day} isToday={false} />);

    expect(screen.getByText("Day note")).toBeTruthy();
    expect(screen.queryByText("Other day")).toBeNull();
    expect(screen.queryByText(/Nothing written on/)).toBeNull();
  });

  it("shows the empty state and routes Write one to the new-entry screen", () => {
    renderWithProviders(<JournalDayCard entries={[]} selectedDate="2026-05-30" isToday={false} />);

    expect(screen.getByText(/Nothing written on/)).toBeTruthy();

    fireEvent.press(screen.getByText("Write one"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");
  });

  it("titles the card 'Today' when the selected day is today", () => {
    renderWithProviders(<JournalDayCard entries={[]} selectedDate="2026-05-30" isToday={true} />);

    expect(screen.getByText("Today")).toBeTruthy();
  });
});
