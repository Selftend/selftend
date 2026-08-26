import {
  buildThoughtRecordInput,
  cleanList,
  defaultValues,
  hasAnyThought,
  listToText,
  markHotThought,
  resolveHotThought,
  selectHotThoughtIndex,
  textToList,
} from "./thought-record-form";
import type { ThoughtRecordFormSchema } from "./schemas";
import type { NegativeAutomaticThought } from "./types";

const nat = (over: Partial<NegativeAutomaticThought> = {}): NegativeAutomaticThought => ({
  text: "a thought",
  beliefRating: null,
  isHotThought: false,
  ...over,
});

describe("textToList / listToText", () => {
  it("splits an empty string to a single empty element (not [])", () => {
    expect(textToList("")).toEqual([""]);
  });

  it("splits newline-separated text into entries", () => {
    expect(textToList("a\nb")).toEqual(["a", "b"]);
  });

  it("keeps trailing blank lines while editing", () => {
    expect(textToList("a\nb\n")).toEqual(["a", "b", ""]);
  });

  it("joins entries with newlines", () => {
    expect(listToText(["a", "b"])).toBe("a\nb");
  });

  it("round-trips user line breaks through the textarea", () => {
    const text = "line one\nline two\n";
    expect(listToText(textToList(text))).toBe(text);
  });
});

describe("cleanList", () => {
  it("trims entries and drops blank / whitespace-only lines", () => {
    expect(cleanList(["  a ", "", "  "])).toEqual(["a"]);
  });

  it("returns an empty array when everything is blank", () => {
    expect(cleanList(["", "   ", "\t"])).toEqual([]);
  });
});

describe("selectHotThoughtIndex", () => {
  it("returns the index of the highest belief rating", () => {
    expect(
      selectHotThoughtIndex([
        nat({ beliefRating: 20 }),
        nat({ beliefRating: 80 }),
        nat({ beliefRating: 50 }),
      ]),
    ).toBe(1);
  });

  it("treats null as -1 so a rated thought wins over an unrated one", () => {
    expect(selectHotThoughtIndex([nat({ beliefRating: null }), nat({ beliefRating: 0 })])).toBe(1);
  });

  it("returns the first index on ties", () => {
    expect(selectHotThoughtIndex([nat({ beliefRating: 50 }), nat({ beliefRating: 50 })])).toBe(0);
  });

  it("returns 0 for an empty list", () => {
    expect(selectHotThoughtIndex([])).toBe(0);
  });

  it("returns 0 when all ratings are null", () => {
    expect(selectHotThoughtIndex([nat(), nat(), nat()])).toBe(0);
  });
});

describe("markHotThought", () => {
  it("flags exactly one NAT at the given index", () => {
    const result = markHotThought([nat(), nat(), nat()], 1);
    expect(result.map((n) => n.isHotThought)).toEqual([false, true, false]);
  });

  it("does not mutate the input array or its items", () => {
    const input = [nat(), nat()];
    const snapshot = JSON.parse(JSON.stringify(input));
    markHotThought(input, 0);
    expect(input).toEqual(snapshot);
  });
});

describe("resolveHotThought", () => {
  it("returns the flagged NAT", () => {
    const flagged = nat({ text: "hot", isHotThought: true });
    expect(resolveHotThought([nat({ text: "cold" }), flagged])).toBe(flagged);
  });

  it("falls back to the HIGHEST-RATED NAT when none is flagged (#1381)", () => {
    // The column derives the hot thought until the user overrides it, so an
    // unflagged list must read as "the highest-rated one" everywhere.
    const strongest = nat({ text: "strongest", beliefRating: 80 });
    expect(resolveHotThought([nat({ beliefRating: 20 }), strongest])).toBe(strongest);
  });

  it("falls back to the first NAT when nothing is flagged or rated", () => {
    const first = nat({ text: "first" });
    expect(resolveHotThought([first, nat({ text: "second" })])).toBe(first);
  });

  it("returns undefined for an empty list", () => {
    expect(resolveHotThought([])).toBeUndefined();
  });
});

describe("hasAnyThought", () => {
  it("is true when some NAT has non-whitespace text", () => {
    expect(hasAnyThought([nat({ text: "   " }), nat({ text: "real" })])).toBe(true);
  });

  it("is false when every NAT text is blank or whitespace", () => {
    expect(hasAnyThought([nat({ text: "" }), nat({ text: "   " })])).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(hasAnyThought([])).toBe(false);
  });
});

describe("buildThoughtRecordInput", () => {
  const values: ThoughtRecordFormSchema = {
    ...defaultValues,
    situation: "at work",
    evidenceFor: ["  keep ", "", "  "],
    evidenceAgainst: ["against ", "   "],
    outcomeNotes: "  calmer  ",
  };

  const occurrence = { occurredAt: "2026-07-10T12:00:00.000Z", occurredOffsetMinutes: 540 };

  it("attaches the whole occurrence in create mode (recordId null)", () => {
    const result = buildThoughtRecordInput(values, { recordId: null, occurrence });
    expect(result.createdAt).toBe("2026-07-10T12:00:00.000Z");
    // The offset is what fixes the record's civil day, so it must travel with
    // the instant rather than being left for the server to guess (#330).
    expect(result.createdOffsetMinutes).toBe(540);
  });

  it("does NOT attach the occurrence in edit mode", () => {
    const result = buildThoughtRecordInput(values, { recordId: "abc", occurrence });
    expect("createdAt" in result).toBe(false);
    // Omitting the offset on an edit is what stops a record's captured day being
    // re-stamped to wherever the user happens to be when they reopen it.
    expect("createdOffsetMinutes" in result).toBe(false);
  });

  it("cleans both evidence lists and trims outcome notes", () => {
    const result = buildThoughtRecordInput(values, { recordId: "abc", occurrence });
    expect(result.evidenceFor).toEqual(["keep"]);
    expect(result.evidenceAgainst).toEqual(["against"]);
    expect(result.outcomeNotes).toBe("calmer");
  });

  it("passes other fields through unchanged", () => {
    const result = buildThoughtRecordInput(values, { recordId: "abc", occurrence });
    expect(result.situation).toBe("at work");
  });

  it("flags the highest-rated NAT as hot when the user never picked one", () => {
    // The column shows an unflagged list as "the highest-rated one is hot";
    // the save writes that same reading down, so the record carries the hot
    // thought every screen displayed.
    const result = buildThoughtRecordInput(
      { ...values, nats: [nat({ beliefRating: 20 }), nat({ beliefRating: 80 })] },
      { recordId: null, occurrence },
    );
    expect(result.nats.map((n) => n.isHotThought)).toEqual([false, true]);
  });

  it("never moves an explicit hot-thought flag", () => {
    const result = buildThoughtRecordInput(
      {
        ...values,
        nats: [nat({ beliefRating: 20, isHotThought: true }), nat({ beliefRating: 80 })],
      },
      { recordId: null, occurrence },
    );
    expect(result.nats.map((n) => n.isHotThought)).toEqual([true, false]);
  });

  it("leaves an empty NAT list alone", () => {
    const result = buildThoughtRecordInput({ ...values, nats: [] }, { recordId: null, occurrence });
    expect(result.nats).toEqual([]);
  });
});
