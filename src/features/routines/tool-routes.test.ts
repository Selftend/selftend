import { STEPPABLE_TOOL_IDS } from "@/src/features/routines/derive";
import { TOOL_STEP_ROUTES, routeForTool } from "@/src/features/routines/tool-routes";

describe("tool-routes", () => {
  it("maps every steppable tool to an in-app route", () => {
    for (const toolId of STEPPABLE_TOOL_IDS) {
      const route = routeForTool(toolId);
      expect(typeof route).toBe("string");
      expect(route as string).toMatch(/^\/(tools|modules)\//);
    }
    expect(Object.keys(TOOL_STEP_ROUTES).sort()).toEqual([...STEPPABLE_TOOL_IDS].sort());
  });

  it("routes record-writing tools to their /new form and session tools to their picker", () => {
    expect(routeForTool("mood")).toBe("/tools/mood-tracker/new");
    expect(routeForTool("journal")).toBe("/tools/journal/new");
    expect(routeForTool("gratitude")).toBe("/tools/gratitude-log/new");
    expect(routeForTool("sleep")).toBe("/tools/sleep/new");
    expect(routeForTool("cbt")).toBe("/modules/cbt/new");
    // Breathing's /new is the custom-exercise editor, not a session - the
    // picker is where a session (and its qualifying record) starts.
    expect(routeForTool("breathing")).toBe("/tools/breathing");
    expect(routeForTool("grounding")).toBe("/tools/grounding");
    expect(routeForTool("meditation")).toBe("/tools/meditation");
    expect(routeForTool("habits")).toBe("/tools/habits");
  });

  it("routes ACT tools to their record-writing surface (#123)", () => {
    expect(routeForTool("defusion")).toBe("/modules/act/defusion/new");
    expect(routeForTool("expansion")).toBe("/modules/act/expansion/new");
    // Guided screens save their own log on completion.
    expect(routeForTool("urgeSurf")).toBe("/modules/act/expansion/urge-surfing");
    expect(routeForTool("dropAnchor")).toBe("/modules/act/connection/drop-anchor");
    expect(routeForTool("connection")).toBe("/modules/act/connection/new");
    expect(routeForTool("observingSelf")).toBe("/modules/act/observing-self/new");
    expect(routeForTool("bullsEye")).toBe("/modules/act/values/bulls-eye");
    expect(routeForTool("choicePoint")).toBe("/modules/act/choice-point/new");
    // Progress is an update to an EXISTING action - the list is the doorway.
    expect(routeForTool("committedAction")).toBe("/modules/act/committed-action");
  });

  it("routes CBT list-first tools to their lists (#123)", () => {
    // Completing an activity / logging an exposure session happens against an
    // existing entity, not on a /new form.
    expect(routeForTool("activities")).toBe("/modules/cbt/activities");
    expect(routeForTool("exposure")).toBe("/modules/cbt/exposure");
  });
});
