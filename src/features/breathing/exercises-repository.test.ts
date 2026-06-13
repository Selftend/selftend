import {
  listBreathingExercises,
  saveBreathingExercise,
  deleteBreathingExercise,
} from "@/src/features/breathing/exercises-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

const row = {
  id: "e-1",
  user_id: "user-1",
  name: "Evening wind-down",
  inhale_seconds: 5.5,
  hold_in_seconds: 0,
  exhale_seconds: 5.5,
  hold_out_seconds: 0,
  cycles: 6,
  color: "aqua",
  created_at: "2026-06-01T08:00:00.000Z",
  updated_at: "2026-06-01T08:00:00.000Z",
};

const input = {
  name: "  Evening wind-down  ",
  inhaleSeconds: 5.5,
  holdInSeconds: 0,
  exhaleSeconds: 5.5,
  holdOutSeconds: 0,
  cycles: 6,
  color: "aqua" as const,
};

describe("breathing exercises repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("inserts a new exercise, trims the name, maps the row to camelCase", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const selectAfter = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await saveBreathingExercise("user-1", input);

    expect(from).toHaveBeenCalledWith("breathing_exercises");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Evening wind-down",
        inhale_seconds: 5.5,
        exhale_seconds: 5.5,
        cycles: 6,
        color: "aqua",
      }),
    );
    expect(result).toMatchObject({ id: "e-1", userId: "user-1", inhaleSeconds: 5.5, cycles: 6 });
  });

  it("updates when an id is supplied (scoped to user_id + id)", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const selectAfter = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select: selectAfter }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveBreathingExercise("user-1", input, "e-1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Evening wind-down" }));
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "e-1");
  });

  it("lists exercises for a user, newest first", async () => {
    const order = jest.fn().mockResolvedValue({ data: [row], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listBreathingExercises("user-1");

    expect(from).toHaveBeenCalledWith("breathing_exercises");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "e-1", name: "Evening wind-down" });
  });

  it("deletes scoped to user_id + id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteBreathingExercise("user-1", "e-1");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "e-1");
  });
});
