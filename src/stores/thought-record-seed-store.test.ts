import { resetAllDraftStores } from "@/src/stores/draft-store-registry";
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
    expect(consumeThoughtRecordSeed()).toBeNull();
    expect(useThoughtRecordSeedStore.getState().emotions).toEqual([]);
  });

  /** ☠️ A situation-only seed must clear too, or it outlives its one navigation. */
  it("clears a seed that carried only a situation", () => {
    seedThoughtRecord([], "Missed the bus");

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: [], situation: "Missed the bus" });
    expect(consumeThoughtRecordSeed()).toBeNull();
  });

  /**
   * ☠️ `null`, never an empty seed. An empty object is truthy, and the form picks
   * its `defaultValues` with `seed ? … : storedDraftValues` - so "nothing was
   * handed over" wearing the shape of a seed would discard a held draft in favour
   * of nothing at all. The type is the guard; this is the assertion behind it.
   */
  it("reads null when nothing was seeded", () => {
    expect(consumeThoughtRecordSeed()).toBeNull();
  });

  it("replaces a stale seed rather than appending to it", () => {
    seedThoughtRecord(["anxious"], "One thing");
    seedThoughtRecord(["grateful"]);

    expect(consumeThoughtRecordSeed()).toEqual({ emotions: ["grateful"], situation: "" });
  });

  /**
   * ☠️☠️ **A hand-off is stored across no navigation at all, so it needs no window.**
   * The assertions replaced here pinned a 30-minute freshness window on a seed the
   * arrival left waiting "for the next fresh open", and a `deferred` flag that owned
   * the once-per-hand-off notice. Both are gone with the state they guarded: the
   * arrival consumes the seed whatever it decides to do with it (see `decideArrival`
   * in `use-thought-record-editor.ts`), so there is nothing left for a later open to
   * find and nothing for a clock to adjudicate. What the window existed to prevent -
   * an unrelated open of the form arriving pre-filled with an old episode - is now
   * prevented by construction rather than by a chosen number.
   */
  it("holds nothing once the seed has been taken", () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    consumeThoughtRecordSeed();

    expect(useThoughtRecordSeedStore.getState()).toMatchObject({
      emotions: [],
      situation: "",
    });
    expect(consumeThoughtRecordSeed()).toBeNull();
  });

  /**
   * ☠️ A hand-off can still be minted and never arrived at - the door pressed, the
   * app backgrounded before the form mounts - and what waits is a paragraph about an
   * episode. The store is registered with the draft registry so sign-out drops it,
   * or the next person on the device would open a thought record on the last one's
   * words.
   */
  it("is dropped by the sign-out wipe", () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    resetAllDraftStores();

    expect(consumeThoughtRecordSeed()).toBeNull();
  });
});
