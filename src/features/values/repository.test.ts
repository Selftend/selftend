import { getValuesProfile, saveValuesProfile } from "@/src/features/values/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "v-1",
  user_id: "user-1",
  personal_values: [{ key: "honesty", tier: 1 }],
  priority_values: ["honesty"],
  updated_at: "2026-05-24T10:00:00.000Z",
};

const sampleMapped = {
  id: "v-1",
  userId: "user-1",
  personalValues: [{ key: "honesty", tier: 1 }],
  priorityValues: ["honesty"],
  updatedAt: "2026-05-24T10:00:00.000Z",
};

describe("values repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when getValuesProfile finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getValuesProfile("user-1")).resolves.toBeNull();
    expect(from).toHaveBeenCalledWith("values_profile");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("maps a row to ValuesProfile", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getValuesProfile("user-1")).resolves.toEqual(sampleMapped);
  });

  it("upserts on user_id and returns mapped profile", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await saveValuesProfile("user-1", {
      personalValues: [{ key: "honesty", tier: 1 }],
      priorityValues: ["honesty"],
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        personal_values: [{ key: "honesty", tier: 1 }],
        priority_values: ["honesty"],
      },
      { onConflict: "user_id" },
    );
    expect(result).toEqual(sampleMapped);
  });
});
