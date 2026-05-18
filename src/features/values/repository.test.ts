import { listValuesProfiles, upsertValuesProfile } from "@/src/features/values/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "v-1",
  user_id: "user-1",
  life_domain: "health",
  importance_rating: 9,
  satisfaction_rating: 5,
  domain_note: "could move more",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("values repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists profiles for a user", async () => {
    const eq = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listValuesProfiles("user-1");
    expect(result[0].lifeDomain).toBe("health");
    expect(from).toHaveBeenCalledWith("values_profile");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("upserts a profile on (user_id, life_domain) and trims the note", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await upsertValuesProfile("user-1", {
      lifeDomain: "health",
      importanceRating: 9,
      satisfactionRating: 5,
      domainNote: "  could move more  ",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        life_domain: "health",
        importance_rating: 9,
        satisfaction_rating: 5,
        domain_note: "could move more",
      },
      { onConflict: "user_id,life_domain" },
    );
  });
});
