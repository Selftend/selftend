import type {
  ExposureHierarchy,
  ExposureHierarchyInput,
  ExposureItem,
  ExposureItemInput,
  ExposureSession,
  ExposureSessionInput,
} from "@/src/features/exposure/types";
import { requireSupabase } from "@/src/lib/supabase";

interface HierarchyRow {
  id: string;
  user_id: string;
  title: string;
  anxiety_type: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  hierarchy_id: string;
  user_id: string;
  description: string;
  suds_rating: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  exposure_item_id: string;
  user_id: string;
  pre_suds: number;
  post_suds: number;
  duration_minutes: number;
  safety_behaviors_used: boolean;
  safety_behavior_description: string;
  notes: string;
  completed_at: string;
  created_at: string;
}

function mapHierarchy(row: HierarchyRow): ExposureHierarchy {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    anxietyType: row.anxiety_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: ItemRow): ExposureItem {
  return {
    id: row.id,
    hierarchyId: row.hierarchy_id,
    userId: row.user_id,
    description: row.description,
    sudsRating: row.suds_rating,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow): ExposureSession {
  return {
    id: row.id,
    exposureItemId: row.exposure_item_id,
    userId: row.user_id,
    preSuds: row.pre_suds,
    postSuds: row.post_suds,
    durationMinutes: row.duration_minutes,
    safetyBehaviorsUsed: row.safety_behaviors_used,
    safetyBehaviorDescription: row.safety_behavior_description,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function listHierarchies(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_hierarchies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as HierarchyRow[]).map(mapHierarchy);
}

export async function getHierarchy(userId: string, hierarchyId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_hierarchies")
    .select("*")
    .eq("user_id", userId)
    .eq("id", hierarchyId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapHierarchy(data as HierarchyRow) : null;
}

export async function saveHierarchy(userId: string, input: ExposureHierarchyInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_hierarchies")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      anxiety_type: input.anxietyType.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapHierarchy(data as HierarchyRow);
}

export async function listItems(userId: string, hierarchyId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_items")
    .select("*")
    .eq("user_id", userId)
    .eq("hierarchy_id", hierarchyId)
    .order("suds_rating", { ascending: true });

  if (error) throw error;
  return (data as ItemRow[]).map(mapItem);
}

export async function saveItems(
  userId: string,
  hierarchyId: string,
  inputs: ExposureItemInput[],
) {
  const client = requireSupabase();
  const payload = inputs.map((i) => ({
    hierarchy_id: hierarchyId,
    user_id: userId,
    description: i.description.trim(),
    suds_rating: i.sudsRating,
  }));

  const { error } = await client.from("exposure_items").insert(payload);
  if (error) throw error;
}

export async function getItem(userId: string, itemId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapItem(data as ItemRow) : null;
}

export async function listSessions(userId: string, itemId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("exposure_item_id", itemId)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data as SessionRow[]).map(mapSession);
}

export async function saveSession(
  userId: string,
  itemId: string,
  input: ExposureSessionInput,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("exposure_sessions")
    .insert({
      exposure_item_id: itemId,
      user_id: userId,
      pre_suds: input.preSuds,
      post_suds: input.postSuds,
      duration_minutes: input.durationMinutes,
      safety_behaviors_used: input.safetyBehaviorsUsed,
      safety_behavior_description: input.safetyBehaviorDescription.trim(),
      notes: input.notes.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;

  // Mark the item as completed
  await client
    .from("exposure_items")
    .update({ completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", itemId);

  return mapSession(data as SessionRow);
}
