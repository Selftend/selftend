import { requireSupabase } from "@/src/lib/supabase";

/**
 * The one-row recency read behind every `Last {{when}}` stat (#990).
 *
 * Home's tool tier renders fourteen one-line stats, and eleven of them are a single
 * timestamp. S5b (#976) sourced those from each tool's own list hook on the reasoning
 * that the cache is shared with the tool screen - true only *after* the user has
 * visited that screen. On a cold home load, which is the first screen a signed-in user
 * sees, nothing is cached, so home paid for up to 500 fully decrypted rows per row to
 * read one `created_at`.
 *
 * ADR-0001 measured why the narrow read is close to free on these tables. `app.decrypt_text`
 * is `STABLE`, so the planner flattens the decrypting view and prunes output expressions
 * nobody selected: **a projection that names no encrypted column costs zero decrypt calls**,
 * and the `LIMIT` is pushed below the decrypt *provided the ordering and filtering are
 * themselves plaintext*. Both conditions are load-bearing here, which is why `column`,
 * `offsetColumn` and every `match` key must be a pass-through column on the base table
 * rather than an `app.decrypt_text(...)` output of the view. Order by a decrypted value
 * and every candidate row decrypts before the `LIMIT` can apply.
 *
 * The reads also stop being capped, which fixes three silent truncations S5b documented
 * and accepted: activities ordered by `scheduled_at` could push a recent completion past
 * the 500-row cap, self-care's 14-row `log_date` window could exclude the newest
 * `created_at`, and a user with 30 newer connection logs of other techniques read as
 * having never dropped anchor.
 */
export interface LatestActivity {
  at: string;
  /**
   * The UTC offset captured with the instant, or `null` when the table records none -
   * in which case the caller renders in the viewer's current zone. Most tables behind
   * these rows have no offset column at all; that is the honest limit of what they
   * recorded, not something to paper over.
   */
  offsetMinutes: number | null;
}

export interface LatestActivityQuery {
  /** The decrypting view, same name the list reads use; RLS lives on the base table under it. */
  table: string;
  userId: string;
  /** Plaintext timestamp column to order by. Never a decrypted one - see the note above. */
  column: string;
  /** Plaintext captured-offset column, when the table has one. */
  offsetColumn?: string;
  /** Extra plaintext equality filters, e.g. `{ technique: "dropAnchor" }`. */
  match?: Record<string, string>;
  /** Plaintext columns that must be null, e.g. `archived_at` for a non-archived record. */
  isNull?: string[];
}

/**
 * The newest row's timestamp, or `null` when the tool holds nothing.
 *
 * Callers surface `null` as "Nothing yet" and a rejected promise as "not loaded", so this
 * throws rather than swallowing errors: a failed fetch must not read as an empty history.
 */
export async function fetchLatestActivity({
  table,
  userId,
  column,
  offsetColumn,
  match = {},
  isNull = [],
}: LatestActivityQuery): Promise<LatestActivity | null> {
  const client = requireSupabase();
  let query = client
    .from(table)
    .select(offsetColumn ? `${column}, ${offsetColumn}` : column)
    .eq("user_id", userId);

  for (const [filterColumn, value] of Object.entries(match)) {
    query = query.eq(filterColumn, value);
  }
  for (const nullColumn of isNull) {
    query = query.is(nullColumn, null);
  }

  const { data, error } = await query
    // Descending order puts NULLs first in Postgres, so a nullable timestamp
    // (`completed_at`) would otherwise return a row that never happened. Harmless on the
    // NOT NULL columns, and it keeps the ordering index usable either way.
    .not(column, "is", null)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const row = data as Record<string, unknown> | null;
  const at = row?.[column];
  if (typeof at !== "string") return null;

  const offset = offsetColumn ? row?.[offsetColumn] : null;
  return { at, offsetMinutes: typeof offset === "number" ? offset : null };
}
