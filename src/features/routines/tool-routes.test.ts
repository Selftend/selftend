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
});
