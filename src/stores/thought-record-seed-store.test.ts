import {
  consumeThoughtRecordSeed,
  seedThoughtRecord,
  useThoughtRecordSeedStore,
} from "@/src/stores/thought-record-seed-store";

describe("thought-record seed store", () => {
  beforeEach(() => {
    useThoughtRecordSeedStore.setState({ emotions: [] });
  });

  it("hands the seeded emotions to the next reader", () => {
    seedThoughtRecord(["anxious", "sad"]);

    expect(consumeThoughtRecordSeed()).toEqual(["anxious", "sad"]);
  });

  /**
   * Clearing on read is what keeps the handoff to one navigation. Without it, leaving the
   * wizard and coming back would re-apply a prefill from a check-in the user abandoned.
   */
  it("clears on read, so the same seed is never applied twice", () => {
    seedThoughtRecord(["anxious"]);

    expect(consumeThoughtRecordSeed()).toEqual(["anxious"]);
    expect(consumeThoughtRecordSeed()).toEqual([]);
  });

  it("reads empty when nothing was seeded", () => {
    expect(consumeThoughtRecordSeed()).toEqual([]);
  });

  it("replaces a stale seed rather than appending to it", () => {
    seedThoughtRecord(["anxious"]);
    seedThoughtRecord(["grateful"]);

    expect(consumeThoughtRecordSeed()).toEqual(["grateful"]);
  });
});
