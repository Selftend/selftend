import { AVATAR_MAX_BYTES, validatePickedAsset } from "@/src/features/settings/avatar-validation";

describe("validatePickedAsset", () => {
  it("exposes a 5 MB limit", () => {
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("accepts an asset exactly at the limit", () => {
    expect(validatePickedAsset({ fileSize: AVATAR_MAX_BYTES })).toEqual({ ok: true });
  });

  it("rejects an asset just over the limit", () => {
    expect(validatePickedAsset({ fileSize: AVATAR_MAX_BYTES + 1 })).toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("accepts an asset under the limit", () => {
    expect(validatePickedAsset({ fileSize: 1024 })).toEqual({ ok: true });
  });

  it("accepts an asset with no reported size (undefined/null/0 pass through)", () => {
    expect(validatePickedAsset({})).toEqual({ ok: true });
    expect(validatePickedAsset({ fileSize: undefined })).toEqual({ ok: true });
    expect(validatePickedAsset({ fileSize: null })).toEqual({ ok: true });
    expect(validatePickedAsset({ fileSize: 0 })).toEqual({ ok: true });
  });
});
