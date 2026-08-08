import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { JournalDayCard } from "@/src/features/journal/journal-day-card";
import { currentDateKey, toLocalDateKey } from "@/src/stores/selected-date-store";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockRouter = jest.mocked(router);

function entry(id: string, createdAt: string, title: string, body: string) {
  return {
    id,
    userId: "user-1",
    title,
    body,
    occurredAt: createdAt,
    occurredOffsetMinutes: null,
    dayKey: entryDayKey(createdAt, null),
    createdAt,
    updatedAt: createdAt,
  };
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

    renderWithProviders(<JournalDayCard entries={entries} selectedDate={day} />);

    expect(screen.getByText("Day note")).toBeTruthy();
    expect(screen.queryByText("Other day")).toBeNull();
    expect(screen.queryByText(/Nothing written on/)).toBeNull();
  });

  it("shows the empty state and routes Write one to the new-entry screen", () => {
    renderWithProviders(<JournalDayCard entries={[]} selectedDate="2026-05-30" />);

    expect(screen.getByText(/Nothing written on/)).toBeTruthy();

    fireEvent.press(screen.getByText("Write one"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tools/journal/new");
  });

  // The card reads "is this today?" off the date it was handed (#720). This used
  // to pass `isToday={true}` beside a past `selectedDate` - a combination the app
  // could not produce - so the assertion proved nothing about real rendering.
  it("titles the card 'Today' when the selected day is today", () => {
    renderWithProviders(<JournalDayCard entries={[]} selectedDate={currentDateKey()} />);

    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("titles the card with the date when the selected day is not today", () => {
    renderWithProviders(<JournalDayCard entries={[]} selectedDate="2026-05-30" />);

    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getByText("Sat, May 30")).toBeTruthy();
  });
});
