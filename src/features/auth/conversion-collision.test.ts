import { consumeConversionCollision, recordConversionCollision } from "./conversion-collision";

// Consume-once, like sign-in-prefill: the web linkIdentity collision must
// survive exactly one callback -> sign-up hop and never resurrect later.
describe("conversion collision handoff", () => {
  it("hands the recorded provider over exactly once", () => {
    recordConversionCollision("google");

    expect(consumeConversionCollision()).toBe("google");
    expect(consumeConversionCollision()).toBeNull();
  });

  it("is empty when nothing was recorded", () => {
    expect(consumeConversionCollision()).toBeNull();
  });

  it("keeps only the latest record", () => {
    recordConversionCollision("google");
    recordConversionCollision("apple");

    expect(consumeConversionCollision()).toBe("apple");
  });
});
