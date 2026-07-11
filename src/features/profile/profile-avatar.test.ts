import type { User } from "@supabase/supabase-js";

import {
  getOAuthAvatarUrl,
  getSupportedMimeType,
  decodeBase64ToArrayBuffer,
  getErrorMessage,
  getAvatarSetupError,
  isMissingDisplayNameColumn,
} from "@/src/features/profile/profile-avatar";

describe("getSupportedMimeType", () => {
  it("accepts a known mime type", () => {
    expect(getSupportedMimeType("image/png")).toBe("image/png");
  });
  it("normalizes case", () => {
    expect(getSupportedMimeType("IMAGE/JPEG")).toBe("image/jpeg");
  });
  it("infers from a file extension when mime is missing", () => {
    expect(getSupportedMimeType(null, "pic.JPG")).toBe("image/jpeg");
    expect(getSupportedMimeType(undefined, "pic.webp")).toBe("image/webp");
  });
  it("returns null for unsupported input", () => {
    expect(getSupportedMimeType("image/gif", "pic.gif")).toBeNull();
    expect(getSupportedMimeType(null, null)).toBeNull();
  });
});

describe("getErrorMessage", () => {
  it("reads Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("reads a message-bearing object", () => {
    expect(getErrorMessage({ message: "nope" })).toBe("nope");
  });
  it("returns empty string otherwise", () => {
    expect(getErrorMessage(42)).toBe("");
  });
});

describe("getAvatarSetupError", () => {
  it("explains a missing avatar_source column", () => {
    const out = getAvatarSetupError({ message: "column avatar_source ... schema cache" });
    expect(out).toBeInstanceOf(Error);
    expect((out as Error).message).toMatch(/migrations/i);
  });
  it("explains an RLS policy error", () => {
    const out = getAvatarSetupError({ message: "new row violates row-level security policy" });
    expect((out as Error).message).toMatch(/permissions/i);
  });
  it("passes through unrelated errors unchanged", () => {
    const original = { message: "some other failure" };
    expect(getAvatarSetupError(original)).toBe(original);
  });
});

describe("isMissingDisplayNameColumn", () => {
  it("is true for PGRST204 mentioning display_name", () => {
    expect(isMissingDisplayNameColumn({ code: "PGRST204", message: "display_name?" })).toBe(true);
  });
  it("is false otherwise", () => {
    expect(isMissingDisplayNameColumn({ code: "PGRST204", message: "email" })).toBe(false);
    expect(isMissingDisplayNameColumn(null)).toBe(false);
  });
});

describe("getOAuthAvatarUrl", () => {
  const user = (m: User["user_metadata"]) => ({ id: "1", user_metadata: m }) as User;
  it("prefers avatar_url", () => {
    expect(getOAuthAvatarUrl(user({ avatar_url: "a", picture: "p" }))).toBe("a");
  });
  it("falls back to picture", () => {
    expect(getOAuthAvatarUrl(user({ picture: "p" }))).toBe("p");
  });
  it("returns null with no user", () => {
    expect(getOAuthAvatarUrl(null)).toBeNull();
  });
});

describe("decodeBase64ToArrayBuffer", () => {
  it("round-trips ASCII bytes", () => {
    const buf = decodeBase64ToArrayBuffer(Buffer.from("hi").toString("base64"));
    expect(Array.from(new Uint8Array(buf))).toEqual([104, 105]);
  });
});
