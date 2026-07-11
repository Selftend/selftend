export type AvatarSource = "oauth" | "upload" | "none";

export interface ProfileRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_source: AvatarSource | null;
  avatar_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarStoragePath: string | null;
  avatarSource: AvatarSource | null;
  avatarUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncedProfileFields {
  email: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_source: AvatarSource | null;
  avatar_updated_at: string | null;
}

// The mutable column set every write must send IN FULL. Reads are merged onto the
// current row so a mutation NEVER omits a column: "clear" sends null explicitly,
// "preserve" re-sends the current value explicitly. This removes the omitted-vs-null
// ambiguity that blocked encrypting display_name behind an INSTEAD OF view trigger.
export interface ProfileMutableFields {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_source: AvatarSource | null;
  avatar_updated_at: string | null;
}

export function pickMutableFields(row: ProfileRow): ProfileMutableFields {
  return {
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    avatar_storage_path: row.avatar_storage_path,
    avatar_source: row.avatar_source,
    avatar_updated_at: row.avatar_updated_at,
  };
}

// A new row's defaults when no profile exists yet (every column explicit, all null).
export function emptyMutableFields(): ProfileMutableFields {
  return {
    email: null,
    display_name: null,
    avatar_url: null,
    avatar_storage_path: null,
    avatar_source: null,
    avatar_updated_at: null,
  };
}

export function mapUserProfile(row: ProfileRow, avatarUrl: string | null): UserProfile {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl,
    avatarStoragePath: row.avatar_storage_path,
    avatarSource: row.avatar_source,
    avatarUpdatedAt: row.avatar_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildSyncedProfileFields(
  row: Pick<
    ProfileRow,
    "email" | "avatar_url" | "avatar_storage_path" | "avatar_source" | "avatar_updated_at"
  > | null,
  email: string | null,
  oauthAvatarUrl: string | null,
  now: string,
): SyncedProfileFields {
  if (!row) {
    return {
      email,
      avatar_url: oauthAvatarUrl,
      avatar_storage_path: null,
      avatar_source: oauthAvatarUrl ? "oauth" : null,
      avatar_updated_at: oauthAvatarUrl ? now : null,
    };
  }

  const next: SyncedProfileFields = {
    email: row.email,
    avatar_url: row.avatar_url,
    avatar_storage_path: row.avatar_storage_path,
    avatar_source: row.avatar_source,
    avatar_updated_at: row.avatar_updated_at,
  };

  if (row.email !== email) {
    next.email = email;
  }

  if (row.avatar_source === "upload" || isRemovedAvatarRow(row)) {
    return next;
  }

  if (row.avatar_url !== oauthAvatarUrl) {
    next.avatar_url = oauthAvatarUrl;
    next.avatar_source = oauthAvatarUrl ? "oauth" : null;
    next.avatar_updated_at = oauthAvatarUrl ? now : null;
  }

  if (!oauthAvatarUrl && row.avatar_source === "oauth") {
    next.avatar_source = null;
    next.avatar_updated_at = null;
  }

  return next;
}

export function isRemovedAvatarRow(
  row: Pick<
    ProfileRow,
    "avatar_url" | "avatar_storage_path" | "avatar_source" | "avatar_updated_at"
  >,
) {
  return (
    row.avatar_source === "none" ||
    (row.avatar_source === null &&
      row.avatar_url === null &&
      row.avatar_storage_path === null &&
      row.avatar_updated_at !== null)
  );
}

export function hasProfileFieldChanges(
  row: Pick<
    ProfileRow,
    "email" | "avatar_url" | "avatar_storage_path" | "avatar_source" | "avatar_updated_at"
  >,
  next: SyncedProfileFields,
) {
  return (
    row.email !== next.email ||
    row.avatar_url !== next.avatar_url ||
    row.avatar_storage_path !== next.avatar_storage_path ||
    row.avatar_source !== next.avatar_source ||
    row.avatar_updated_at !== next.avatar_updated_at
  );
}
