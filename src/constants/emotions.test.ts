import { DEFAULT_EMOTIONS, EMOTION_GROUPS, emotionOptions } from "@/src/constants/emotions";

const DIFFICULT_IDS = [
  "anxious",
  "sad",
  "angry",
  "ashamed",
  "guilty",
  "overwhelmed",
  "frustrated",
  "lonely",
  "fearful",
  "hopeless",
  "numb",
  "irritated",
];

describe("emotion valence metadata", () => {
  it("gives every emotion a valence of difficult or pleasant", () => {
    for (const emotion of DEFAULT_EMOTIONS) {
      expect(["difficult", "pleasant"]).toContain(emotion.valence);
    }
  });

  it("marks exactly the expected ids as difficult", () => {
    const actualDifficult = DEFAULT_EMOTIONS.filter((e) => e.valence === "difficult").map(
      (e) => e.id,
    );
    expect(new Set(actualDifficult)).toEqual(new Set(DIFFICULT_IDS));
  });

  it("marks everything else as pleasant", () => {
    const actualPleasant = DEFAULT_EMOTIONS.filter((e) => e.valence === "pleasant").map(
      (e) => e.id,
    );
    const expectedPleasant = DEFAULT_EMOTIONS.map((e) => e.id).filter(
      (id) => !DIFFICULT_IDS.includes(id),
    );
    expect(new Set(actualPleasant)).toEqual(new Set(expectedPleasant));
  });

  it("keeps the legacy emotionOptions array unchanged in order and length", () => {
    // Hardcoded fixture of today's exact check-in order. This guards the CRITICAL
    // invariant that the mood/check-in tool's flat order never changes: a comparison
    // against DEFAULT_EMOTIONS.map((e) => e.id) would be tautological (it IS that), so
    // an accidental reorder of DEFAULT_EMOTIONS would pass unnoticed. Comparing against
    // this literal makes such a reorder fail loudly.
    const EXPECTED_ORDER = [
      "happy",
      "excited",
      "loved",
      "inspired",
      "proud",
      "playful",
      "grateful",
      "hopeful",
      "relaxed",
      "content",
      "anxious",
      "sad",
      "angry",
      "ashamed",
      "guilty",
      "overwhelmed",
      "frustrated",
      "lonely",
      "fearful",
      "hopeless",
      "numb",
      "irritated",
    ];
    expect(emotionOptions).toEqual(EXPECTED_ORDER);
    expect(emotionOptions).toHaveLength(22);
  });

  it("exposes EMOTION_GROUPS with difficult first, then pleasant", () => {
    expect(EMOTION_GROUPS).toHaveLength(2);
    expect(EMOTION_GROUPS[0].valence).toBe("difficult");
    expect(EMOTION_GROUPS[1].valence).toBe("pleasant");
    expect(new Set(EMOTION_GROUPS[0].ids)).toEqual(new Set(DIFFICULT_IDS));
    expect(new Set(EMOTION_GROUPS[1].ids)).toEqual(
      new Set(emotionOptions.filter((id) => !DIFFICULT_IDS.includes(id))),
    );
    // Every id in EMOTION_GROUPS combined must cover all 22 emotions with no overlap.
    const combined = [...EMOTION_GROUPS[0].ids, ...EMOTION_GROUPS[1].ids];
    expect(new Set(combined).size).toBe(22);
    expect(combined).toHaveLength(22);
  });
});
