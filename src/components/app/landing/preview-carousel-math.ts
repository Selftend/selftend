// Pure helpers for the landing preview carousel, kept out of the component so
// the wrap and drag-commit rules stay unit-testable without rendering. Each is
// marked as a worklet because the drag gesture also calls them on the UI thread.

/** Displacement fraction of the frame width past which a released drag commits. */
export const DRAG_COMMIT_FRACTION = 0.25;

/** Fling velocity (px/s) past which a released drag commits regardless of distance. */
export const DRAG_COMMIT_VELOCITY = 500;

/** Wraps any integer step into a valid slide index in [0, count). */
export function wrapSlideIndex(index: number, count: number): number {
  "worklet";
  return ((index % count) + count) % count;
}

/**
 * Wrapped position of a slide relative to the active one, in frame-width
 * slots: 0 = active, +1 = one slot to the right, -1 = one slot to the left.
 * With 3 slides every slide has exactly one slot, so "next" always enters
 * from the right and "previous" from the left - including across the wrap.
 */
export function wrappedSlideOffset(slideIndex: number, activeIndex: number, count: number): number {
  "worklet";
  const relative = wrapSlideIndex(slideIndex - activeIndex, count);
  return relative > count / 2 ? relative - count : relative;
}

/**
 * Decides where a released drag commits: +1 = next slide, -1 = previous,
 * 0 = settle back. A fling past the velocity threshold wins over displacement,
 * so a quick flick back against the drag direction still follows the fling.
 */
export function resolveDragCommit(
  translationX: number,
  velocityX: number,
  frameWidth: number,
): -1 | 0 | 1 {
  "worklet";
  if (frameWidth <= 0) {
    return 0;
  }
  if (Math.abs(velocityX) > DRAG_COMMIT_VELOCITY) {
    return velocityX < 0 ? 1 : -1;
  }
  if (Math.abs(translationX) > frameWidth * DRAG_COMMIT_FRACTION) {
    return translationX < 0 ? 1 : -1;
  }
  return 0;
}
