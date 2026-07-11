import {
  isMissingACTSchemaError,
  selectList,
  selectMaybe,
  writeSingle,
  mutateVoid,
} from "@/src/features/act/repository/helpers";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));

const mockRequireSupabase = jest.mocked(requireSupabase);
const fakeClient = {} as ReturnType<typeof requireSupabase>;

beforeEach(() => {
  mockRequireSupabase.mockReturnValue(fakeClient);
});

const schemaCacheError = { code: "PGRST205", message: "act_x not found" };
const otherSchemaError = { code: "PGRST204", message: "col missing" };
const hintSchemaError = { code: "XX000", hint: "reload the schema cache" };
const realError = { code: "23505", message: "duplicate key" };

describe("isMissingACTSchemaError", () => {
  it.each([
    ["PGRST205 code", schemaCacheError, true],
    ["PGRST204 code", otherSchemaError, true],
    ["schema-cache hint", hintSchemaError, true],
    ["real constraint error", realError, false],
    ["null", null, false],
    ["string", "boom", false],
  ])("%s -> %s", (_label, error, expected) => {
    expect(isMissingACTSchemaError(error)).toBe(expected);
  });
});

describe("selectList", () => {
  const map = (row: { n: number }) => row.n;

  it("maps rows on success", async () => {
    const run = jest.fn().mockResolvedValue({ data: [{ n: 1 }, { n: 2 }], error: null });
    expect(await selectList(run, map)).toEqual([1, 2]);
    expect(run).toHaveBeenCalledWith(fakeClient);
  });

  it("returns [] when data is null", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: null });
    expect(await selectList(run, map)).toEqual([]);
  });

  it("degrades to [] on a missing-schema error", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: schemaCacheError });
    expect(await selectList(run, map)).toEqual([]);
  });

  it("throws a real error", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: realError });
    await expect(selectList(run, map)).rejects.toBe(realError);
  });
});

describe("selectMaybe", () => {
  const map = (row: { n: number }) => row.n;

  it("maps a row on success", async () => {
    const run = jest.fn().mockResolvedValue({ data: { n: 7 }, error: null });
    expect(await selectMaybe(run, map)).toBe(7);
  });

  it("returns null when data is null", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: null });
    expect(await selectMaybe(run, map)).toBeNull();
  });

  it("degrades to null on a missing-schema error", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: schemaCacheError });
    expect(await selectMaybe(run, map)).toBeNull();
  });

  it("throws a real error", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: realError });
    await expect(selectMaybe(run, map)).rejects.toBe(realError);
  });
});

describe("writeSingle", () => {
  const map = (row: { n: number }) => row.n;

  it("maps the returned row", async () => {
    const run = jest.fn().mockResolvedValue({ data: { n: 3 }, error: null });
    expect(await writeSingle(run, map)).toBe(3);
  });

  it("throws on any error (writes never degrade)", async () => {
    const run = jest.fn().mockResolvedValue({ data: null, error: schemaCacheError });
    await expect(writeSingle(run, map)).rejects.toBe(schemaCacheError);
  });
});

describe("mutateVoid", () => {
  it("resolves on success", async () => {
    const run = jest.fn().mockResolvedValue({ error: null });
    await expect(mutateVoid(run)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const run = jest.fn().mockResolvedValue({ error: realError });
    await expect(mutateVoid(run)).rejects.toBe(realError);
  });
});
