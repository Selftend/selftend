import {
  PILLAR_STRATEGIES,
  REVIEW_LINKS,
  SHARED_TOOLS_BY_PILLAR,
  type Pillar,
} from "./cbt-home-config";

const PILLARS: Pillar[] = ["think", "act", "be"];

describe("PILLAR_STRATEGIES", () => {
  it("covers exactly the three pillars", () => {
    expect(Object.keys(PILLAR_STRATEGIES).sort()).toEqual(["act", "be", "think"]);
  });

  it.each(PILLARS)("has unique strategy keys within the %s pillar", (pillar) => {
    const keys = PILLAR_STRATEGIES[pillar].map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(PILLARS)("has a defined route and non-empty label/desc/help keys for %s", (pillar) => {
    for (const strategy of PILLAR_STRATEGIES[pillar]) {
      expect(strategy.route).toBeTruthy();
      expect(strategy.labelKey.length).toBeGreaterThan(0);
      expect(strategy.descKey.length).toBeGreaterThan(0);
      expect(strategy.helpKey.length).toBeGreaterThan(0);
      expect(strategy.icon.length).toBeGreaterThan(0);
    }
  });
});

describe("SHARED_TOOLS_BY_PILLAR", () => {
  it("covers exactly the three pillars", () => {
    expect(Object.keys(SHARED_TOOLS_BY_PILLAR).sort()).toEqual(["act", "be", "think"]);
  });

  it("has globally unique shared-tool keys", () => {
    const keys = PILLARS.flatMap((pillar) =>
      SHARED_TOOLS_BY_PILLAR[pillar].map((tool) => tool.key),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  // Every shared tool is now a plain link, so `route` is the one field the row
  // reads on press - a blank one would be a chip that goes nowhere.
  it("gives every shared tool a route, a label and an icon", () => {
    for (const pillar of PILLARS) {
      for (const tool of SHARED_TOOLS_BY_PILLAR[pillar]) {
        expect(tool.route).toBeTruthy();
        expect(tool.labelKey.length).toBeGreaterThan(0);
        expect(tool.icon.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("REVIEW_LINKS", () => {
  it("has unique keys and complete metadata", () => {
    const keys = REVIEW_LINKS.map((link) => link.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const link of REVIEW_LINKS) {
      expect(link.route).toBeTruthy();
      expect(link.labelKey.length).toBeGreaterThan(0);
      expect(link.descKey.length).toBeGreaterThan(0);
      expect(link.icon.length).toBeGreaterThan(0);
    }
  });
});
