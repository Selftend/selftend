import { getInitial } from "./avatar-initial";

/**
 * The initial moved out of `profile-avatar.tsx` so the header and the settings
 * identity row stop disagreeing about it (#1829), and its sentinel changed from
 * `"?"` to `null` so callers can draw a person glyph (#1810).
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

  /**
   * A guest who saves a name gets a real initial from it, and that is correct:
   * the slot shows the most specific thing known about the person (#1810 §5).
   */
  it("takes the letter from a guest's saved name", () => {
    expect(getInitial("Alex", "")).toBe("A");
  });
});
