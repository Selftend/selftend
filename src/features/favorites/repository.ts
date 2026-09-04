import type { FavoriteKind } from "@/src/features/favorites/items";
import { requireSupabase } from "@/src/lib/supabase";

/**
 * One starred item. The row also carries `id` and `created_at`, and neither is read:
 * Home orders by the catalogue array, not by when the star was pressed, so the pair is
 * the whole fact.
 */
export interface Favorite {
  kind: FavoriteKind;
  key: string;
}

interface FavoriteRow {
  kind: FavoriteKind;
  key: string;
}

export async function listFavorites(userId: string): Promise<Favorite[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("favorites").select("kind, key").eq("user_id", userId);
  if (error) throw error;
  return (data as FavoriteRow[]).map((row) => ({ kind: row.kind, key: row.key }));
}

/**
 * Idempotent add (spec §4.1): `insert … on conflict do nothing`, which PostgREST spells
 * as an upsert that ignores duplicates. A bare insert of a row already there is a raw
 * `23505`, and "already starred" is not an error a second tap should surface.
 */
export async function addFavorite(userId: string, kind: FavoriteKind, key: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("favorites")
    .upsert(
      { user_id: userId, kind, key },
      { onConflict: "user_id,kind,key", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFavorite(
  userId: string,
  kind: FavoriteKind,
  key: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("key", key);
  if (error) throw error;
}
