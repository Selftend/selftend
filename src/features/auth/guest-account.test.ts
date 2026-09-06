import { isGuestAccount } from "./guest-account";

/**
 * The one predicate ten surfaces now share (#1896), so the cases they used to
 * each get individually right or wrong are asserted once, here.
 *
 * ☠️ Every fixture spells `email` the way a real user object does. A guest's is
 * the empty string `""` and NOT an absent key — the whole class of bug this
 * function replaces comes from code that treated those as interchangeable.
 */
describe("isGuestAccount", () => {
  it("is true for a guest, whose email is the empty string", () => {
    expect(isGuestAccount({ email: "" })).toBe(true);
  });

  it("is false for a registered user", () => {
    expect(isGuestAccount({ email: "user@example.com" })).toBe(false);
  });

  /**
   * ☠️☠️ THE WHOLE REASON THIS EXISTS. `convertGuestWithPassword` flips
   * `is_anonymous` server-side, but the live JWT keeps claiming `true` until
   * the token is next minted. Ten of eleven decision sites read that flag and
   * answered "guest" about somebody who had just stopped being one.
   *
   * ⚠️ The flag is passed here deliberately, and ignored: the parameter is
   * `Pick<User, "email">`, so this documents that a stale claim riding along on
   * the object changes nothing.
   */
  it("is false inside the stale-flag window, when the flag still says guest", () => {
    expect(isGuestAccount({ email: "converted@example.com", is_anonymous: true } as never)).toBe(
      false,
    );
  });

  /**
   * ⚠️ A signed-out visitor is NOT a guest — there is no account for them to be
   * a guest of. `session-provider.tsx` derives `user` from `session`, so `null`
   * here means "nobody is signed in", and every caller rendering something for
   * guests depends on this being false rather than on a second session check.
   */
  it("is false with no user at all", () => {
    expect(isGuestAccount(null)).toBe(false);
    expect(isGuestAccount(undefined)).toBe(false);
  });

  /**
   * The structural claim the predicate rests on, asserted rather than only
   * argued: every registered identity attaches an email, so a session carrying
   * none is a guest. ⚠️ `undefined` and `""` must agree — an older token that
   * omits the key entirely is still a session with no email.
   */
  it("treats a missing email the same as an empty one", () => {
    expect(isGuestAccount({})).toBe(true);
    expect(isGuestAccount({ email: undefined })).toBe(true);
  });
});
