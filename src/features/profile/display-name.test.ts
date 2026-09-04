import { getInitial, resolveDisplayName } from "./display-name";

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

/**
 * The initial moved here from `profile-avatar.tsx` so the header and the
 * settings identity row stop disagreeing about it (#1829), and its sentinel
 * changed from `"?"` to `null` so callers can draw a person glyph (#1810).
 */
describe("getInitial", () => {
  it("prefers the name's first letter, uppercased", () => {
    expect(getInitial("alex", "someone@example.com")).toBe("A");
  });

  it("falls back to the email when there is no name", () => {
    expect(getInitial(null, "ux-user@example.com")).toBe("U");
    expect(getInitial("   ", "ux-user@example.com")).toBe("U");
  });

  /**
   * The regression this exists for. An anonymous user's `email` is `""`, not
   * `undefined`, so a `??` chain would take the empty string and index into
   * nothing - which is exactly how settings shipped an empty circle.
   */
  it("returns null for a guest, whose email is an EMPTY STRING and not undefined", () => {
    expect(getInitial(null, "")).toBe(null);
    expect(getInitial("", "")).toBe(null);
    expect(getInitial(null, undefined)).toBe(null);
    expect(getInitial(undefined, undefined)).toBe(null);
  });

  it("never returns the old `?` sentinel", () => {
    expect(getInitial(null, "")).not.toBe("?");
  });
});
