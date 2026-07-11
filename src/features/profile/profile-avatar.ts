import type { User } from "@supabase/supabase-js";

export const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function getErrorMessage(error: unknown) {
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

export function isMissingDisplayNameColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "PGRST204" &&
    typeof maybeError.message === "string" &&
    maybeError.message.includes("display_name")
  );
}

export function getAvatarSetupError(error: unknown) {
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

export function getStringMetadataValue(metadata: User["user_metadata"], key: string) {
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

export function getSupportedMimeType(mimeType?: string | null, fileName?: string | null) {
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

export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
