import { getACTProgramState, upsertACTProgramState } from "@/src/features/act/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const ROW = {
  user_id: "u1",
  active_principles: ["defusion", "values"],
  primary_concerns: ["anxiety"],
  myths_acknowledged: true,
  onboarding_completed_at: "2026-05-01T00:00:00.000Z",
  last_check_in_at: "2026-05-09T00:00:00.000Z",
  preferred_check_in_time: "08:00",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-09T00:00:00.000Z",
};

describe("program-state repository", () => {
  it("getACTProgramState maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqUser = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    const result = await getACTProgramState("u1");
    expect(result).toMatchObject({
      userId: "u1",
      mythsAcknowledged: true,
      activePrinciples: ["defusion", "values"],
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
  });

  it("getACTProgramState degrades to null on a missing-schema error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqUser = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    expect(await getACTProgramState("u1")).toBeNull();
  });

  it("upsertACTProgramState writes only present fields and maps the row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { insert } }));

    const result = await upsertACTProgramState("u1", {
      mythsAcknowledged: true,
      activePrinciples: ["defusion"],
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      myths_acknowledged: true,
      active_principles: ["defusion"],
    });
    expect(payload).not.toHaveProperty("primary_concerns");
    expect(payload).not.toHaveProperty("onboarding_completed_at");
    expect(payload).not.toHaveProperty("last_check_in_at");
    expect(payload).not.toHaveProperty("preferred_check_in_time");
    expect(result).toMatchObject({ userId: "u1", mythsAcknowledged: true });
  });

  it("upsertACTProgramState writes all patch fields when present", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { insert } }));

    await upsertACTProgramState("u1", {
      activePrinciples: ["defusion", "values"],
      primaryConcerns: ["anxiety"],
      mythsAcknowledged: true,
      onboardingCompletedAt: "2026-05-01T00:00:00.000Z",
      lastCheckInAt: "2026-05-09T00:00:00.000Z",
      preferredCheckInTime: "08:00",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      active_principles: ["defusion", "values"],
      primary_concerns: ["anxiety"],
      myths_acknowledged: true,
      onboarding_completed_at: "2026-05-01T00:00:00.000Z",
      last_check_in_at: "2026-05-09T00:00:00.000Z",
      preferred_check_in_time: "08:00",
    });
  });

  it("upsertACTProgramState returns null (not throw) on a missing-schema error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { insert } }));

    await expect(upsertACTProgramState("u1", { mythsAcknowledged: true })).resolves.toBeNull();
  });

  it("upsertACTProgramState throws a real (non-schema) error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { insert } }));

    await expect(upsertACTProgramState("u1", { mythsAcknowledged: true })).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("upsertACTProgramState omits myths_acknowledged when not in the patch", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { insert } }));

    await upsertACTProgramState("u1", { activePrinciples: ["defusion"] });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).not.toHaveProperty("myths_acknowledged");
  });

  it("getACTProgramState maps null array columns to empty arrays", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { ...ROW, active_principles: null, primary_concerns: null },
      error: null,
    });
    const eqUser = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_program_state: { select } }));

    const result = await getACTProgramState("u1");
    expect(result).toMatchObject({ activePrinciples: [], primaryConcerns: [] });
  });
});
