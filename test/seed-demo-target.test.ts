/**
 * ☠️ Where the demo seed may write (#2730). Its first act is `delete`, so the target
 * is an allowlist that fails closed: a local stack, or the one project
 * `STAGING_PROJECT_ID` names - and never production, even when `STAGING_PROJECT_ID`
 * itself is wrong.
 *
 * "A guard that is a comment is not a guard" (#2662): these fixtures are the guard.
 * The refusal was also seen red against the real script (see the PR), not assumed.
 */
import {
  PRODUCTION_PROJECT_REF,
  SeedTargetRefused,
  resolveSeedTarget,
  upsertSeedUser,
} from "../scripts/seed-demo-target.mjs";

const STAGING = "qivwioreztotptttnklc";
const stagingUrl = `https://${STAGING}.supabase.co`;

describe("resolveSeedTarget - what is allowed", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"])(
    "accepts a local stack (%s), with or without STAGING_PROJECT_ID",
    (url) => {
      expect(resolveSeedTarget({ url, stagingProjectId: undefined }).kind).toBe("local");
      expect(resolveSeedTarget({ url, stagingProjectId: STAGING }).kind).toBe("local");
    },
  );

  it("accepts exactly https://<STAGING_PROJECT_ID>.supabase.co", () => {
    expect(resolveSeedTarget({ url: stagingUrl, stagingProjectId: STAGING })).toEqual({
      kind: "staging",
      url: stagingUrl,
      ref: STAGING,
    });
  });
});

describe("resolveSeedTarget - what is refused", () => {
  const refused = (url: string | undefined, stagingProjectId: string | undefined) =>
    expect(() => resolveSeedTarget({ url, stagingProjectId })).toThrow(SeedTargetRefused);

  it("refuses PRODUCTION, whatever STAGING_PROJECT_ID says", () => {
    const prod = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
    refused(prod, STAGING);
    refused(prod, undefined);
    // The one that matters most: a mis-pasted secret must not open the door.
    refused(prod, PRODUCTION_PROJECT_REF);
  });

  it("refuses an unrecognised project even with a valid STAGING_PROJECT_ID", () => {
    refused("https://abcdefghijklmnopqrst.supabase.co", STAGING);
  });

  it("refuses a remote target when STAGING_PROJECT_ID is unset, empty or malformed", () => {
    refused(stagingUrl, undefined);
    refused(stagingUrl, "");
    refused(stagingUrl, "not-a-ref");
  });

  it("refuses a staging-looking host that is not Supabase's, or not https", () => {
    refused(`https://${STAGING}.supabase.co.evil.example`, STAGING);
    refused(`https://${STAGING}.example.com`, STAGING);
    refused(`http://${STAGING}.supabase.co`, STAGING);
  });

  it("refuses something that is not a URL at all", () => {
    refused(undefined, STAGING);
    refused("", STAGING);
    refused("127.0.0.1:54321", STAGING);
  });
});

describe("upsertSeedUser", () => {
  const account = { email: "Capture@Example.org", password: "pw-never-logged" };

  function fakeAdmin(users: { id: string; email: string }[]) {
    return {
      listUsers: jest.fn().mockResolvedValue({ data: { users }, error: null }),
      createUser: jest.fn().mockResolvedValue({ data: { user: { id: "new-id" } }, error: null }),
      updateUserById: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
  }

  it("creates the account pre-confirmed when it does not exist", async () => {
    const admin = fakeAdmin([{ id: "other", email: "someone@example.org" }]);
    await expect(upsertSeedUser(admin, account)).resolves.toBe("new-id");
    expect(admin.createUser).toHaveBeenCalledWith({ ...account, email_confirm: true });
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it("updates an existing account (matched case-insensitively) instead of failing on a duplicate", async () => {
    const admin = fakeAdmin([{ id: "existing", email: "capture@example.org" }]);
    await expect(upsertSeedUser(admin, account)).resolves.toBe("existing");
    expect(admin.updateUserById).toHaveBeenCalledWith("existing", {
      password: account.password,
      email_confirm: true,
    });
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it("refuses to run without both halves of the account", async () => {
    const admin = fakeAdmin([]);
    await expect(upsertSeedUser(admin, { email: account.email, password: "" })).rejects.toThrow(
      /SEED_ACCOUNT_EMAIL and SEED_ACCOUNT_PASSWORD/,
    );
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it("never puts the password in an error", async () => {
    const admin = fakeAdmin([]);
    admin.createUser.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(upsertSeedUser(admin, account)).rejects.toThrow(
      /^creating the seed account: boom$/,
    );
  });
});
