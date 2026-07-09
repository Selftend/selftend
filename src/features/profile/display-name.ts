type ProfileLike = { displayName: string | null } | null | undefined;
type UserLike = { user_metadata?: Record<string, unknown> } | null | undefined;

/**
 * Full display name for the signed-in user.
 * Precedence: encrypted profile display name, then OAuth metadata full_name / name.
 */
export function resolveDisplayName(profile: ProfileLike, user: UserLike): string | null {
  const profileName = profile?.displayName?.trim();
  if (profileName) return profileName;

  const metadata = user?.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName) return fullName;
  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  if (name) return name;
  return null;
}
