import type { Favorite, FavoriteKind } from "@/src/features/favorites/items";
import { requireSupabase } from "@/src/lib/supabase";

interface FavoriteRow {
  kind: FavoriteKind;
  key: string;
}

/**
 * `public.favorites` (#1953): `(user_id, kind, key)`, unique on the three, RLS-scoped to
 * the caller. No RPC and no security definer — add is an upsert that ignores a duplicate,
 * remove is a delete, both under the caller's own policy.
 */
export async function listFavorites(userId: string): Promise<Favorite[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("favorites").select("kind, key").eq("user_id", userId);
  if (error) throw error;
  return (data as FavoriteRow[]).map((row) => ({ kind: row.kind, key: row.key }));
}

/**
 * Idempotent. A bare `insert` of a row that already exists is a `23505` unique violation,
 * so this is an upsert that IGNORES the duplicate rather than updating it (there is
 * nothing to update — the row is its own identity).
 */
export async function addFavorite(userId: string, kind: FavoriteKind, key: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("favorites")
    .upsert(
      { user_id: userId, kind, key },
      { onConflict: "user_id,kind,key", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFavorite(userId: string, kind: FavoriteKind, key: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("key", key);
  if (error) throw error;
}
