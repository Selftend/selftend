import { renderHook } from "@testing-library/react-native";

import {
  currentDateKey,
  loggedAtForSelectedDate,
  toLocalDateKey,
  useSelectedDate,
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

  it("setSelectedDate marks the date as user-picked; resetToToday clears it", () => {
    useSelectedDateStore.getState().setSelectedDate("2026-05-01");
    expect(useSelectedDateStore.getState().userPicked).toBe(true);
    useSelectedDateStore.getState().resetToToday();
    expect(useSelectedDateStore.getState().userPicked).toBe(false);
  });

  describe("useSelectedDate midnight rollover", () => {
    it("live-tracks today when the stored date is stale and the user has not picked", () => {
      // Simulate a session initialized yesterday that then crossed midnight: the
      // store still holds the old key but the user never explicitly picked it.
      useSelectedDateStore.setState({ selectedDate: "2020-01-01", userPicked: false });
      const { result } = renderHook(() => useSelectedDate());
      expect(result.current.selectedDate).toBe(currentDateKey());
      expect(result.current.isToday).toBe(true);
    });

    it("keeps an explicitly picked past date even when it is no longer today", () => {
      useSelectedDateStore.getState().setSelectedDate("2026-05-01");
      const { result } = renderHook(() => useSelectedDate());
      expect(result.current.selectedDate).toBe("2026-05-01");
      expect(result.current.isToday).toBe(false);
    });
  });
});
