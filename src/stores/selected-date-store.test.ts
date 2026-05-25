import {
  currentDateKey,
  loggedAtForSelectedDate,
  toLocalDateKey,
  useSelectedDateStore,
} from "@/src/stores/selected-date-store";

describe("selected-date-store", () => {
  beforeEach(() => useSelectedDateStore.getState().resetToToday());

  it("defaults to today", () => {
    expect(useSelectedDateStore.getState().selectedDate).toBe(currentDateKey());
  });

  it("sets a past date", () => {
    useSelectedDateStore.getState().setSelectedDate("2026-05-01");
    expect(useSelectedDateStore.getState().selectedDate).toBe("2026-05-01");
  });

  it("clamps a future date to today", () => {
    useSelectedDateStore.getState().setSelectedDate("2999-01-01");
    expect(useSelectedDateStore.getState().selectedDate).toBe(currentDateKey());
  });

  it("resetToToday returns to today", () => {
    useSelectedDateStore.getState().setSelectedDate("2026-05-01");
    useSelectedDateStore.getState().resetToToday();
    expect(useSelectedDateStore.getState().selectedDate).toBe(currentDateKey());
  });

  it("loggedAtForSelectedDate returns a timestamp on the selected day", () => {
    const iso = loggedAtForSelectedDate("2026-05-01");
    // The function guarantees the LOCAL date equals the selected day (the app's
    // date convention), which differs from the UTC slice near midnight.
    expect(toLocalDateKey(iso)).toBe("2026-05-01");
  });
});
