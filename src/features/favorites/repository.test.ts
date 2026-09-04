import { addFavorite, listFavorites, removeFavorite } from "@/src/features/favorites/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

/** A chainable builder: every filter hands back the same chain, which resolves to `result`. */
function chain(result: { data?: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {};
  const self = () => builder;
  builder.select = jest.fn(self);
  builder.eq = jest.fn(self);
  builder.delete = jest.fn(self);
  builder.upsert = jest.fn(self);
  // Awaitable at any link: the whole chain resolves to `result`.
  (builder as unknown as { then: unknown }).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  const from = jest.fn(() => builder);
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { from, builder };
}

describe("favorites repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists the caller's rows as (kind, key) pairs", async () => {
    const { from, builder } = chain({
      data: [
        { kind: "tool", key: "mood" },
        { kind: "module", key: "cbt" },
      ],
      error: null,
    });

    await expect(listFavorites("u1")).resolves.toEqual([
      { kind: "tool", key: "mood" },
      { kind: "module", key: "cbt" },
    ]);
    expect(from).toHaveBeenCalledWith("favorites");
    expect(builder.select).toHaveBeenCalledWith("kind, key");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("adds idempotently: an upsert that ignores the duplicate rather than a bare insert", async () => {
    // A bare insert of a row already there is a 23505; `on conflict do nothing` is what
    // makes a double tap - or a retry - not an error (spec §4.1).
    const { builder } = chain({ error: null });

    await addFavorite("u1", "tool", "mood");

    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: "u1", kind: "tool", key: "mood" },
      { onConflict: "user_id,kind,key", ignoreDuplicates: true },
    );
  });

  it("removes by the full (user, kind, key) triple", async () => {
    const { builder } = chain({ error: null });

    await removeFavorite("u1", "module", "cbt");

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq.mock.calls).toEqual([
      ["user_id", "u1"],
      ["kind", "module"],
      ["key", "cbt"],
    ]);
  });

  it.each([
    ["listFavorites", () => listFavorites("u1")],
    ["addFavorite", () => addFavorite("u1", "tool", "mood")],
    ["removeFavorite", () => removeFavorite("u1", "tool", "mood")],
  ])("%s rethrows the PostgREST error so the mutation can roll back", async (_name, call) => {
    chain({ data: null, error: { message: "boom", code: "42501" } });

    await expect(call()).rejects.toEqual({ message: "boom", code: "42501" });
  });
});
