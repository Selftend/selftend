import {
  AVATAR_MAX_SIZE,
  buildAvatarManipulation,
} from "@/src/features/settings/avatar-processing";

describe("buildAvatarManipulation", () => {
  it("produces no crop op when no crop area is supplied", () => {
    const result = buildAvatarManipulation(undefined);
    expect(result.crop).toBeUndefined();
    expect(result.resize).toEqual({ width: AVATAR_MAX_SIZE, height: AVATAR_MAX_SIZE });
  });

  it("maps a react-easy-crop Area to the manipulator crop shape", () => {
    const result = buildAvatarManipulation({ x: 10, y: 20, width: 300, height: 400 });
    expect(result.crop).toEqual({
      originX: 10,
      originY: 20,
      width: 300,
      height: 400,
    });
  });

  it("always resizes to a maxSize square", () => {
    expect(buildAvatarManipulation(undefined, 256).resize).toEqual({
      width: 256,
      height: 256,
    });
    expect(buildAvatarManipulation({ x: 0, y: 0, width: 1, height: 1 }, 256).resize).toEqual({
      width: 256,
      height: 256,
    });
  });

  it("defaults to AVATAR_MAX_SIZE (512) when maxSize is omitted", () => {
    expect(AVATAR_MAX_SIZE).toBe(512);
    expect(buildAvatarManipulation({ x: 0, y: 0, width: 5, height: 5 }).resize).toEqual({
      width: 512,
      height: 512,
    });
  });

  it("preserves zero-valued crop coordinates", () => {
    const result = buildAvatarManipulation({ x: 0, y: 0, width: 100, height: 100 });
    expect(result.crop).toEqual({ originX: 0, originY: 0, width: 100, height: 100 });
  });
});
