import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  WIDGET_META,
  WIDGET_REGISTRY,
  isImplemented,
  metaForWidget,
} from "@/src/features/home/widget-registry";
import { CONCERN_KEYS, resolveConcernWidgetIds } from "@/src/features/onboarding/concerns";
import { SHARED_TOOL_WIDGET_IDS } from "@/src/features/onboarding/recommendations";

// Every static route Expo Router serves, read off the `app/` tree rather than
// restated here - a hand-written expectation would drift the moment a route
// moves. Route groups like `(app)` are invisible in the URL, and `index.tsx`
// collapses onto its directory.
//
// Dynamic segments are deliberately excluded. A dashboard row navigates to a
// fixed screen, so a route like `/tools/journal/[id]` is always a mistake -
// leaving `[id]` in the set would let that literal pass as if it resolved.
const isDynamic = (segment: string) => segment.includes("[");

function collectRoutes(dir: string, prefix: string, out: Set<string>): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const { name } = entry;
    if (entry.isDirectory()) {
      if (isDynamic(name)) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      collectRoutes(join(dir, name), isGroup ? prefix : `${prefix}/${name}`, out);
      continue;
    }
    if (!name.endsWith(".tsx") || name.startsWith("_") || isDynamic(name)) continue;
    const base = name.slice(0, -".tsx".length);
    out.add(base === "index" ? prefix || "/" : `${prefix}/${base}`);
  }
  return out;
}

const APP_ROUTES = collectRoutes(join(__dirname, "../../../app"), "", new Set<string>());

