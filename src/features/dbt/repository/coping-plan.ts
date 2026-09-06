import type { CopingPlan, CopingPlanDocument, CopingPlanItem } from "@/src/features/dbt/types";
import { sanitizeUserText } from "@/src/utils/sanitize-text";
import { mutateVoid, selectMaybe, writeSingle } from "./helpers";

interface CopingPlanRow {
  id: string;
  user_id: string;
  plan: CopingPlanDocument | null;
  created_at: string;
  updated_at: string;
}

function mapCopingPlan(row: CopingPlanRow): CopingPlan {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan ?? { items: [], fallback: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The document as it will be stored: own lines sanitised and trimmed once, picks
 * carrying their registry key and never a label, positions renumbered in order.
 * The database guard re-checks the caps (`dbt_coping_plans_guard`).
 */
export function normalizeCopingPlanDocument(plan: CopingPlanDocument): CopingPlanDocument {
  const items: CopingPlanItem[] = plan.items.map((item, index) => ({
    id: item.id,
    section: item.section,
    kind: item.kind,
    ...(item.kind === "pick" ? { pickKey: item.pickKey } : {}),
    ...(item.kind === "own" ? { text: sanitizeUserText(item.text ?? "").trim() } : {}),
    homeOnly: Boolean(item.homeOnly),
    position: index,
  }));
  const ids = new Set(items.map((item) => item.id));
  return { items, fallback: plan.fallback.filter((id) => ids.has(id)) };
}

/** One row per person, or null before the plan is built. */
export async function getCopingPlan(userId: string) {
  return selectMaybe<CopingPlanRow, CopingPlan>(
    (c) => c.from("dbt_coping_plans").select("*").eq("user_id", userId).maybeSingle(),
    mapCopingPlan,
  );
}

/**
 * Create or replace the whole plan (#1992 §4: one document, one Save). The view
 * has no upsert - INSTEAD OF triggers cannot take `on conflict` - so the caller
 * passes the existing id when there is one.
 */
export async function saveCopingPlan(
  userId: string,
  plan: CopingPlanDocument,
  existingId: string | null,
) {
  const document = normalizeCopingPlanDocument(plan);
  if (existingId) {
    return writeSingle<CopingPlanRow, CopingPlan>(
      (c) =>
        c
          .from("dbt_coping_plans")
          .update({ plan: document })
          .eq("user_id", userId)
          .eq("id", existingId)
          .select("*")
          .single(),
      mapCopingPlan,
    );
  }
  return writeSingle<CopingPlanRow, CopingPlan>(
    (c) =>
      c.from("dbt_coping_plans").insert({ user_id: userId, plan: document }).select("*").single(),
    mapCopingPlan,
  );
}

/** Deleting the plan is deleting the row; the builder returns to its empty state. */
export async function deleteCopingPlan(userId: string, planId: string) {
  return mutateVoid((c) =>
    c.from("dbt_coping_plans").delete().eq("user_id", userId).eq("id", planId),
  );
}
