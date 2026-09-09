import { readAttestation, type AttestationDraft } from "./age-attestation";

const NOW = new Date(2026, 8, 3, 12, 0, 0); // 2026-09-03, local

const draft = (over: Partial<AttestationDraft> = {}): AttestationDraft => ({
  day: "3",
  month: "9",
  year: "2000",
  country: "DE",
  ...over,
});

describe("readAttestation", () => {
  it("holds back until every question is answered", () => {
    expect(readAttestation(draft({ day: "" }), NOW).kind).toBe("incomplete");
    expect(readAttestation(draft({ month: "" }), NOW).kind).toBe("incomplete");
    expect(readAttestation(draft({ year: "" }), NOW).kind).toBe("incomplete");
    expect(readAttestation(draft({ country: "" }), NOW).kind).toBe("incomplete");
    expect(readAttestation(draft({ year: "   " }), NOW).kind).toBe("incomplete");
  });

  it("passes someone comfortably over their country's floor", () => {
    expect(readAttestation(draft(), NOW)).toEqual({ kind: "pass", country: "DE" });
  });

  it("routes someone under their country's floor to the exit, not to an error", () => {
    // 16 in Germany; born 2012 is 14 here.
    expect(readAttestation(draft({ year: "2012" }), NOW).kind).toBe("under-floor");
  });

  it("reads the floor of the country the person actually declared", () => {
    // Same birth date, three floors: 14 in Bulgaria (pass), 15 in France
    // (pass), 16 in Germany (under). This is the whole reason country is asked.
    const born = { day: "3", month: "9", year: "2011" }; // exactly 15 today
    expect(readAttestation(draft({ ...born, country: "BG" }), NOW).kind).toBe("pass");
    expect(readAttestation(draft({ ...born, country: "FR" }), NOW).kind).toBe("pass");
    expect(readAttestation(draft({ ...born, country: "DE" }), NOW).kind).toBe("under-floor");
  });

  it("admits someone on their birthday and not the day before", () => {
    // US floor is 13.
    const us = { country: "US", year: "2013", month: "9" };
    expect(readAttestation(draft({ ...us, day: "3" }), NOW).kind).toBe("pass");
    expect(readAttestation(draft({ ...us, day: "4" }), NOW).kind).toBe("under-floor");
  });

  it("treats an unlisted country as the catch-all rather than refusing it", () => {
    expect(readAttestation(draft({ country: "JP", year: "2010" }), NOW).kind).toBe("pass");
  });

  it("calls a day that does not exist a correctable mistake, never an exit", () => {
    // ☠️ The distinction is load-bearing: an under-floor verdict deletes the
    // account (#1765), so a typo must never reach it.
    expect(readAttestation(draft({ day: "31", month: "2" }), NOW).kind).toBe("invalid-date");
    expect(readAttestation(draft({ month: "13" }), NOW).kind).toBe("invalid-date");
    expect(readAttestation(draft({ day: "0" }), NOW).kind).toBe("invalid-date");
    expect(readAttestation(draft({ year: "abc" }), NOW).kind).toBe("invalid-date");
    expect(readAttestation(draft({ day: "1.5" }), NOW).kind).toBe("invalid-date");
    expect(readAttestation(draft({ year: "999" }), NOW).kind).toBe("invalid-date");
  });

  it("accepts 29 February in a leap year and rejects it otherwise", () => {
    expect(readAttestation(draft({ day: "29", month: "2", year: "2000" }), NOW).kind).toBe("pass");
    expect(readAttestation(draft({ day: "29", month: "2", year: "2001" }), NOW).kind).toBe(
      "invalid-date",
    );
  });

  it("calls a birth date in the future a mistake rather than an exit", () => {
    expect(readAttestation(draft({ year: "2030" }), NOW).kind).toBe("invalid-date");
  });

  it("normalises the country it hands back, so the stored code is canonical", () => {
    expect(readAttestation(draft({ country: " de " }), NOW)).toEqual({
      kind: "pass",
      country: "DE",
    });
  });

  it("never hands the date of birth back to its caller", () => {
    // The AC this pins: the DOB is compared and dropped. If it ever appears on
    // the outcome, a caller could persist or log it without meaning to.
    const outcomes = [
      readAttestation(draft(), NOW),
      readAttestation(draft({ year: "2012" }), NOW),
      readAttestation(draft({ month: "13" }), NOW),
      readAttestation(draft({ day: "" }), NOW),
    ];
    for (const outcome of outcomes) {
      expect(JSON.stringify(outcome)).not.toMatch(/2000|2012|"day"|"month"|"year"|dateOfBirth/i);
    }
  });

  it("fails closed on an unusable clock", () => {
    expect(readAttestation(draft(), new Date(NaN)).kind).toBe("under-floor");
  });
});
