import type { User } from "@supabase/supabase-js";

import { requireSupabase } from "@/src/lib/supabase";

const AVATAR_BUCKET = "profile-pics";
const AVATAR_SIGNED_URL_SECONDS = 60 * 60;

type AvatarSource = "oauth" | "upload" | "none";

interface ProfileRow {
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

interface UserProfile {
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

export interface AvatarUploadInput {
  userId: string;
  uri: string;
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  previousStoragePath?: string | null;
}

interface SyncedProfileFields {
  email: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_source: AvatarSource | null;
  avatar_updated_at: string | null;
}

const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function isMissingDisplayNameColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "PGRST204" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("display_name")
  );
}

function getAvatarSetupError(error: unknown) {
  const message = getErrorMessage(error);

  if (message.includes("avatar_source") && message.includes("schema cache")) {
    return new Error(
      "Profile picture database fields are not applied yet. Run the latest Supabase migrations and retry.",
    );
  }

  if (message.includes("row-level security policy")) {
    return new Error(
      "Profile picture storage permissions are not applied yet. Run the latest Supabase migrations so the profile-pics bucket policies are installed.",
    );
  }

  return error;
}

function getStringMetadataValue(metadata: User["user_metadata"], key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getOAuthAvatarUrl(user: User | null | undefined) {
  if (!user) {
    return null;
  }

  return (
    getStringMetadataValue(user.user_metadata, "avatar_url") ??
    getStringMetadataValue(user.user_metadata, "picture")
  );
}

function getSupportedMimeType(mimeType?: string | null, fileName?: string | null) {
  const normalizedMimeType = mimeType?.toLowerCase();
  if (normalizedMimeType && allowedMimeTypes.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "webp") {
    return "image/webp";
  }

  return null;
}

// The mutable column set every write must send IN FULL. Reads are merged onto the
// current row so a mutation NEVER omits a column: "clear" sends null explicitly,
// "preserve" re-sends the current value explicitly. This removes the omitted-vs-null
// ambiguity that blocked encrypting display_name behind an INSTEAD OF view trigger.
interface ProfileMutableFields {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  avatar_source: AvatarSource | null;
  avatar_updated_at: string | null;
}

function pickMutableFields(row: ProfileRow): ProfileMutableFields {
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
function emptyMutableFields(): ProfileMutableFields {
  return {
    email: null,
    display_name: null,
    avatar_url: null,
    avatar_storage_path: null,
    avatar_source: null,
    avatar_updated_at: null,
  };
}

async function getCurrentProfileRow(userId: string): Promise<ProfileRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw getAvatarSetupError(error);
  }

  return (data as ProfileRow | null) ?? null;
}

// Read-modify-write a COMPLETE row: merge `changes` onto the current row (or onto an
// all-null baseline when none exists) and write every mutable column explicitly.
// `includeDisplayName=false` is the pre-migration fallback for a DB whose `display_name`
// column doesn't exist yet (PGRST204); it writes every OTHER mutable column.
async function writeCompleteProfile(
  userId: string,
  current: ProfileRow | null,
  changes: Partial<ProfileMutableFields>,
  includeDisplayName = true,
): Promise<ProfileRow> {
  const client = requireSupabase();
  const base = current ? pickMutableFields(current) : emptyMutableFields();
  const merged: ProfileMutableFields = { ...base, ...changes };
  const { display_name, ...withoutName } = merged;
  const payload = includeDisplayName ? merged : withoutName;

  // A complete-row write keyed on user_id. After display_name encryption, `profiles` is a
  // view whose INSTEAD OF INSERT trigger resolves the per-user merge via ON CONFLICT
  // (user_id) against the base table; PostgREST cannot issue INSERT ... ON CONFLICT against
  // a view, so the merge is owned by the trigger and this becomes a plain `.insert()`.
  const { data, error } = await client
    .from("profiles")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}

