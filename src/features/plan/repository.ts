import type { CarePlanItem, CarePlanItemInput } from "@/src/features/plan/types";
import { requireSupabase } from "@/src/lib/supabase";

interface PlanItemRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tool_id: string;
  module_id: string | null;
  route: string;
  frequency: string;
  reminder_enabled: boolean;
  item_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapPlanItem(row: PlanItemRow): CarePlanItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    toolId: row.tool_id,
    moduleId: row.module_id ?? undefined,
    route: row.route,
    frequency: row.frequency as CarePlanItem["frequency"],
    reminderEnabled: row.reminder_enabled,
    order: row.item_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlanItems(userId: string): Promise<CarePlanItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("plan_items")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("item_order", { ascending: true });

  if (error) throw error;
  return (data as PlanItemRow[]).map(mapPlanItem);
}

export async function listAllPlanItems(userId: string): Promise<CarePlanItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("plan_items")
    .select("*")
    .eq("user_id", userId)
    .order("item_order", { ascending: true });

  if (error) throw error;
  return (data as PlanItemRow[]).map(mapPlanItem);
}

export async function savePlanItem(
  userId: string,
  input: CarePlanItemInput,
  id?: string,
): Promise<CarePlanItem> {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    tool_id: input.toolId,
    module_id: input.moduleId ?? null,
    route: input.route,
    frequency: input.frequency,
    reminder_enabled: input.reminderEnabled,
    item_order: input.order,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await client
      .from("plan_items")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return mapPlanItem(data as PlanItemRow);
  }

  const { data, error } = await client.from("plan_items").insert(payload).select("*").single();
  if (error) throw error;
  return mapPlanItem(data as PlanItemRow);
}

export async function deletePlanItem(userId: string, id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("plan_items").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
