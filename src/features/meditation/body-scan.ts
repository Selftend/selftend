/**
 * Body-scan pacing for Stage 5.
 *
 * Splits the sit duration into equal segments through a fixed sequence of
 * body parts. Returns the current segment for a given elapsed time so the UI
 * can display where the practitioner is in the scan.
 */

export type BodyScanSegments = 4 | 6 | 12;

export interface BodyScanSegment {
  index: number;
  labelKey: string;
}

const SEGMENT_KEYS_BY_COUNT: Record<BodyScanSegments, string[]> = {
  4: [
    "module.bodyScan.segments.headNeck",
    "module.bodyScan.segments.torso",
    "module.bodyScan.segments.arms",
    "module.bodyScan.segments.legs",
  ],
  6: [
    "module.bodyScan.segments.head",
    "module.bodyScan.segments.shoulders",
    "module.bodyScan.segments.torso",
    "module.bodyScan.segments.arms",
    "module.bodyScan.segments.hips",
    "module.bodyScan.segments.legs",
  ],
  12: [
    "module.bodyScan.segments.crown",
    "module.bodyScan.segments.face",
    "module.bodyScan.segments.neck",
    "module.bodyScan.segments.shoulders",
    "module.bodyScan.segments.upperArms",
    "module.bodyScan.segments.forearmsHands",
    "module.bodyScan.segments.chest",
    "module.bodyScan.segments.abdomen",
    "module.bodyScan.segments.back",
    "module.bodyScan.segments.hips",
    "module.bodyScan.segments.thighs",
    "module.bodyScan.segments.calvesFeet",
  ],
};

export function bodyScanSegments(count: BodyScanSegments): BodyScanSegment[] {
  return SEGMENT_KEYS_BY_COUNT[count].map((labelKey, index) => ({ index, labelKey }));
}

/**
 * Returns the segment the practitioner should be on, given how many seconds
 * have elapsed of a sit with the given total duration. Clamps to the last
 * segment near the end.
 */
export function currentBodyScanSegment(
  count: BodyScanSegments,
  elapsedSeconds: number,
  totalSeconds: number,
): BodyScanSegment {
  const segments = bodyScanSegments(count);
  if (totalSeconds <= 0) return segments[0];
  const fraction = Math.max(0, Math.min(1, elapsedSeconds / totalSeconds));
  const rawIndex = Math.floor(fraction * count);
  const index = Math.min(count - 1, Math.max(0, rawIndex));
  return segments[index];
}
