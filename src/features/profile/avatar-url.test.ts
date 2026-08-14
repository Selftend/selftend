import { resolveAvatarUrl } from "@/src/features/profile/avatar-url";

const googleUser = {
  user_metadata: { avatar_url: "https://lh3.googleusercontent.com/photo" },
} as never;
const pictureUser = { user_metadata: { picture: "https://example.test/picture" } } as never;

describe("resolveAvatarUrl", () => {
  it("prefers the stored profile avatar over OAuth metadata", () => {
    expect(resolveAvatarUrl({ avatarUrl: "https://cdn.test/uploaded.jpg" }, googleUser)).toBe(
      "https://cdn.test/uploaded.jpg",
    );
  });

  it("falls back to the OAuth photo when nothing is stored", () => {
    expect(resolveAvatarUrl({ avatarUrl: null }, googleUser)).toBe(
      "https://lh3.googleusercontent.com/photo",
    );
  });

  // Providers differ: Google sends `avatar_url`, others send `picture`.
  it("accepts either OAuth metadata key", () => {
    expect(resolveAvatarUrl(null, pictureUser)).toBe("https://example.test/picture");
  });

  it("is null for an email user with no photo, which renders the initial", () => {
    expect(resolveAvatarUrl({ avatarUrl: null }, { user_metadata: {} } as never)).toBeNull();
  });

  it("survives a missing profile and a missing user", () => {
    expect(resolveAvatarUrl(undefined, null)).toBeNull();
  });
});
