import {
  clampTime,
  dateToTime,
  formatHHmm,
  formatTimeLabel,
  is24HourLocale,
  parseHHmm,
  timeToDate,
} from "@/src/utils/time";

describe("clampTime", () => {
  it("keeps valid times", () => {
    expect(clampTime({ hour: 7, minute: 5 })).toEqual({ hour: 7, minute: 5 });
  });
  it("clamps out-of-range and non-finite values", () => {
    expect(clampTime({ hour: 99, minute: -3 })).toEqual({ hour: 23, minute: 0 });
    expect(clampTime({ hour: NaN, minute: 75 })).toEqual({ hour: 0, minute: 59 });
  });
  it("truncates fractional values", () => {
    expect(clampTime({ hour: 7.9, minute: 5.4 })).toEqual({ hour: 7, minute: 5 });
  });
});

describe("formatHHmm", () => {
  it("zero-pads to HH:mm", () => {
    expect(formatHHmm({ hour: 7, minute: 5 })).toBe("07:05");
    expect(formatHHmm({ hour: 23, minute: 0 })).toBe("23:00");
  });
});

describe("parseHHmm", () => {
  it("parses valid strings", () => {
    expect(parseHHmm("07:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseHHmm("7:05")).toEqual({ hour: 7, minute: 5 });
  });
  it("returns null for empty/malformed/out-of-range", () => {
    expect(parseHHmm("")).toBeNull();
    expect(parseHHmm(null)).toBeNull();
    expect(parseHHmm(undefined)).toBeNull();
    expect(parseHHmm("garbage")).toBeNull();
    expect(parseHHmm("24:00")).toBeNull();
    expect(parseHHmm("12:60")).toBeNull();
    expect(parseHHmm("7:5")).toBeNull();
  });
});

describe("timeToDate / dateToTime", () => {
  it("round-trips", () => {
    expect(dateToTime(timeToDate({ hour: 9, minute: 30 }))).toEqual({ hour: 9, minute: 30 });
  });
});

describe("is24HourLocale", () => {
  it("detects 24h vs 12h locales", () => {
    expect(is24HourLocale("en-US")).toBe(false);
    expect(is24HourLocale("bg")).toBe(true);
  });
  it("is safe for unknown locales", () => {
    expect(typeof is24HourLocale("xx-unknown")).toBe("boolean");
  });
});

describe("formatTimeLabel", () => {
  it("uses AM/PM for en-US", () => {
    const label = formatTimeLabel({ hour: 7, minute: 5 }, "en-US");
    expect(label).toMatch(/7:05/);
    expect(label).toMatch(/AM/i);
  });
  it("uses 24h (no AM/PM) for bg", () => {
    const label = formatTimeLabel({ hour: 7, minute: 5 }, "bg");
    expect(label).not.toMatch(/AM|PM/i);
    expect(label).toMatch(/05/);
  });
});
