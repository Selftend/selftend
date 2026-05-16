import {
  getFavoriteGratitudeEntries,
  getGratitudeFrequencyBuckets,
  getGratitudeThemes,
} from "@/src/features/gratitude/insights";
import type { GratitudeEntry } from "@/src/features/gratitude/types";

function entry(partial: Partial<GratitudeEntry>): GratitudeEntry {
  return {
    id: partial.id ?? "g-1",
    userId: "user-1",
    level: 3,
    items: [],
    note: "",
    loggedAt: "2026-05-15T08:00:00.000Z",
    createdAt: "2026-05-15T08:00:00.000Z",
    updatedAt: "2026-05-15T08:00:00.000Z",
    events: [],
    goodMoment: "",
    missIfGone: "",
    hiddenGood: "",
    lifeItems: [],
    starred: false,
    ...partial,
  };
}

describe("gratitude insights", () => {
  it("counts entries across recent day buckets", () => {
    const buckets = getGratitudeFrequencyBuckets(
      [
        entry({ id: "g-1", loggedAt: "2026-05-14T08:00:00.000Z" }),
        entry({ id: "g-2", loggedAt: "2026-05-14T18:00:00.000Z" }),
        entry({ id: "g-3", loggedAt: "2026-05-15T08:00:00.000Z" }),
      ],
      new Date("2026-05-15T12:00:00.000Z"),
      3,
    );

    expect(buckets.map((bucket) => bucket.count)).toEqual([0, 2, 1]);
  });

  it("extracts common private themes from gratitude fields", () => {
    const themes = getGratitudeThemes([
      entry({
        items: ["Warm coffee", "Coffee with a friend"],
        lifeItems: ["Quiet home"],
        goodMoment: "Friend called",
      }),
    ]);

    expect(themes.slice(0, 3)).toEqual([
      { word: "coffee", count: 2 },
      { word: "friend", count: 2 },
      { word: "called", count: 1 },
    ]);
  });

  it("sorts favorite entries newest first", () => {
    const favorites = getFavoriteGratitudeEntries([
      entry({ id: "old", starred: true, loggedAt: "2026-05-10T08:00:00.000Z" }),
      entry({ id: "plain", starred: false, loggedAt: "2026-05-15T08:00:00.000Z" }),
      entry({ id: "new", starred: true, loggedAt: "2026-05-15T08:00:00.000Z" }),
    ]);

    expect(favorites.map((favorite) => favorite.id)).toEqual(["new", "old"]);
  });
});
