import { normalizeCopingPlanDocument } from "./coping-plan";
import { orderScriptsAsLadder } from "./scripts";
import type { Script } from "@/src/features/dbt/types";

describe("normalizeCopingPlanDocument", () => {
  it("sanitises own lines once, renumbers positions and drops fallback ids that left the plan", () => {
    const document = normalizeCopingPlanDocument({
      items: [
        {
          id: "b",
          section: "soothe",
          kind: "own",
          text: "  the blanket ",
          homeOnly: true,
          position: 7,
        },
        {
          id: "a",
          section: "distract",
          kind: "pick",
          pickKey: "move.walk",
          homeOnly: false,
          position: 2,
        },
      ],
      fallback: ["a", "gone", "b"],
    });

    expect(document).toEqual({
      items: [
        {
          id: "b",
          section: "soothe",
          kind: "own",
          text: "the blanket",
          homeOnly: true,
          position: 0,
        },
        {
          id: "a",
          section: "distract",
          kind: "pick",
          pickKey: "move.walk",
          homeOnly: false,
          position: 1,
        },
      ],
      fallback: ["a", "b"],
    });
  });

  it("stores a pick by its key and never a label", () => {
    const document = normalizeCopingPlanDocument({
      items: [
        {
          id: "a",
          section: "distract",
          kind: "pick",
          pickKey: "move.walk",
          text: "walk",
          homeOnly: false,
          position: 0,
        },
      ],
      fallback: [],
    });
    expect(document.items[0]).not.toHaveProperty("text");
    expect(document.items[0].pickKey).toBe("move.walk");
  });
});

function script(overrides: Partial<Script>): Script {
  return {
    id: overrides.id ?? "id",
    userId: "u",
    situation: "s",
    wantChanged: null,
    iThink: "t",
    emotion: null,
    iFeel: "",
    iWant: "w",
    selfCare: "",
    difficulty: null,
    whenWhere: "",
    howItWent: "",
    createdAt: "2026-09-01T10:00:00.000Z",
    createdOffsetMinutes: 0,
    dayKey: "2026-09-01",
    doneAt: null,
    doneOffsetMinutes: null,
    doneDayKey: null,
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("orderScriptsAsLadder", () => {
  it("puts open rated scripts easiest-first, unrated after them newest-first, done ones last", () => {
    const ordered = orderScriptsAsLadder([
      script({ id: "done-old", doneAt: "2026-09-02T10:00:00.000Z", doneDayKey: "2026-09-02" }),
      script({ id: "unrated-old", createdAt: "2026-08-01T10:00:00.000Z" }),
      script({ id: "hard", difficulty: 80 }),
      script({ id: "unrated-new", createdAt: "2026-09-03T10:00:00.000Z" }),
      script({ id: "easy", difficulty: 20 }),
      script({ id: "done-new", doneAt: "2026-09-04T10:00:00.000Z", doneDayKey: "2026-09-04" }),
    ]);

    expect(ordered.map((s) => s.id)).toEqual([
      "easy",
      "hard",
      "unrated-new",
      "unrated-old",
      "done-new",
      "done-old",
    ]);
  });

  it("never invents a rung: the difficulty orders, nothing gates", () => {
    // Two open scripts sharing a difficulty keep newest-first between them and
    // neither is marked as blocking the other - there is no rung number to read.
    const ordered = orderScriptsAsLadder([
      script({ id: "a", difficulty: 50, createdAt: "2026-09-01T10:00:00.000Z" }),
      script({ id: "b", difficulty: 50, createdAt: "2026-09-02T10:00:00.000Z" }),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(["b", "a"]);
  });
});
