import type { User } from "@supabase/supabase-js";

import { requireSupabase } from "@/src/lib/supabase";

const AVATAR_BUCKET = "profile-pics";
const AVATAR_SIGNED_URL_SECONDS = 60 * 60;

export type AvatarSource = "oauth" | "upload";

interface ProfileRow {
  user_id: string;
  email: string | null;
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

function toUserProfile(row: ProfileRow, avatarUrl: string | null): UserProfile {
  return {
    userId: row.user_id,
    email: row.email,
    avatarUrl,
    avatarStoragePath: row.avatar_storage_path,
    avatarSource: row.avatar_source,
    avatarUpdatedAt: row.avatar_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildSyncedProfileFields(
  row: Pick<ProfileRow, "email" | "avatar_url" | "avatar_storage_path" | "avatar_source" | "avatar_updated_at"> | null,
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

  if (row.avatar_source === "upload") {
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

function hasProfileFieldChanges(
  row: Pick<ProfileRow, "email" | "avatar_url" | "avatar_storage_path" | "avatar_source" | "avatar_updated_at">,
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
    return null;
  }

  return data.signedUrl;
}

async function mapProfileRow(row: ProfileRow) {
  if (row.avatar_source === "upload") {
    return toUserProfile(row, await createSignedAvatarUrl(row.avatar_storage_path));
  }

  return toUserProfile(row, row.avatar_url);
}

export async function getOrSyncUserProfile(user: User) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw getAvatarSetupError(error);
  }

  const now = new Date().toISOString();
  const row = data as ProfileRow | null;
  const next = buildSyncedProfileFields(row, user.email ?? null, getOAuthAvatarUrl(user), now);

  if (!row || hasProfileFieldChanges(row, next)) {
    const { data: updatedRow, error: updateError } = await client
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          ...next,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (updateError) {
      throw getAvatarSetupError(updateError);
    }

    return mapProfileRow(updatedRow as ProfileRow);
  }

  return mapProfileRow(row);
}

async function removeStoredAvatar(storagePath: string | null | undefined) {
  if (!storagePath) {
    return;
  }

  const client = requireSupabase();
  await client.storage.from(AVATAR_BUCKET).remove([storagePath]);
}

export async function uploadUserAvatar(input: AvatarUploadInput) {
  const mimeType = getSupportedMimeType(input.mimeType, input.fileName);
  if (!mimeType) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  const extension = allowedMimeTypes.get(mimeType) ?? "jpg";
  const storagePath = `${input.userId}/avatar-${Date.now()}.${extension}`;
  const response = await fetch(input.uri);
  const arrayBuffer = await response.arrayBuffer();
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

  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        user_id: input.userId,
        avatar_url: null,
        avatar_storage_path: storagePath,
        avatar_source: "upload",
        avatar_updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    await removeStoredAvatar(storagePath);
    throw getAvatarSetupError(error);
  }

  if (input.previousStoragePath && input.previousStoragePath !== storagePath) {
    await removeStoredAvatar(input.previousStoragePath);
  }

  return mapProfileRow(data as ProfileRow);
}

export async function resetUserAvatarToOAuth(user: User, previousStoragePath?: string | null) {
  const oauthAvatarUrl = getOAuthAvatarUrl(user);
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? null,
        avatar_url: oauthAvatarUrl,
        avatar_storage_path: null,
        avatar_source: oauthAvatarUrl ? "oauth" : null,
        avatar_updated_at: oauthAvatarUrl ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw getAvatarSetupError(error);
  }

  await removeStoredAvatar(previousStoragePath);
  return mapProfileRow(data as ProfileRow);
}

export async function removeUserAvatar(userId: string, previousStoragePath?: string | null) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        avatar_url: null,
        avatar_storage_path: null,
        avatar_source: null,
        avatar_updated_at: null,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw getAvatarSetupError(error);
  }

  await removeStoredAvatar(previousStoragePath);
  return mapProfileRow(data as ProfileRow);
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
