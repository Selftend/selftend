import { ABSOLUTE_MINIMUM_AGE_FLOOR, floorForCountry, meetsAgeFloor } from "./age-floor";

/**
 * The expected table is written out literally here, straight from #227 §2,
 * rather than imported from the module. A test that reads the same constant it
 * asserts against proves only that a lookup is a lookup; restating the decision
 * is what makes this a check on the spec.
 */
const COUNTRIES_BY_FLOOR: Record<number, string[]> = {
  13: ["US", "GB", "BE", "DK", "EE", "FI", "LV", "MT", "PT", "SE", "NO", "IS"],
  14: ["AT", "BG", "CY", "IT", "LT", "ES"],
  15: ["CZ", "FR", "GR", "SI"],
  16: ["HR", "DE", "HU", "IE", "LU", "NL", "PL", "RO", "SK", "LI"],
};

const ALL_LISTED = Object.values(COUNTRIES_BY_FLOOR).flat();

describe("floorForCountry", () => {
  it.each(
    Object.entries(COUNTRIES_BY_FLOOR).flatMap(([floor, countries]) =>
      countries.map((country) => [country, Number(floor)] as const),
    ),
  )("puts %s at %i", (country, expected) => {
    expect(floorForCountry(country)).toBe(expected);
  });

  it("covers every country the spec lists, with no duplicates", () => {
    expect(new Set(ALL_LISTED).size).toBe(ALL_LISTED.length);
    expect(ALL_LISTED).toHaveLength(32);
  });

  it("falls back to the catch-all for a jurisdiction the table does not name", () => {
    // §2's catch-all: "every jurisdiction not listed below". Japan, Brazil and
    // Australia are all real, all absent from the table, all 13.
    expect(floorForCountry("JP")).toBe(13);
    expect(floorForCountry("BR")).toBe(13);
    expect(floorForCountry("AU")).toBe(13);
  });

  it("reads country codes case-insensitively and ignores surrounding space", () => {
    expect(floorForCountry("de")).toBe(16);
    expect(floorForCountry("  De  ")).toBe(16);
  });

  it("never returns a floor below 13, whatever it is handed", () => {
    const junk = ["", "   ", "ZZ", "XX", "1", "!!", "GERMANY", "d", "undefined", "null"];
    for (const value of junk) {
      expect(floorForCountry(value)).toBeGreaterThanOrEqual(ABSOLUTE_MINIMUM_AGE_FLOOR);
    }
    expect(ABSOLUTE_MINIMUM_AGE_FLOOR).toBe(13);
  });

  it("never returns a floor below 13 for any listed country either", () => {
    for (const country of ALL_LISTED) {
      expect(floorForCountry(country)).toBeGreaterThanOrEqual(13);
    }
  });
});

describe("meetsAgeFloor", () => {
  // Germany's floor is 16, which makes the boundary easy to read.
  const now = new Date(2026, 8, 3); // 2026-09-03, local

  it("returns a boolean and never echoes the date of birth back", () => {
    const result = meetsAgeFloor({ year: 2000, month: 1, day: 1 }, "DE", now);

    expect(typeof result).toBe("boolean");
    expect(result).toBe(true);
  });

  it("admits someone on the exact day they reach the floor", () => {
    expect(meetsAgeFloor({ year: 2010, month: 9, day: 3 }, "DE", now)).toBe(true);
  });

  it("admits someone who passed the floor the day before", () => {
    expect(meetsAgeFloor({ year: 2010, month: 9, day: 2 }, "DE", now)).toBe(true);
  });

  it("turns away someone one day short of the floor", () => {
    expect(meetsAgeFloor({ year: 2010, month: 9, day: 4 }, "DE", now)).toBe(false);
  });

  it("applies the country's own floor, not a single global one", () => {
    // Born 2012-01-01: 14 years old on the test date. Over the line in a
    // 13 or 14 country, under it in a 15 or 16 one.
    const dob = { year: 2012, month: 1, day: 1 };

    expect(meetsAgeFloor(dob, "US", now)).toBe(true); // 13
    expect(meetsAgeFloor(dob, "BG", now)).toBe(true); // 14
    expect(meetsAgeFloor(dob, "FR", now)).toBe(false); // 15
    expect(meetsAgeFloor(dob, "DE", now)).toBe(false); // 16
  });

  it("uses the catch-all floor for an unlisted country", () => {
    const dob = { year: 2012, month: 1, day: 1 }; // 14 on the test date
    expect(meetsAgeFloor(dob, "JP", now)).toBe(true);
  });

  describe("29 February births", () => {
    // Born 2008-02-29, floor 13, so the qualifying year is 2021 — not a leap
    // year. The anniversary does not exist, and the conservative reading is
    // the one a protective floor wants: they qualify on 1 March, not 28 Feb.
    const leapling = { year: 2008, month: 2, day: 29 };

    it("holds them back on 28 February of a non-leap year", () => {
      expect(meetsAgeFloor(leapling, "US", new Date(2021, 1, 28))).toBe(false);
    });

    it("admits them on 1 March of a non-leap year", () => {
      expect(meetsAgeFloor(leapling, "US", new Date(2021, 2, 1))).toBe(true);
    });

    it("admits them on the real anniversary in a leap year", () => {
      // 2024-02-29: the 16th birthday, and 2024 is a leap year.
      expect(meetsAgeFloor(leapling, "DE", new Date(2024, 1, 29))).toBe(true);
    });

    it("holds them back the day before the real anniversary in a leap year", () => {
      expect(meetsAgeFloor(leapling, "DE", new Date(2024, 1, 28))).toBe(false);
    });
  });

  describe("failing closed", () => {
    // A protective gate that cannot read the answer must refuse, not admit.
    it("turns away a date that is not a real calendar day", () => {
      expect(meetsAgeFloor({ year: 2000, month: 2, day: 30 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2000, month: 13, day: 1 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2000, month: 0, day: 1 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2000, month: 4, day: 31 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2001, month: 2, day: 29 }, "US", now)).toBe(false);
    });

    it("turns away a date of birth in the future", () => {
      expect(meetsAgeFloor({ year: 2030, month: 1, day: 1 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2026, month: 9, day: 4 }, "US", now)).toBe(false);
    });

    it("turns away non-finite or absurd components", () => {
      expect(meetsAgeFloor({ year: Number.NaN, month: 1, day: 1 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2000, month: Number.NaN, day: 1 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 2000, month: 1, day: 1.5 }, "US", now)).toBe(false);
      expect(meetsAgeFloor({ year: 0, month: 1, day: 1 }, "US", now)).toBe(false);
    });

    it("turns away when the instant it is given is not a usable date", () => {
      expect(meetsAgeFloor({ year: 2000, month: 1, day: 1 }, "US", new Date(Number.NaN))).toBe(
        false,
      );
    });
  });

  it("admits someone born on the day the app reads the clock, decades ago", () => {
    // Guards against an off-by-one in the year arithmetic itself.
    expect(meetsAgeFloor({ year: 1970, month: 9, day: 3 }, "DE", now)).toBe(true);
  });
});
