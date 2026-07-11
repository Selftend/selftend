import type { Area } from "react-easy-crop";

/** Square edge (px) every uploaded avatar is resized to. */
export const AVATAR_MAX_SIZE = 512;

export interface AvatarCropOp {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface AvatarResizeOp {
  width: number;
  height: number;
}

export interface AvatarManipulation {
  /** Present only when the caller supplied a crop area. */
  crop?: AvatarCropOp;
  resize: AvatarResizeOp;
}

/**
 * Pure derivation of the crop + resize operations applied to a picked avatar
 * before upload. The impure `ImageManipulator` render/save/upload stays in the
 * component; this only computes *what* operations to run.
 *
 * - When `cropArea` is omitted, no crop op is produced (native `allowsEditing`
 *   already cropped the asset).
 * - A `react-easy-crop` `Area` (`{x, y, width, height}`) maps to the manipulator
 *   crop shape (`{originX, originY, width, height}`).
 * - The resize is always a `maxSize × maxSize` square.
 */
export function buildAvatarManipulation(
  cropArea: Area | undefined,
  maxSize: number = AVATAR_MAX_SIZE,
): AvatarManipulation {
  const resize: AvatarResizeOp = { width: maxSize, height: maxSize };

  if (!cropArea) {
    return { resize };
  }

  return {
    crop: {
      originX: cropArea.x,
      originY: cropArea.y,
      width: cropArea.width,
      height: cropArea.height,
    },
    resize,
  };
}
