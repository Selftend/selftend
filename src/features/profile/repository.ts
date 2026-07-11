import type { User } from "@supabase/supabase-js";

import { requireSupabase } from "@/src/lib/supabase";

import {
  allowedMimeTypes,
  decodeBase64ToArrayBuffer,
  getAvatarSetupError,
  getOAuthAvatarUrl,
  getStringMetadataValue,
  getSupportedMimeType,
  isMissingDisplayNameColumn,
} from "./profile-avatar";
import {
  buildSyncedProfileFields,
  emptyMutableFields,
  hasProfileFieldChanges,
  mapUserProfile,
  pickMutableFields,
} from "./profile-sync";
import type { ProfileMutableFields, ProfileRow } from "./profile-sync";

export { getOAuthAvatarUrl } from "./profile-avatar";
export { buildSyncedProfileFields } from "./profile-sync";

const AVATAR_BUCKET = "profile-pics";
const AVATAR_SIGNED_URL_SECONDS = 60 * 60;

export interface AvatarUploadInput {
  userId: string;
  uri: string;
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  previousStoragePath?: string | null;
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
    arrayBuffer = decodeBase64ToArrayBuffer(input.base64);
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
