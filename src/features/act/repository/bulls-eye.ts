import {
  ACT_LIFE_DOMAINS,
  type ACTLifeDomain,
  type BullsEyeSnapshot,
  type BullsEyeSnapshotInput,
} from "@/src/features/act/types";
import { selectList, selectMaybe, writeSingle } from "./helpers";

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

/**
 * The newest alignment rating for each life domain, read on its own rather than
 * derived from `listBullsEyeSnapshots`.
 *
 * ☠️ The history list caps at 50 rows and a check-in writes FOUR (one per domain),
 * so a user past a dozen or so reviews has domains whose latest rating has already
 * fallen off the end of it. Deriving the values row's number from that list would
 * tell such a user "not yet rated" for a value they rate every week - a cap wearing
 * the face of an absence, which is exactly what ADR-0001 exists to stop. The entry's
 * own `current_alignment_rating` used to shield this by winning the comparison; once
 * the check-in owns alignment, nothing shields it any more.
 *
 * Four `limit 1` reads rather than one wide one: PostgREST has no DISTINCT ON, and
 * each of these is a single seek on `act_bulls_eye_snapshots_user_domain_reviewed`
 * (user_id, domain, reviewed_at DESC), which the table already carries. So this needs
 * no RPC and no migration.
 */
export async function getLatestBullsEyeByDomain(
  userId: string,
): Promise<Record<ACTLifeDomain, number | null>> {
  const pairs = await Promise.all(
    ACT_LIFE_DOMAINS.map(async (domain) => {
      const rating = await selectMaybe<{ alignment_rating: number }, number>(
        (c) =>
          c
            .from("act_bulls_eye_snapshots")
            .select("alignment_rating")
            .eq("user_id", userId)
            .eq("domain", domain)
            .order("reviewed_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        (row) => row.alignment_rating,
      );
      return [domain, rating] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<ACTLifeDomain, number | null>;
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
