import { getOAuthAvatarUrl } from "@/src/features/profile/profile-avatar";

type ProfileLike = { avatarUrl: string | null } | null | undefined;
type UserLike = Parameters<typeof getOAuthAvatarUrl>[0];

/**
 * The avatar to show for the signed-in user, in one expression (#970).
 *
 * Two surfaces used to compute this separately and disagree: settings fell back to the
 * OAuth photo, the header did not. For a Google user with no uploaded photo that meant
 * `Remove photo` appeared to do NOTHING in settings while the header quietly dropped to
 * the initial — the same tap, two answers, neither obviously wrong on its own screen.
 *
 * Precedence mirrors `resolveDisplayName`: the stored profile value wins, then OAuth
 * metadata. Sharing the expression is the point; a second copy is the bug.
 *
 * ⚠️ It follows that for a Google user who has never uploaded, `Remove photo` and
 * `Use Google photo` land on the same picture. That redundancy is REAL and is why #958
 * kept all three photo controls rather than the two the design draws — but it is a copy
 * and product question about the buttons, not a reason for two surfaces to disagree.
 */
export function resolveAvatarUrl(profile: ProfileLike, user: UserLike): string | null {
  return profile?.avatarUrl ?? getOAuthAvatarUrl(user) ?? null;
}
