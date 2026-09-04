import { resolveDisplayName } from "./display-name";

describe("resolveDisplayName", () => {
  it("prefers the profile display name", () => {
    expect(
      resolveDisplayName({ displayName: "Alex Petrov" }, { user_metadata: { full_name: "Other" } }),
    ).toBe("Alex Petrov");
  });

  it("falls back to user_metadata.full_name, then .name", () => {
    expect(resolveDisplayName(null, { user_metadata: { full_name: "Meta Name" } })).toBe(
      "Meta Name",
    );
    expect(resolveDisplayName({ displayName: null }, { user_metadata: { name: "Nick" } })).toBe(
      "Nick",
    );
  });

  it("ignores blank strings and returns null when nothing is set", () => {
    expect(resolveDisplayName({ displayName: "   " }, { user_metadata: { full_name: "  " } })).toBe(
      null,
    );
    expect(resolveDisplayName(null, null)).toBe(null);
    expect(resolveDisplayName(undefined, { user_metadata: { full_name: 42 } })).toBe(null);
  });
});
