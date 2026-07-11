import type {
  ACTLifeDomain,
  BullsEyeSnapshot,
  BullsEyeSnapshotInput,
} from "@/src/features/act/types";
import { selectList, writeSingle } from "./helpers";

interface BullsEyeSnapshotRow {
  id: string;
  user_id: string;
  domain: string;
  alignment_rating: number;
  reviewed_at: string;
  created_at: string;
}

function mapBullsEyeSnapshot(row: BullsEyeSnapshotRow): BullsEyeSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    domain: row.domain as ACTLifeDomain,
    alignmentRating: row.alignment_rating,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export async function listBullsEyeSnapshots(userId: string, limit = 50) {
  return selectList<BullsEyeSnapshotRow, BullsEyeSnapshot>(
    (c) =>
      c
        .from("act_bulls_eye_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("reviewed_at", { ascending: false })
        .limit(limit),
    mapBullsEyeSnapshot,
  );
}

export async function saveBullsEyeSnapshot(userId: string, input: BullsEyeSnapshotInput) {
  return writeSingle<BullsEyeSnapshotRow, BullsEyeSnapshot>(
    (c) =>
      c
        .from("act_bulls_eye_snapshots")
        .insert({
          user_id: userId,
          domain: input.domain,
          alignment_rating: input.alignmentRating,
          reviewed_at: input.reviewedAt ?? new Date().toISOString(),
        })
        .select("*")
        .single(),
    mapBullsEyeSnapshot,
  );
}
