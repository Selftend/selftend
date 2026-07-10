import {
  DRAG_COMMIT_FRACTION,
  DRAG_COMMIT_VELOCITY,
  resolveDragCommit,
  wrappedSlideOffset,
  wrapSlideIndex,
} from "./preview-carousel-math";

describe("wrapSlideIndex", () => {
  it("keeps in-range indexes unchanged", () => {
    expect(wrapSlideIndex(0, 3)).toBe(0);
    expect(wrapSlideIndex(1, 3)).toBe(1);
    expect(wrapSlideIndex(2, 3)).toBe(2);
  });

  it("wraps past the end back to the start", () => {
    expect(wrapSlideIndex(3, 3)).toBe(0);
    expect(wrapSlideIndex(4, 3)).toBe(1);
  });

  it("wraps negative steps to the other end", () => {
    expect(wrapSlideIndex(-1, 3)).toBe(2);
    expect(wrapSlideIndex(-4, 3)).toBe(2);
  });
});

describe("wrappedSlideOffset", () => {
  it("places every slide in exactly one slot around the active one", () => {
    expect(wrappedSlideOffset(0, 0, 3)).toBe(0);
    expect(wrappedSlideOffset(1, 0, 3)).toBe(1);
    expect(wrappedSlideOffset(2, 0, 3)).toBe(-1);
  });

  it("wraps so next always sits to the right and previous to the left", () => {
    // Active last slide: its next (slide 0) waits on the right.
    expect(wrappedSlideOffset(0, 2, 3)).toBe(1);
    expect(wrappedSlideOffset(1, 2, 3)).toBe(-1);
    // Active first slide: its previous (slide 2) waits on the left.
    expect(wrappedSlideOffset(2, 0, 3)).toBe(-1);
    expect(wrappedSlideOffset(1, 1, 3)).toBe(0);
  });
});

describe("resolveDragCommit", () => {
  const width = 280;

  it("settles back when displacement and velocity are below the thresholds", () => {
    expect(resolveDragCommit(0, 0, width)).toBe(0);
    expect(resolveDragCommit(-60, -100, width)).toBe(0);
    expect(resolveDragCommit(60, 100, width)).toBe(0);
  });

  it("commits next when dragged left past a quarter of the frame", () => {
    expect(resolveDragCommit(-80, 0, width)).toBe(1);
  });

  it("commits previous when dragged right past a quarter of the frame", () => {
    expect(resolveDragCommit(80, 0, width)).toBe(-1);
  });

  it("commits on a fling even with a small displacement", () => {
    expect(resolveDragCommit(-10, -600, width)).toBe(1);
    expect(resolveDragCommit(10, 600, width)).toBe(-1);
  });

  it("lets a fling override an opposing displacement", () => {
    expect(resolveDragCommit(120, -600, width)).toBe(1);
    expect(resolveDragCommit(-120, 600, width)).toBe(-1);
  });

  it("treats the thresholds as exclusive", () => {
    expect(resolveDragCommit(-width * DRAG_COMMIT_FRACTION, 0, width)).toBe(0);
    expect(resolveDragCommit(0, -DRAG_COMMIT_VELOCITY, width)).toBe(0);
  });

  it("never commits before the frame is measured", () => {
    expect(resolveDragCommit(500, 2000, 0)).toBe(0);
  });
});
