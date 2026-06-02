import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { requireSupabase } from "@/src/lib/supabase";

// ---------------------------------------------------------------------------
// Row type (DB shape, snake_case)
// ---------------------------------------------------------------------------

interface EmotionPreferenceRow {
  id: string;
  user_id: string;
  emotion_id: string;
  name: string | null;
  emoji: string | null;
  position: number;
  removed: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Domain type (camelCase)
// ---------------------------------------------------------------------------

export interface EmotionPreference {
  id: string;
  userId: string;
  emotionId: string;
  name: string | null;
  emoji: string | null;
  position: number;
  removed: boolean;
  isCustom: boolean;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRow(row: EmotionPreferenceRow): EmotionPreference {
  return {
    id: row.id,
    userId: row.user_id,
    emotionId: row.emotion_id,
    name: row.name,
    emoji: row.emoji,
    position: row.position,
    removed: row.removed,
    isCustom: row.is_custom,
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function listEmotionPreferences(userId: string): Promise<EmotionPreference[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("emotion_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as EmotionPreferenceRow[]).map(mapRow);
}

// ---------------------------------------------------------------------------
// Default seeding (mirrors widget seeding in src/features/home)
// ---------------------------------------------------------------------------

// Whether this user's default emotions have already been seeded. Used to keep an
// emptied list empty instead of re-seeding. Degrades to false if the column is
// missing (pre-migration).
export async function getEmotionsSeeded(userId: string): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .select("emotions_seeded")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { emotions_seeded?: boolean } | null)?.emotions_seeded);
}

// Best-effort marker that seeding has run; ignores failures (e.g. column missing pre-migration).
export async function markEmotionsSeeded(userId: string): Promise<void> {
  const client = requireSupabase();
  await client
    .from("user_preferences")
    .upsert({ user_id: userId, emotions_seeded: true }, { onConflict: "user_id" });
}

// Insert the default emotions as real rows for a user. name/emoji are left NULL
// so they resolve from constants/i18n unless the user overrides; removed defaults
// to false. No-op when there are no defaults to seed.
export async function insertDefaultEmotions(userId: string): Promise<void> {
  if (DEFAULT_EMOTIONS.length === 0) return;
  const client = requireSupabase();
  const payload = DEFAULT_EMOTIONS.map((emotion, index) => ({
    user_id: userId,
    emotion_id: emotion.id,
    position: index,
    is_custom: false,
  }));
  const { error } = await client.from("emotion_preferences").insert(payload);
  if (error) throw error;
}

export interface UpsertEmotionPreferenceInput {
  emotionId: string;
  name?: string | null;
  emoji?: string | null;
  position?: number;
  removed?: boolean;
  isCustom?: boolean;
}

export async function upsertEmotionPreference(
  userId: string,
  pref: UpsertEmotionPreferenceInput,
): Promise<EmotionPreference> {
  const client = requireSupabase();

  // Build payload with only the supplied fields to avoid overwriting columns
  // that were not part of this update (e.g. upsert with only {user_id,
  // emotion_id, position} leaves name/emoji/removed/is_custom untouched via
  // PostgREST's INSERT … ON CONFLICT DO UPDATE SET <provided columns only>).
  const payload: Record<string, unknown> = {
    user_id: userId,
    emotion_id: pref.emotionId,
  };
  if (pref.name !== undefined) payload.name = pref.name;
  if (pref.emoji !== undefined) payload.emoji = pref.emoji;
  if (pref.position !== undefined) payload.position = pref.position;
  if (pref.removed !== undefined) payload.removed = pref.removed;
  if (pref.isCustom !== undefined) payload.is_custom = pref.isCustom;

  const { data, error } = await client
    .from("emotion_preferences")
    .upsert(payload, { onConflict: "user_id,emotion_id" })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data as EmotionPreferenceRow);
}

export async function deleteEmotionPreference(userId: string, emotionId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("emotion_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("emotion_id", emotionId);
  if (error) throw error;
}

/**
 * Persist positions for an ordered array of emotionIds.
 *
 * Uses a single array upsert with `onConflict: "user_id,emotion_id"`.
 * PostgREST translates this to:
 *   INSERT … ON CONFLICT (user_id, emotion_id) DO UPDATE SET position = EXCLUDED.position
 * meaning **only the `position` column is updated** on conflict — name, emoji,
 * removed, and is_custom are left intact. New rows get default values for
 * those columns (null / false), so this function should only be called with
 * ids that already have rows or for which the defaults are acceptable.
 */
export async function setEmotionOrder(userId: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const client = requireSupabase();
  const payload = orderedIds.map((emotionId, index) => ({
    user_id: userId,
    emotion_id: emotionId,
    position: index,
  }));
  const { error } = await client
    .from("emotion_preferences")
    .upsert(payload, { onConflict: "user_id,emotion_id" });
  if (error) throw error;
}
