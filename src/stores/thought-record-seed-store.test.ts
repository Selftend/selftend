import { resetAllDraftStores } from "@/src/stores/draft-store-registry";
import { HANDOFF_SEED_TTL_MS } from "@/src/stores/handoff-seed";
import {
  consumeThoughtRecordSeed,
  deferThoughtRecordSeed,
  hasThoughtRecordSeed,
  seedThoughtRecord,
  useThoughtRecordSeedStore,
} from "@/src/stores/thought-record-seed-store";

describe("thought-record seed store", () => {
  beforeEach(() => {
    useThoughtRecordSeedStore.setState({
      emotions: [],
      situation: "",
      mintedAt: null,
      deferred: false,
    });
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

  /**
   * ☠️☠️ **A kept hand-off has a window, because nothing else ends its wait.**
   * This store is a module singleton, so on native (no page reload) a seed the
   * form left un-consumed waits for the whole app process. Without a bound it
   * lands on a LATER open of the form that had nothing to do with the door -
   * the person opens `/modules/cbt/new` from the hub to write about today and
   * the Situation arrives pre-filled with a paragraph about an old episode,
   * which they can save into a record that is about something else.
   */
  it("drops a hand-off that outlived its window instead of applying it", () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");
    useThoughtRecordSeedStore.setState({ mintedAt: Date.now() - HANDOFF_SEED_TTL_MS - 1 });

    expect(hasThoughtRecordSeed()).toBe(false);
    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "" });
    // Dropped, not merely refused: a stale seed must not sit there for the open after this one.
    expect(useThoughtRecordSeedStore.getState().emotions).toEqual([]);
  });

  it("still applies a hand-off inside the window", () => {
    // The control: the assertion above must fail for the AGE, not because the
    // store stopped handing seeds over at all.
    seedThoughtRecord(["anxious"], "She did not reply for three days");
    useThoughtRecordSeedStore.setState({ mintedAt: Date.now() - HANDOFF_SEED_TTL_MS + 1000 });

    expect(hasThoughtRecordSeed()).toBe(true);
    expect(consumeThoughtRecordSeed()).toEqual({
      emotions: ["anxious"],
      situation: "She did not reply for three days",
    });
  });

  /**
   * The kept-draft notice belongs to the arrival that caused the deferral.
   * `keptDraft` is recomputed from (seed present) AND (draft has content) at
   * every mount, and neither side is consumed on that path - so the second
   * caller has to be told "no", or the form re-announces the hand-off on every
   * visit for as long as the draft is held.
   */
  it("owns the kept-draft notice once per hand-off", () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    expect(deferThoughtRecordSeed()).toBe(true);
    expect(deferThoughtRecordSeed()).toBe(false);
    // The seed itself is untouched: it is still waiting for the next fresh open.
    expect(hasThoughtRecordSeed()).toBe(true);

    // A NEW hand-off is a new decision and speaks again.
    seedThoughtRecord(["angry"], "Something else");
    expect(deferThoughtRecordSeed()).toBe(true);
  });

  /**
   * ☠️ A seed can now outlive its navigation: the form keeps a live draft and
   * leaves the hand-off waiting for the next fresh open (#2206). What waits is a
   * paragraph about an episode, so the store is registered with the draft
   * registry and sign-out drops it - otherwise the next person on the device
   * would open a thought record on the last one's words.
   */
  it("is dropped by the sign-out wipe", () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    resetAllDraftStores();

    expect(hasThoughtRecordSeed()).toBe(false);
    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "" });
  });
});
