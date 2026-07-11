import { requireSupabase } from "@/src/lib/supabase";

type Client = ReturnType<typeof requireSupabase>;

// A genuine schema-cache miss means "ACT isn't migrated yet" → reads degrade to empty.
// A bare "act_" substring match would swallow real errors (e.g. a constraint violation
// naming an act_ table), so match only the specific PostgREST codes / schema-cache text.
export function isMissingACTSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message, hint } = error as { code?: unknown; message?: unknown; hint?: unknown };
  if (code === "PGRST205" || code === "PGRST204") return true;
  return [message, hint].some((v) => typeof v === "string" && v.includes("schema cache"));
}

// Reads degrade to a safe empty value when the ACT schema isn't migrated yet.
export async function selectList<Row, T>(
  run: (client: Client) => PromiseLike<{ data: Row[] | null; error: unknown }>,
  map: (row: Row) => T,
): Promise<T[]> {
  const client = requireSupabase();
  const { data, error } = await run(client);
  if (error) {
    if (isMissingACTSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map(map);
}

export async function selectMaybe<Row, T>(
  run: (client: Client) => PromiseLike<{ data: Row | null; error: unknown }>,
  map: (row: Row) => T,
): Promise<T | null> {
  const client = requireSupabase();
  const { data, error } = await run(client);
  if (error) {
    if (isMissingACTSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return map(data);
}

// Writes never degrade — a failed write must surface.
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
