import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import {
  deleteEmotionPreference,
  getEmotionsSeeded,
  insertDefaultEmotions,
  listEmotionPreferences,
  markEmotionsSeeded,
  setEmotionOrder,
  upsertEmotionPreference,
} from "@/src/features/mood/emotion-preferences-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
  isMissingColumnError: (e: { code?: string } | null) =>
    e?.code === "42703" || e?.code === "PGRST204",
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ROW = {
  id: "pref-1",
  user_id: "user-1",
  emotion_id: "emotion-joy",
  name: "Joy",
  emoji: "😊",
  position: 0,
  removed: false,
  is_custom: false,
  created_at: "2026-05-10T08:00:00.000Z",
  updated_at: "2026-05-10T08:00:00.000Z",
};

const MAPPED = {
  id: "pref-1",
  userId: "user-1",
  emotionId: "emotion-joy",
  name: "Joy",
  emoji: "😊",
  position: 0,
  removed: false,
  isCustom: false,
};

describe("emotion-preferences-repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // listEmotionPreferences
  // -------------------------------------------------------------------------

  describe("listEmotionPreferences", () => {
    it("queries by user_id, orders by position asc, and maps rows", async () => {
      const order = jest.fn().mockResolvedValue({ data: [ROW], error: null });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(listEmotionPreferences("user-1")).resolves.toEqual([MAPPED]);

      expect(from).toHaveBeenCalledWith("emotion_preferences");
      expect(select).toHaveBeenCalledWith("*");
      expect(eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(order).toHaveBeenCalledWith("position", { ascending: true });
    });

    it("returns an empty array when the table has no rows for the user", async () => {
      const order = jest.fn().mockResolvedValue({ data: [], error: null });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(listEmotionPreferences("user-1")).resolves.toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const order = jest.fn().mockResolvedValue({ data: null, error: new Error("db error") });
      const eq = jest.fn(() => ({ order }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(listEmotionPreferences("user-1")).rejects.toThrow("db error");
    });
  });

  // -------------------------------------------------------------------------
  // upsertEmotionPreference
  // -------------------------------------------------------------------------

  // emotion_preferences is a transparent encrypted view; a view cannot be the target of
  // INSERT ... ON CONFLICT, so the repo .insert()s and the view's trigger resolves the
  // (user_id, emotion_id) merge against the base table's real unique constraint.
  describe("upsertEmotionPreference", () => {
    it("inserts the payload and maps the returned row", async () => {
      const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(
        upsertEmotionPreference("user-1", {
          emotionId: "emotion-joy",
          name: "Joy",
          emoji: "😊",
          position: 0,
          removed: false,
          isCustom: false,
        }),
      ).resolves.toEqual(MAPPED);

      expect(from).toHaveBeenCalledWith("emotion_preferences");
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          emotion_id: "emotion-joy",
          name: "Joy",
          emoji: "😊",
          position: 0,
          removed: false,
          is_custom: false,
        }),
      );
    });

    it("omits undefined optional fields from the insert payload", async () => {
      const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await upsertEmotionPreference("user-1", { emotionId: "emotion-joy", removed: true });

      const payload = (insert as jest.Mock).mock.calls[0][0];
      expect(payload).toEqual({ user_id: "user-1", emotion_id: "emotion-joy", removed: true });
      // name, emoji, position, is_custom must NOT be present
      expect(payload).not.toHaveProperty("name");
      expect(payload).not.toHaveProperty("emoji");
      expect(payload).not.toHaveProperty("position");
      expect(payload).not.toHaveProperty("is_custom");
    });

    it("throws when Supabase returns an error", async () => {
      const single = jest.fn().mockResolvedValue({ data: null, error: new Error("insert failed") });
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(upsertEmotionPreference("user-1", { emotionId: "emotion-joy" })).rejects.toThrow(
        "insert failed",
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteEmotionPreference
  // -------------------------------------------------------------------------

  describe("deleteEmotionPreference", () => {
    it("deletes the row matching user_id and emotion_id", async () => {
      const eqEmotionId = jest.fn().mockResolvedValue({ error: null });
      const eqUserId = jest.fn(() => ({ eq: eqEmotionId }));
      const del = jest.fn(() => ({ eq: eqUserId }));
      const from = jest.fn(() => ({ delete: del }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(deleteEmotionPreference("user-1", "emotion-joy")).resolves.toBeUndefined();

      expect(from).toHaveBeenCalledWith("emotion_preferences");
      expect(eqUserId).toHaveBeenCalledWith("user_id", "user-1");
      expect(eqEmotionId).toHaveBeenCalledWith("emotion_id", "emotion-joy");
    });

    it("throws when Supabase returns an error", async () => {
      const eqEmotionId = jest.fn().mockResolvedValue({ error: new Error("delete failed") });
      const eqUserId = jest.fn(() => ({ eq: eqEmotionId }));
      const del = jest.fn(() => ({ eq: eqUserId }));
      const from = jest.fn(() => ({ delete: del }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(deleteEmotionPreference("user-1", "emotion-joy")).rejects.toThrow(
        "delete failed",
      );
    });
  });

  // -------------------------------------------------------------------------
  // setEmotionOrder
  // -------------------------------------------------------------------------

  describe("setEmotionOrder", () => {
    it("inserts an array payload with position = index for each id", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(
        setEmotionOrder("user-1", ["emotion-joy", "emotion-sad", "emotion-anger"]),
      ).resolves.toBeUndefined();

      expect(from).toHaveBeenCalledWith("emotion_preferences");
      expect(insert).toHaveBeenCalledWith([
        { user_id: "user-1", emotion_id: "emotion-joy", position: 0 },
        { user_id: "user-1", emotion_id: "emotion-sad", position: 1 },
        { user_id: "user-1", emotion_id: "emotion-anger", position: 2 },
      ]);
    });

    it("is a no-op when orderedIds is empty", async () => {
      const from = jest.fn();
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(setEmotionOrder("user-1", [])).resolves.toBeUndefined();
      expect(from).not.toHaveBeenCalled();
    });

    it("throws when Supabase returns an error", async () => {
      const insert = jest.fn().mockResolvedValue({ error: new Error("order failed") });
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(setEmotionOrder("user-1", ["emotion-joy"])).rejects.toThrow("order failed");
    });
  });

  // -------------------------------------------------------------------------
  // getEmotionsSeeded
  // -------------------------------------------------------------------------

  describe("getEmotionsSeeded", () => {
    it("returns true when the user_preferences row has emotions_seeded true", async () => {
      const maybeSingle = jest
        .fn()
        .mockResolvedValue({ data: { emotions_seeded: true }, error: null });
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(getEmotionsSeeded("user-1")).resolves.toBe(true);

      expect(from).toHaveBeenCalledWith("user_preferences");
      expect(select).toHaveBeenCalledWith("emotions_seeded");
      expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("returns false when emotions_seeded is false", async () => {
      const maybeSingle = jest
        .fn()
        .mockResolvedValue({ data: { emotions_seeded: false }, error: null });
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(getEmotionsSeeded("user-1")).resolves.toBe(false);
    });

    it("returns false when there is no user_preferences row", async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(getEmotionsSeeded("user-1")).resolves.toBe(false);
    });

    it("returns false (degrades) ONLY for a missing-column error (pre-migration)", async () => {
      const maybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: "42703", message: "column missing" } });
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(getEmotionsSeeded("user-1")).resolves.toBe(false);
    });

    it("rethrows a non-missing-column error (so a transient failure does not re-seed)", async () => {
      const maybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: "08006", message: "connection failure" } });
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      const from = jest.fn(() => ({ select }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(getEmotionsSeeded("user-1")).rejects.toMatchObject({ code: "08006" });
    });
  });

  // -------------------------------------------------------------------------
  // markEmotionsSeeded
  // -------------------------------------------------------------------------

  describe("markEmotionsSeeded", () => {
    it("upserts emotions_seeded:true onConflict user_id", async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      const from = jest.fn(() => ({ upsert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(markEmotionsSeeded("user-1")).resolves.toBeUndefined();

      expect(from).toHaveBeenCalledWith("user_preferences");
      expect(upsert).toHaveBeenCalledWith(
        { user_id: "user-1", emotions_seeded: true },
        { onConflict: "user_id" },
      );
    });
  });

  // -------------------------------------------------------------------------
  // insertDefaultEmotions
  // -------------------------------------------------------------------------

  describe("insertDefaultEmotions", () => {
    it("inserts a row per DEFAULT_EMOTIONS with emotion_id, position, is_custom:false", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(insertDefaultEmotions("user-1")).resolves.toBeUndefined();

      expect(from).toHaveBeenCalledWith("emotion_preferences");
      const payload = (insert as jest.Mock).mock.calls[0][0];
      expect(payload).toEqual(
        DEFAULT_EMOTIONS.map((emotion, index) => ({
          user_id: "user-1",
          emotion_id: emotion.id,
          position: index,
          is_custom: false,
        })),
      );
    });

    it("throws when Supabase returns an error", async () => {
      const insert = jest.fn().mockResolvedValue({ error: new Error("insert failed") });
      const from = jest.fn(() => ({ insert }));
      mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<
        typeof requireSupabase
      >);

      await expect(insertDefaultEmotions("user-1")).rejects.toThrow("insert failed");
    });
  });
});