describe("widget registry", () => {
  it("exposes the daily check-in (mood-checkin) meta", () => {
    expect(WIDGET_META["mood-checkin"]).toBeDefined();
    expect(WIDGET_META["mood-checkin"].status).toBe("default");
  });

  it("every implemented widget has metadata", () => {
    for (const id of Object.keys(WIDGET_REGISTRY)) {
      expect(WIDGET_META[id]).toBeDefined();
    }
  });

  it("isImplemented reflects registry membership", () => {
    expect(isImplemented("mood-checkin")).toBe(true);
    expect(isImplemented("cbt-open-record")).toBe(true);
    expect(isImplemented("not-a-widget")).toBe(false);
  });

  it("registers cbt-distortion-guide as an available widget", () => {
    expect(isImplemented("cbt-distortion-guide")).toBe(true);
    expect(WIDGET_META["cbt-distortion-guide"].status).toBe("available");
    expect(WIDGET_META["cbt-distortion-guide"].toolKey).toBe("cbt");
  });

  it("registers cbt-programme as an available widget", () => {
    expect(isImplemented("cbt-programme")).toBe(true);
    expect(WIDGET_META["cbt-programme"].status).toBe("available");
    expect(WIDGET_META["cbt-programme"].toolKey).toBe("cbt");
  });

  it("registers act-committed-actions as an available widget", () => {
    expect(isImplemented("act-committed-actions")).toBe(true);
    expect(WIDGET_META["act-committed-actions"].status).toBe("available");
    expect(WIDGET_META["act-committed-actions"].toolKey).toBe("act");
  });

  it("registers act-defusion as an available widget", () => {
    expect(isImplemented("act-defusion")).toBe(true);
    expect(WIDGET_META["act-defusion"].status).toBe("available");
    expect(WIDGET_META["act-defusion"].toolKey).toBe("act");
  });

  it("registers the ACT programme widget but not the removed act-values widget", () => {
    expect(isImplemented("act-programme")).toBe(true);
    expect(WIDGET_META["act-programme"]?.status).toBe("available");
    expect(isImplemented("act-values")).toBe(false);
    expect(WIDGET_META["act-values"]).toBeUndefined();
  });

  it("registers act-drop-anchor as a default ACT widget", () => {
    expect(isImplemented("act-drop-anchor")).toBe(true);
    expect(WIDGET_META["act-drop-anchor"].status).toBe("default");
    expect(WIDGET_META["act-drop-anchor"].toolKey).toBe("act");
  });

  it("registers act-observing-self and act-choice-point as available ACT widgets", () => {
    for (const id of ["act-observing-self", "act-choice-point"]) {
      expect(isImplemented(id)).toBe(true);
      expect(WIDGET_META[id].status).toBe("available");
      expect(WIDGET_META[id].toolKey).toBe("act");
    }
  });

  it("registers act-acceptance-prompt as an available widget", () => {
    expect(isImplemented("act-acceptance-prompt")).toBe(true);
    expect(WIDGET_META["act-acceptance-prompt"].status).toBe("available");
    expect(WIDGET_META["act-acceptance-prompt"].toolKey).toBe("act");
  });

  it("registers journal-week as an available widget", () => {
    expect(isImplemented("journal-week")).toBe(true);
    expect(WIDGET_META["journal-week"].status).toBe("available");
    expect(WIDGET_META["journal-week"].toolKey).toBe("journal");
  });

  it("no longer registers the removed journal widgets", () => {
    expect(isImplemented("journal-latest")).toBe(false);
    expect(isImplemented("journal-prompt")).toBe(false);
    expect(isImplemented("journal-resurface")).toBe(false);
    expect(WIDGET_META["journal-latest"]).toBeUndefined();
    expect(WIDGET_META["journal-prompt"]).toBeUndefined();
    expect(WIDGET_META["journal-resurface"]).toBeUndefined();
  });

  it("no longer registers the removed gratitude/grounding widgets", () => {
    for (const id of [
      "gratitude-resurface",
      "gratitude-prompt",
      "gratitude-week",
      "grounding-54321",
      "grounding-library",
    ]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it.each([["grounding-log", "grounding"]])(
    "registers %s as an available practice-tool widget",
    (id, toolKey) => {
      expect(isImplemented(id)).toBe(true);
      expect(WIDGET_META[id].status).toBe("available");
      expect(WIDGET_META[id].toolKey).toBe(toolKey);
    },
  );

  it("no longer registers the merged-away habits widgets", () => {
    for (const id of ["habits-quiet", "habits-one-deep"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers habits-today as a default habits widget", () => {
    expect(isImplemented("habits-today")).toBe(true);
    expect(WIDGET_META["habits-today"].status).toBe("default");
    expect(WIDGET_META["habits-today"].toolKey).toBe("habits");
  });

  it("no longer registers the merged-away sleep widgets", () => {
    for (const id of ["sleep-last-night", "sleep-7-nights", "sleep-notes", "sleep-wind-down"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers sleep-latest as a default sleep widget", () => {
    expect(isImplemented("sleep-latest")).toBe(true);
    expect(WIDGET_META["sleep-latest"].status).toBe("default");
    expect(WIDGET_META["sleep-latest"].toolKey).toBe("sleep");
  });

  it("no longer registers the merged-away meditation widgets", () => {
    for (const id of ["meditation-sit-time", "meditation-continue"]) {
      expect(isImplemented(id)).toBe(false);
      expect(WIDGET_META[id]).toBeUndefined();
    }
  });

  it("registers routines-today as an opt-in widget - available, never default-seeded", () => {
    expect(isImplemented("routines-today")).toBe(true);
    expect(WIDGET_META["routines-today"].toolKey).toBe("routines");
    // The exact flag difference to habits-today: habits-today is a
    // default-seeded widget ("default"); routines-today must stay "available"
    // (offered in the Add-Widget modal, never auto-added).
    expect(WIDGET_META["routines-today"].status).toBe("available");
    expect(WIDGET_META["habits-today"].status).toBe("default");
    expect(WIDGET_META["routines-today"].status).not.toBe(WIDGET_META["habits-today"].status);
  });

  it("keeps routines-today out of every auto-seeding surface", () => {
    // Onboarding's shared-tool widget offer (habits-today IS in this list).
    expect(SHARED_TOOL_WIDGET_IDS).not.toContain("routines-today");
    expect(SHARED_TOOL_WIDGET_IDS).toContain("habits-today");
    // Concern-based suggestions across every concern.
    expect(resolveConcernWidgetIds([...CONCERN_KEYS])).not.toContain("routines-today");
  });

  it("metaForWidget returns undefined for unknown ids", () => {
    expect(metaForWidget("nope")).toBeUndefined();
  });

  it("default widgets all carry a tint and a category", () => {
    for (const [id, meta] of Object.entries(WIDGET_META)) {
      expect({ id, tint: meta.tint }).toMatchObject({ tint: expect.any(String) });
      expect({ id, toolKey: meta.toolKey }).toMatchObject({ toolKey: expect.any(String) });
    }
  });

  // The registry is the dashboard catalogue (#972). `route` and `tier` are
  // required on WidgetMeta so a new id cannot be added without declaring where
  // its row goes and which tier renders it. Nothing reads them yet - this is
  // the expand step of an expand-contract.
  describe("dashboard catalogue", () => {
    it("every id declares a route and a tier", () => {
      for (const [id, meta] of Object.entries(WIDGET_META)) {
        expect({ id, route: meta.route }).toMatchObject({ route: expect.any(String) });
        expect({ id, tier: meta.tier }).toMatchObject({
          tier: expect.stringMatching(/^(tool|programme)$/),
        });
      }
    });

    it("every route resolves to a real Expo Router route", () => {
      // This is the assertion that earns its keep: the decided spec's row table
      // named `/tools/gratitude` and `/tools/routines`, neither of which the
      // router serves (`/tools/gratitude-log` and `/routines` do).
      for (const [id, meta] of Object.entries(WIDGET_META)) {
        expect({ id, route: meta.route, exists: APP_ROUTES.has(meta.route) }).toMatchObject({
          exists: true,
        });
      }
    });

    it("exactly two ids are the programme tier - CBT and ACT", () => {
      const programmeIds = Object.entries(WIDGET_META)
        .filter(([, meta]) => meta.tier === "programme")
        .map(([id]) => id)
        .sort();
      expect(programmeIds).toEqual(["act-programme", "cbt-programme"]);
    });

    it("the programme cards press to their module home", () => {
      expect(WIDGET_META["cbt-programme"].route).toBe("/modules/cbt");
      expect(WIDGET_META["act-programme"].route).toBe("/modules/act");
    });

    // S3 (#973) collapsed these three ids away. The route each one pointed at
    // is the route its survivor still points at, which is what made the
    // collapse a delete rather than a re-route - so the stored rows the
    // migration renamed land on the same screen they already opened.
    it.each([
      ["mood-trend", "mood-checkin", "/tools/check-in"],
      ["cbt-module-shortcut", "cbt-programme", "/modules/cbt"],
      ["act-module-shortcut", "act-programme", "/modules/act"],
    ])("%s is gone; %s survives it and still routes to %s", (retired, survivor, route) => {
      expect(isImplemented(retired)).toBe(false);
      expect(WIDGET_META[retired]).toBeUndefined();
      expect(WIDGET_META[survivor].route).toBe(route);
    });
  });
});
