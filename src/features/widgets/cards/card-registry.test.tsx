import { CARD_REPLICAS } from "@/src/features/widgets/cards/card-registry";
import { CARD_IDS } from "@/src/features/widgets/snapshot-types";
import { WIDGET_META } from "@/src/features/home/widget-registry";

describe("card replica registry", () => {
  // Asserted against WIDGET_META, not WIDGET_REGISTRY (#975). The Android launcher
  // widgets mirror the dashboard CATALOGUE; they have never mirrored the in-app card
  // components, and the two only looked identical while every id happened to have a
  // card. The tool tier renders rows with no component at all, so pinning to the
  // registry would now delete an Android card every time a tool row lands - silently,
  // since the launcher surface has no other test that would notice.
  it("covers exactly the dashboard catalogue (anti-drift guard)", () => {
    expect(Object.keys(CARD_REPLICAS).sort()).toEqual(Object.keys(WIDGET_META).sort());
    expect([...CARD_IDS].sort()).toEqual(Object.keys(WIDGET_META).sort());
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
