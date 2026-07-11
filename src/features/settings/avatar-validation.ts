/** Maximum accepted avatar file size: 5 MB. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type PickedAssetValidation = { ok: true } | { ok: false; reason: "too-large" };

/**
 * Pure guard for a picked image asset's size. The component maps the returned
 * `reason` to an i18n key.
 *
 * Matches the original inline check (`asset.fileSize && asset.fileSize > MAX`):
 * a `0` or absent `fileSize` is treated as acceptable (the picker/library did
 * not report a size, so we don't block the upload).
 */
export function validatePickedAsset(asset: { fileSize?: number | null }): PickedAssetValidation {
  if (asset.fileSize && asset.fileSize > AVATAR_MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  return { ok: true };
}
