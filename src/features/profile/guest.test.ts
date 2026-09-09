import { isGuestAccount } from "./guest";

describe("isGuestAccount", () => {
  it("is true for a guest, whose email is the empty string rather than undefined", () => {
    // ☠️ The shape that breaks `??`: GoTrue gives an anonymous user `email: ""`
    // while the type says `email?: string`, so a nullish check walks past it.
    expect(isGuestAccount({ email: "" })).toBe(true);
    expect(isGuestAccount({})).toBe(true);
  });

  it("is false for a registered user", () => {
    expect(isGuestAccount({ email: "alex@example.com" })).toBe(false);
  });

  /**
   * ☠️ The whole reason this function exists (#1896). `convertGuestWithPassword`
   * flips `is_anonymous` server-side, but the live JWT keeps claiming
   * `is_anonymous: true` until the token is minted again - so this person is
   * registered while still carrying a true flag. Every predicate spelled on the
   * flag called them a guest for the length of that window.
   */
  it("is false inside the stale-flag window, where the flag still says anonymous", () => {
    const justConverted = { email: "alex@example.com", is_anonymous: true };

    expect(isGuestAccount(justConverted)).toBe(false);
  });

  /**
   * ☠️ No session is nobody, not somebody unregistered. Callers branch on the
   * two differently - `canSignOut` refuses both, while the sign-in redirect lets
   * a guest through and sends a signed-out visitor to the form - so the
   * distinction stays at the call site rather than being hidden here.
   */
  it("is false for no session at all", () => {
    expect(isGuestAccount(null)).toBe(false);
    expect(isGuestAccount(undefined)).toBe(false);
  });
});
