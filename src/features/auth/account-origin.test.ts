import { Platform } from "react-native";

import { ACCOUNT_ORIGINS, deriveAccountOrigin } from "./account-origin";

// jest-expo runs this project as "ios", so the web rows have to be asked for
// explicitly - jest cannot fail on web-platform behaviour on its own.
let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;

function onPlatform(os: typeof Platform.OS) {
  platformSpy = jest.replaceProperty(Platform, "OS", os);
}

afterEach(() => {
  platformSpy?.restore();
  platformSpy = undefined;
});

const GUEST = { id: "user-1", email: "" };
const REGISTERED = { id: "user-1", email: "someone@example.com" };

describe("deriveAccountOrigin", () => {
  // The four rows of docs/measurement.md §4, which are the whole of the
  // derivation. One `it` each rather than a table, so a failure names the door.
  it("labels a guest on the web web_cta", () => {
    onPlatform("web");

    expect(deriveAccountOrigin(GUEST)).toBe("web_cta");
  });

  it("labels a registered account on the web web_signup", () => {
    onPlatform("web");

    expect(deriveAccountOrigin(REGISTERED)).toBe("web_signup");
  });

  it("labels a guest on a native build native_cold_start", () => {
    onPlatform("ios");

    expect(deriveAccountOrigin(GUEST)).toBe("native_cold_start");
  });

  it("labels a registered account on a native build native_signup", () => {
    onPlatform("android");

    expect(deriveAccountOrigin(REGISTERED)).toBe("native_signup");
  });

  // ☠️ Guest-ness is the ABSENCE OF AN EMAIL, never `is_anonymous`, which keeps
  // claiming `true` for the length of one token window after a conversion
  // (`src/features/profile/guest.ts`). A derivation spelled on the flag would
  // label a freshly converted web account `web_cta`.
  it("reads a converted account as registered while its is_anonymous flag still says guest", () => {
    onPlatform("web");

    const justConverted = { id: "user-1", email: "someone@example.com", is_anonymous: true };

    expect(deriveAccountOrigin(justConverted)).toBe("web_signup");
  });

  it("derives only values the union admits", () => {
    // That those four are also the column's CHECK is pinned by
    // `test/account-origin-check-parity.test.ts`, which reads the migration.
    // Asserting it here against a hand-copied literal would have been a claim,
    // not a guarantee - the same file would have carried both halves.
    const derived = [deriveAccountOrigin(GUEST), deriveAccountOrigin(REGISTERED)];

    for (const value of derived) {
      expect(ACCOUNT_ORIGINS).toContain(value);
    }
  });
});
