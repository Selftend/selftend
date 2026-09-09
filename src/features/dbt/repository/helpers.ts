import { requireSupabase } from "@/src/lib/supabase";

type Client = ReturnType<typeof requireSupabase>;

/**
 * A genuine schema-cache miss means "DBT isn't migrated yet" → reads degrade to
 * empty. ACT's twin is `isMissingACTSchemaError`; it is copied rather than
 * imported because it is ACT-named and #1992 §9 says not to reach into another
 * module's repository for it. Match only the specific PostgREST codes /
 * schema-cache text - a bare `dbt_` substring would swallow real errors.
 */
export function isMissingDbtSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message, hint } = error as { code?: unknown; message?: unknown; hint?: unknown };
  if (code === "PGRST205" || code === "PGRST204") return true;
  return [message, hint].some((v) => typeof v === "string" && v.includes("schema cache"));
}

export async function selectList<Row, T>(
  run: (client: Client) => PromiseLike<{ data: Row[] | null; error: unknown }>,
  map: (row: Row) => T,
): Promise<T[]> {
  const client = requireSupabase();
  const { data, error } = await run(client);
  if (error) {
    if (isMissingDbtSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map(map);
}

/**
 * An exact `head` count, degrading to 0 when DBT is not migrated yet. The module
 * home's two stats are head counts and never `list.length` (#1378, #1991):
 * `head: true` fetches no rows, so nothing decrypts.
 */
export async function countRows(
  run: (client: Client) => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await run(client);
  if (error) {
    if (isMissingDbtSchemaError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export async function selectMaybe<Row, T>(
  run: (client: Client) => PromiseLike<{ data: Row | null; error: unknown }>,
  map: (row: Row) => T,
): Promise<T | null> {
  const client = requireSupabase();
  const { data, error } = await run(client);
  if (error) {
    if (isMissingDbtSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return map(data);
}

// Writes never degrade - a failed write must surface.
export async function writeSingle<Row, T>(
  run: (client: Client) => PromiseLike<{ data: Row | null; error: unknown }>,
  map: (row: Row) => T,
): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await run(client);
  if (error) throw error;
  return map(data as Row);
}

export async function mutateVoid(
  run: (client: Client) => PromiseLike<{ error: unknown }>,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await run(client);
  if (error) throw error;
}

/** Free text is sanitised exactly once, on write, and trimmed; absent means empty. */
export function optionalText(value: string | undefined, sanitize: (v: string) => string) {
  return sanitize(value ?? "").trim();
}
