import { STEPPABLE_TOOL_IDS, type SteppableToolId } from "@/src/features/routines/derive";
import {
  buildStarterSteps,
  STARTER_CANDIDATE_TOOLS,
  STARTER_STEP_CAP,
  STARTER_STEP_MIN,
} from "@/src/features/routines/starter";
import { DISTINCT_STEPPABLE_TOOLS } from "@/src/features/routines/starter-offer";
import { WITHHELD_STEP_TOOL_IDS } from "@/src/features/routines/step-tool-rollout";

/**
 * The starter composes from the steppable tools the person has RECORDS in (#1954,
 * spec #1885 §5.3), never from a preferences table. Its input is that set of tool ids;
 * its order is the fixed candidate array; recency never enters.
 */
describe("STARTER_CANDIDATE_TOOLS", () => {
  it("is every distinct steppable tool except habits and whatever rollout withholds", () => {
    // #31 keeps Habits out of auto-composition; dropAnchor is already out of the
    // DISTINCT list because it is a subset of connection. The third exclusion is
    // rollout (#2203): "Keep" is a WRITE, so a candidate the shipped native
    // client cannot read would compose a step that phone can never tick.
    expect(STARTER_CANDIDATE_TOOLS).toEqual(
      DISTINCT_STEPPABLE_TOOLS.filter(
        (tool) => tool !== "habits" && !WITHHELD_STEP_TOOL_IDS.includes(tool),
      ),
    );
    expect(STARTER_CANDIDATE_TOOLS).toHaveLength(18);
    expect(STARTER_CANDIDATE_TOOLS).not.toContain("habits");
    expect(STARTER_CANDIDATE_TOOLS).not.toContain("dropAnchor");
  });

  it("orders the everyday tools first, then the ACT exercises, then DBT last", () => {
    // The widening to module exercises is self-limiting BECAUSE of this order: with a
    // cap of 3, an exercise composes only when fewer than three everyday tools have
    // records (sub-decision 1, ratified on #1894).
    expect(STARTER_CANDIDATE_TOOLS.slice(0, 4)).toEqual(["mood", "journal", "gratitude", "sleep"]);
    const firstAct = STARTER_CANDIDATE_TOOLS.indexOf("defusion");
    expect(firstAct).toBeGreaterThanOrEqual(10);
    expect(STARTER_CANDIDATE_TOOLS.indexOf("breathing")).toBeLessThan(firstAct);

    // ☠️ DBT sits behind every ACT exercise (#1980), which is what keeps the
    // widening self-limiting: with the cap at three, a DBT record composes a
    // step only for someone with fewer than three records across the rest.
    // Asserted on the underlying order rather than on the candidate list,
    // because rollout currently trims DBT off the end entirely (#2203) - the
    // ordering rule has to stay pinned for the day it comes back.
    const ordered = DISTINCT_STEPPABLE_TOOLS.filter((tool) => tool !== "habits");
    const firstDbt = ordered.indexOf("muscleRelaxation");
    expect(firstDbt).toBeGreaterThan(ordered.indexOf("committedAction"));
    expect(ordered.slice(firstDbt)).toEqual([
      "muscleRelaxation",
      "wiseMind",
      "judgement",
      "emotionRecord",
      "oppositeAction",
      "script",
    ]);
  });

  it("composes none of the withheld tools while they are withheld", () => {
    for (const tool of WITHHELD_STEP_TOOL_IDS) {
      expect(STARTER_CANDIDATE_TOOLS).not.toContain(tool);
      expect(buildStarterSteps([tool, ...WITHHELD_STEP_TOOL_IDS])).toBeNull();
    }
  });
});

describe("buildStarterSteps", () => {
  it("composes the first three candidates in array order, whatever order the records came in", () => {
    // Shuffled recency: the caller's order is the order it noticed records in, and
    // that must never leak into the offer - the same person sees the same routine on
    // every visit.
    const shuffled: SteppableToolId[] = ["sleep", "mood", "gratitude", "journal"];
    expect(buildStarterSteps(shuffled)).toEqual(["mood", "journal", "gratitude"]);
    expect(buildStarterSteps([...shuffled].reverse())).toEqual(["mood", "journal", "gratitude"]);
  });

  it("caps at three", () => {
    const steps = buildStarterSteps(["journal", "mood", "breathing", "sleep", "meditation"]);
    expect(steps).toHaveLength(STARTER_STEP_CAP);
    expect(steps).toEqual(["mood", "journal", "sleep"]);
  });

  it("returns null below the two-tool minimum (no offer)", () => {
    expect(STARTER_STEP_MIN).toBe(2);
    expect(buildStarterSteps(["mood"])).toBeNull();
    expect(buildStarterSteps([])).toBeNull();
  });

  it("offers three module exercises to someone with no everyday-tool records", () => {
    // Sub-decision 1: module exercises ARE eligible. The CBT/ACT-centred person is
    // exactly who the old widget map never offered anything to.
    expect(buildStarterSteps(["choicePoint", "cbt", "defusion"])).toEqual([
      "cbt",
      "defusion",
      "choicePoint",
    ]);
  });

  it("lets everyday tools crowd module exercises out, by order rather than by rule", () => {
    expect(buildStarterSteps(["defusion", "cbt", "mood", "journal", "gratitude"])).toEqual([
      "mood",
      "journal",
      "gratitude",
    ]);
  });

  it("excludes habits from composition even when it has records", () => {
    expect(buildStarterSteps(["habits", "mood", "journal"])).toEqual(["mood", "journal"]);
    // Habits plus one candidate stays below the minimum.
    expect(buildStarterSteps(["habits", "mood"])).toBeNull();
  });

  it("never emits dropAnchor - a connection log is already the connection step", () => {
    expect(buildStarterSteps(["dropAnchor", "connection", "mood"])).toEqual(["mood", "connection"]);
  });

  it("dedupes a tool named twice", () => {
    expect(buildStarterSteps(["mood", "mood", "journal"])).toEqual(["mood", "journal"]);
  });

  it("can compose from any steppable tool the records hook knows", () => {
    // A tool added to STEPPABLE_TOOL_IDS later is either a candidate or one of the
    // three deliberate exclusions - never silently dropped.
    for (const tool of STEPPABLE_TOOL_IDS) {
      const excluded =
        tool === "habits" || tool === "dropAnchor" || WITHHELD_STEP_TOOL_IDS.includes(tool);
      expect(STARTER_CANDIDATE_TOOLS.includes(tool)).toBe(!excluded);
    }
  });
});
