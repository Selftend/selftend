import { CARD_REPLICAS } from "@/src/features/widgets/cards/card-registry";
import { CARD_IDS } from "@/src/features/widgets/snapshot-types";
import { WIDGET_REGISTRY, WIDGET_META } from "@/src/features/home/widget-registry";

describe("card replica registry", () => {
  it("covers exactly the in-app widget registry (anti-drift guard)", () => {
    expect(Object.keys(CARD_REPLICAS).sort()).toEqual(Object.keys(WIDGET_REGISTRY).sort());
    expect([...CARD_IDS].sort()).toEqual(Object.keys(WIDGET_REGISTRY).sort());
  });
  it("uses the in-app meta tint for every card", () => {
    // Icons intentionally NOT asserted against WIDGET_META: two cards render a
    // different icon than their meta (habits-today: directions-run, journal-week:
    // edit-note) and replicas follow the rendered card.
    for (const id of CARD_IDS) {
      expect(CARD_REPLICAS[id].tint).toBe(WIDGET_META[id].tint);
    }
  });
});
