import {
  consumeThoughtRecordSeed,
  seedThoughtRecord,
  useThoughtRecordSeedStore,
} from "@/src/stores/thought-record-seed-store";

describe("thought-record seed store", () => {
  beforeEach(() => {
    useThoughtRecordSeedStore.setState({ emotions: [], situation: "" });
  });

  it("hands the seeded emotions to the next reader", () => {
    seedThoughtRecord(["anxious", "sad"]);

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: ["anxious", "sad"], situation: "" });
  });

  /**
   * The DBT emotion record's "Look at the whole picture" door carries what
   * happened as well as the feelings (#1980): its first part IS the thought
   * record's situation, and re-typing it would be the whole reason a person
   * does not use the door. The check-in has no such field and still seeds
   * emotions alone.
   */
  it("carries a situation when the sender has one", () => {
    seedThoughtRecord(["angry"], "She did not reply for three days");

    expect(consumeThoughtRecordSeed()).toEqual({
      emotions: ["angry"],
      situation: "She did not reply for three days",
    });
  });

  /**
   * Clearing on read is what keeps the handoff to one navigation. Without it, leaving the
   * wizard and coming back would re-apply a prefill from a check-in the user abandoned.
   */
  it("clears on read, so the same seed is never applied twice", () => {
    seedThoughtRecord(["anxious"]);

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: ["anxious"], situation: "" });
    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "" });
  });

  /** ☠️ A situation-only seed must clear too, or it outlives its one navigation. */
  it("clears a seed that carried only a situation", () => {
    seedThoughtRecord([], "Missed the bus");

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "Missed the bus" });
    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "" });
  });

  it("reads empty when nothing was seeded", () => {
    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "" });
  });

  it("replaces a stale seed rather than appending to it", () => {
    seedThoughtRecord(["anxious"], "One thing");
    seedThoughtRecord(["grateful"]);

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: ["grateful"], situation: "" });
  });
});
