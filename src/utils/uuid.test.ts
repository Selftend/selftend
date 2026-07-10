import { isValidUuid } from "@/src/utils/uuid";

describe("isValidUuid", () => {
  it.each([
    "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "00000000-0000-0000-0000-000000000000",
    "C56A4180-65AA-42EC-A945-5FD21DEC0538", // Postgres accepts uppercase hex
  ])("accepts %s", (value) => {
    expect(isValidUuid(value)).toBe(true);
  });

  it.each([
    "does-not-exist", // the QA repro: /tools/journal/does-not-exist
    "999", // the QA repro: /tools/sleep/999
    "",
    "c56a4180-65aa-42ec-a945-5fd21dec053", // one hex digit short
    "c56a4180-65aa-42ec-a945-5fd21dec05380", // one hex digit long
    "c56a418065aa42eca9455fd21dec0538", // missing hyphens
    "c56a4180-65aa-42ec-a945-5fd21dec053g", // non-hex character
    "c56a4180-65aa-42ec-a945-5fd21dec0538\n", // trailing newline must not slip through
  ])("rejects %s", (value) => {
    expect(isValidUuid(value)).toBe(false);
  });
});
