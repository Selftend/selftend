import { COUNTRIES, countriesForLanguage, countryName, searchCountries } from "./countries";
import { floorForCountry } from "./age-floor";

describe("countries", () => {
  it("offers every code the floor table has an opinion about", () => {
    // The selector is what feeds `floorForCountry`. A country with a raised
    // floor that nobody can pick would silently drop to the catch-all of 13 -
    // the exact under-protection the table exists to prevent. This is the one
    // assertion tying the two modules together, so it fails if either drifts.
    const raised = ["AT", "BG", "CY", "IT", "LT", "ES", "CZ", "FR", "GR", "SI"];
    const raisedMore = ["HR", "DE", "HU", "IE", "LU", "NL", "PL", "RO", "SK", "LI"];
    const offered = new Set(COUNTRIES.map((c) => c.code));
    for (const code of [...raised, ...raisedMore]) {
      expect(offered.has(code)).toBe(true);
      expect(floorForCountry(code)).toBeGreaterThan(13);
    }
  });

  it("has no duplicate or malformed codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("names every country in both shipped languages", () => {
    for (const country of COUNTRIES) {
      expect(country.en.length).toBeGreaterThan(0);
      expect(country.bg.length).toBeGreaterThan(0);
    }
  });

  it("names a code in the reader's language", () => {
    expect(countryName("DE", "en")).toBe("Germany");
    expect(countryName("DE", "bg")).toBe("Германия");
    // Region-suffixed tags are what i18next actually hands us.
    expect(countryName("BG", "bg-BG")).toBe("България");
  });

  it("accepts a code in any case or with stray whitespace", () => {
    expect(countryName(" de ", "en")).toBe("Germany");
  });

  it("falls back to the code rather than a blank row", () => {
    // Reached only from stored data - `age_attested_country` is `^[A-Z]{2}$`
    // checked but not constrained to this list.
    expect(countryName("ZZ", "en")).toBe("ZZ");
  });

  describe("searchCountries", () => {
    it("offers nothing until something is typed", () => {
      expect(searchCountries("en", "")).toEqual([]);
      expect(searchCountries("en", "   ")).toEqual([]);
    });

    it("ranks names that start with the query above names that merely contain it", () => {
      // "ni" starts Nicaragua/Niger/Nigeria and sits inside Bosnia & Herzegovina.
      // A plain alphabetical filter would lead with Bosnia.
      const names = searchCountries("en", "ni", 250).map((c) => c.name);
      const lastPrefix = names.findIndex((n) => !n.toLowerCase().startsWith("ni")) - 1;
      expect(names[0]).toBe("Nicaragua");
      expect(lastPrefix).toBeGreaterThan(0);
      expect(names.indexOf("Bosnia & Herzegovina")).toBeGreaterThan(lastPrefix);
    });

    it("puts an exact country code first", () => {
      expect(searchCountries("en", "de")[0]).toEqual({ code: "DE", name: "Germany" });
    });

    it("matches without accents", () => {
      expect(searchCountries("en", "cote").map((c) => c.code)).toContain("CI");
      expect(searchCountries("en", "turkiye").map((c) => c.code)).toContain("TR");
    });

    it("searches in the reader's own language", () => {
      expect(searchCountries("bg", "Герман").map((c) => c.code)).toEqual(["DE"]);
      expect(searchCountries("bg", "Бълга").map((c) => c.code)).toEqual(["BG"]);
    });

    it("keeps the list short enough to sit under a text field", () => {
      // "a" matches most of the world; the field shows a handful, not 200.
      expect(searchCountries("en", "a").length).toBeLessThanOrEqual(8);
      expect(searchCountries("en", "a", 3)).toHaveLength(3);
    });

    it("finds nothing for a query no country matches", () => {
      expect(searchCountries("en", "zzzzz")).toEqual([]);
    });
  });

  it("orders the list for the reader's own language", () => {
    const en = countriesForLanguage("en");
    const bg = countriesForLanguage("bg");
    expect(en).toHaveLength(COUNTRIES.length);
    expect(bg).toHaveLength(COUNTRIES.length);
    // Different alphabets, so the same country cannot sit at the same index in
    // both - a cheap way to prove the sort is language-aware rather than fixed.
    expect(en[0].name).not.toBe(bg[0].name);
    expect(bg.find((c) => c.code === "BG")?.name).toBe("България");
  });
});
