import { consumeSignInPrefill, recordSignInPrefill } from "./sign-in-prefill";

describe("sign-in prefill handoff", () => {
  it("hands the recorded email to exactly one consumer", () => {
    recordSignInPrefill("taken@example.com");

    expect(consumeSignInPrefill()).toBe("taken@example.com");
    // Consume-once: a later plain visit to sign-in must not resurrect it.
    expect(consumeSignInPrefill()).toBeNull();
  });

  it("returns null when nothing was recorded", () => {
    expect(consumeSignInPrefill()).toBeNull();
  });

  it("keeps only the latest recording", () => {
    recordSignInPrefill("first@example.com");
    recordSignInPrefill("second@example.com");

    expect(consumeSignInPrefill()).toBe("second@example.com");
  });
});
