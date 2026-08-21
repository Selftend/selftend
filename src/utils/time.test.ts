import {
  clampTime,
  dateToTime,
  formatHHmm,
  formatTimeOfDay,
  fromTwelveHour,
  parseHHmm,
  timeToDate,
  toTwelveHour,
  usesTwelveHourClock,
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

describe("usesTwelveHourClock", () => {
  it("is true for English and false for Bulgarian", () => {
    expect(usesTwelveHourClock("en")).toBe(true);
    expect(usesTwelveHourClock("bg")).toBe(false);
  });
  it("reads the locale, not the language family", () => {
    // en-GB is a 24-hour English, so "starts with en" would get it wrong.
    expect(usesTwelveHourClock("en-GB")).toBe(false);
  });
  it("falls back to 24-hour for an unknown tag rather than throwing", () => {
    expect(usesTwelveHourClock("not a locale")).toBe(false);
  });
});

describe("formatTimeOfDay", () => {
  it("renders 12-hour with a day period in English", () => {
    // A non-breaking space separates the two in some ICU versions.
    expect(formatTimeOfDay({ hour: 19, minute: 5 }, "en")).toMatch(/^7:05\s?PM$/);
  });
  it("renders 24-hour in Bulgarian", () => {
    expect(formatTimeOfDay({ hour: 19, minute: 5 }, "bg")).toBe("19:05");
  });
  it("clamps like the wire format does", () => {
    expect(formatTimeOfDay({ hour: 99, minute: -3 }, "bg")).toBe("23:00");
  });
  it("never emits the wire format's zero-padded 24-hour text in a 12-hour locale", () => {
    // The whole reason this is a SIBLING of formatHHmm: `preferred_time_of_day`
    // is a wire column and must never receive "7:05 PM".
    expect(formatHHmm({ hour: 19, minute: 5 })).toBe("19:05");
  });
});

describe("toTwelveHour / fromTwelveHour", () => {
  it("maps both midnights onto 12", () => {
    expect(toTwelveHour(0)).toEqual({ hour: 12, meridiem: "am" });
    expect(toTwelveHour(12)).toEqual({ hour: 12, meridiem: "pm" });
  });
  it("maps the ordinary hours", () => {
    expect(toTwelveHour(7)).toEqual({ hour: 7, meridiem: "am" });
    expect(toTwelveHour(19)).toEqual({ hour: 7, meridiem: "pm" });
  });
  it("round-trips every hour of the day", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const { hour: shown, meridiem } = toTwelveHour(hour);
      expect(fromTwelveHour(shown, meridiem)).toBe(hour);
    }
  });
});
