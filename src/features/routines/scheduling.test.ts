import { isScheduledOn } from "@/src/features/routines/scheduling";
import type { RoutineCadence } from "@/src/features/routines/types";

function routine(cadence: RoutineCadence, customDays: number[] = []) {
  return { cadence, customDays };
}

// Fixed reference week (July 2026): 12th=Sun(0), 13th=Mon(1), 15th=Wed(3),
// 17th=Fri(5), 18th=Sat(6).
const SUNDAY = new Date("2026-07-12T12:00:00");
const MONDAY = new Date("2026-07-13T12:00:00");
const WEDNESDAY = new Date("2026-07-15T12:00:00");
const FRIDAY = new Date("2026-07-17T12:00:00");
const SATURDAY = new Date("2026-07-18T12:00:00");

describe("isScheduledOn (routines)", () => {
  it("treats daily routines as scheduled on any day, weekend included", () => {
    const daily = routine("daily");
    expect(isScheduledOn(daily, SUNDAY)).toBe(true);
    expect(isScheduledOn(daily, WEDNESDAY)).toBe(true);
    expect(isScheduledOn(daily, SATURDAY)).toBe(true);
  });

  it("treats weekday routines as scheduled Mon-Fri and off on the weekend", () => {
    const weekdays = routine("weekdays");
    // Both week boundaries: Monday in, Friday in, Saturday and Sunday out.
    expect(isScheduledOn(weekdays, MONDAY)).toBe(true);
    expect(isScheduledOn(weekdays, WEDNESDAY)).toBe(true);
    expect(isScheduledOn(weekdays, FRIDAY)).toBe(true);
    expect(isScheduledOn(weekdays, SATURDAY)).toBe(false);
    expect(isScheduledOn(weekdays, SUNDAY)).toBe(false);
  });

  it("treats custom routines as scheduled only on the chosen getDay numbers", () => {
    const weekendOnly = routine("custom", [0, 6]);
    // getDay boundaries: Sunday is 0, Saturday is 6.
    expect(isScheduledOn(weekendOnly, SUNDAY)).toBe(true);
    expect(isScheduledOn(weekendOnly, SATURDAY)).toBe(true);
    expect(isScheduledOn(weekendOnly, MONDAY)).toBe(false);
    expect(isScheduledOn(weekendOnly, WEDNESDAY)).toBe(false);
  });

  it("never schedules a custom routine with no chosen days", () => {
    const noDays = routine("custom", []);
    expect(isScheduledOn(noDays, SUNDAY)).toBe(false);
    expect(isScheduledOn(noDays, WEDNESDAY)).toBe(false);
  });

  it("never schedules on-demand routines, even with customDays populated", () => {
    const onDemand = routine("on-demand", [0, 1, 2, 3, 4, 5, 6]);
    expect(isScheduledOn(onDemand, SUNDAY)).toBe(false);
    expect(isScheduledOn(onDemand, WEDNESDAY)).toBe(false);
    expect(isScheduledOn(onDemand, SATURDAY)).toBe(false);
  });
});