function mapUserProfile(row: ProfileRow, avatarUrl: string | null): UserProfile {
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

function isRemovedAvatarRow(
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

function hasProfileFieldChanges(
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

async function createSignedAvatarUrl(storagePath: string | null) {
  if (!storagePath) {
    return null;
  }

  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(storagePath, AVATAR_SIGNED_URL_SECONDS);

  if (error) {
    throw getAvatarSetupError(error);
  }

  if (!data?.signedUrl) {
    throw new Error("Unable to create a signed profile picture URL.");
  }

  return data.signedUrl;
}

async function mapProfileRow(row: ProfileRow) {
  if (row.avatar_source === "upload") {
    return mapUserProfile(row, await createSignedAvatarUrl(row.avatar_storage_path));
  }

  return mapUserProfile(row, row.avatar_url);
}

export async function getOrSyncUserProfile(user: User) {
  const row = await getCurrentProfileRow(user.id);

  const now = new Date().toISOString();
  const next = buildSyncedProfileFields(row, user.email ?? null, getOAuthAvatarUrl(user), now);

  const metaName = getStringMetadataValue(user.user_metadata, "full_name");
  const shouldSyncName = Boolean(metaName && !row?.display_name);

  if (!row || hasProfileFieldChanges(row, next) || shouldSyncName) {
    // Complete-row write: the synced avatar/email fields plus either the freshly imported
    // OAuth name (shouldSyncName) or the existing display_name preserved explicitly.
    const changes: Partial<ProfileMutableFields> = {
      ...next,
      display_name: shouldSyncName ? metaName : (row?.display_name ?? null),
    };

    try {
      const updatedRow = await writeCompleteProfile(user.id, row, changes);
      return mapProfileRow(updatedRow);
    } catch (updateError) {
      if (isMissingDisplayNameColumn(updateError)) {
        // Pre-migration fallback: write every mutable column except display_name.
        const fallbackRow = await writeCompleteProfile(user.id, row, changes, false);
        return mapProfileRow(fallbackRow);
      }
      throw getAvatarSetupError(updateError);
    }
  }

  return mapProfileRow(row);
}

async function removeStoredAvatar(storagePath: string | null | undefined) {
  if (!storagePath) {
    return;
  }

  const client = requireSupabase();
  const { error } = await client.storage.from(AVATAR_BUCKET).remove([storagePath]);
  if (error) {
    // Surface rather than silently swallow: an unreported failure leaves an orphaned object
    // in the private bucket. (Account deletion reclaims the whole folder server-side; this
    // path covers avatar replacement, where only the previous file should be removed.)
    console.warn("Failed to remove stored avatar object:", error.message);
  }
}

export async function uploadUserAvatar(input: AvatarUploadInput) {
  const mimeType = getSupportedMimeType(input.mimeType, input.fileName);
  if (!mimeType) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  const extension = allowedMimeTypes.get(mimeType) ?? "jpg";
  const storagePath = `${input.userId}/avatar-${Date.now()}.${extension}`;

  let arrayBuffer: ArrayBuffer;
  if (input.base64) {
    const binaryString = atob(input.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    arrayBuffer = bytes.buffer as ArrayBuffer;
  } else {
    const response = await fetch(input.uri);
    arrayBuffer = await response.arrayBuffer();
  }

  const client = requireSupabase();

  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw getAvatarSetupError(uploadError);
  }

  let data: ProfileRow;
  try {
    const current = await getCurrentProfileRow(input.userId);
    // Only the avatar columns change; email + display_name are preserved (re-sent from the
    // current row by writeCompleteProfile, no longer omitted).
    data = await writeCompleteProfile(input.userId, current, {
      avatar_url: null,
      avatar_storage_path: storagePath,
      avatar_source: "upload",
      avatar_updated_at: new Date().toISOString(),
    });
  } catch (error) {
    await removeStoredAvatar(storagePath);
    throw getAvatarSetupError(error);
  }

  if (input.previousStoragePath && input.previousStoragePath !== storagePath) {
    await removeStoredAvatar(input.previousStoragePath);
  }

  return mapProfileRow(data);
}

export async function resetUserAvatarToOAuth(user: User, previousStoragePath?: string | null) {
  const oauthAvatarUrl = getOAuthAvatarUrl(user);
  let data: ProfileRow;
  try {
    const current = await getCurrentProfileRow(user.id);
    // Sets email + avatar columns; display_name is preserved explicitly from the current row.
    data = await writeCompleteProfile(user.id, current, {
      email: user.email ?? null,
      avatar_url: oauthAvatarUrl,
      avatar_storage_path: null,
      avatar_source: oauthAvatarUrl ? "oauth" : null,
      avatar_updated_at: oauthAvatarUrl ? new Date().toISOString() : null,
    });
  } catch (error) {
    throw getAvatarSetupError(error);
  }

  await removeStoredAvatar(previousStoragePath);
  return mapProfileRow(data);
}

export async function removeUserAvatar(userId: string, previousStoragePath?: string | null) {
  let data: ProfileRow;
  try {
    const current = await getCurrentProfileRow(userId);
    // Clears the avatar columns; email + display_name preserved explicitly from the row.
    data = await writeCompleteProfile(userId, current, {
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: null,
      avatar_updated_at: new Date().toISOString(),
    });
  } catch (error) {
    throw getAvatarSetupError(error);
  }

  await removeStoredAvatar(previousStoragePath);
  return mapProfileRow(data);
}

const MAX_DISPLAY_NAME_LENGTH = 100;

export async function updateUserDisplayName(userId: string, displayName: string) {
  const trimmed = displayName.trim();
  // Enforce a server-agreed bound here too: the <Input maxLength> is presentational only,
  // and this mutation is callable directly. Matches the profiles.display_name CHECK (<=100).
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }

  try {
    // Sets display_name (null clears it); email + avatar columns preserved explicitly.
    const current = await getCurrentProfileRow(userId);
    const data = await writeCompleteProfile(userId, current, {
      display_name: trimmed || null,
    });
    return mapProfileRow(data);
  } catch (error) {
    if (isMissingDisplayNameColumn(error)) {
      throw new Error(
        "Display name is not available yet. Run the latest database migration to enable this feature.",
      );
    }
    throw error;
  }
}

export async function removeCurrentUserUploadedAvatar() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("avatar_storage_path, avatar_source")
    .maybeSingle();

  if (error) {
    throw getAvatarSetupError(error);
  }

  const row = data as Pick<ProfileRow, "avatar_storage_path" | "avatar_source"> | null;
  if (row?.avatar_source === "upload") {
    await removeStoredAvatar(row.avatar_storage_path);
  }
}
