import type { User } from "@supabase/supabase-js";

import { buildSyncedProfileFields, getOAuthAvatarUrl } from "@/src/features/profile/repository";

function userWithMetadata(user_metadata: User["user_metadata"]) {
  return {
    id: "user-1",
    email: "person@example.com",
    user_metadata,
  } as User;
}

describe("getOAuthAvatarUrl", () => {
  it("reads the Google avatar URL from Supabase user metadata", () => {
    expect(
      getOAuthAvatarUrl(
        userWithMetadata({
          avatar_url: "https://example.com/avatar.jpg",
          picture: "https://example.com/picture.jpg",
        }),
      ),
    ).toBe("https://example.com/avatar.jpg");
  });

  it("falls back to picture metadata", () => {
    expect(
      getOAuthAvatarUrl(
        userWithMetadata({
          picture: "https://example.com/picture.jpg",
        }),
      ),
    ).toBe("https://example.com/picture.jpg");
  });
});

describe("buildSyncedProfileFields", () => {
  const now = "2026-05-03T12:00:00.000Z";

  it("imports an OAuth avatar for a new profile", () => {
    expect(
      buildSyncedProfileFields(null, "person@example.com", "https://example.com/avatar.jpg", now),
    ).toEqual({
      email: "person@example.com",
      avatar_url: "https://example.com/avatar.jpg",
      avatar_storage_path: null,
      avatar_source: "oauth",
      avatar_updated_at: now,
    });
  });

  it("keeps a manually uploaded avatar when OAuth metadata changes", () => {
    expect(
      buildSyncedProfileFields(
        {
          email: "old@example.com",
          avatar_url: null,
          avatar_storage_path: "user-1/avatar.jpg",
          avatar_source: "upload",
          avatar_updated_at: "2026-05-02T12:00:00.000Z",
        },
        "person@example.com",
        "https://example.com/avatar.jpg",
        now,
      ),
    ).toEqual({
      email: "person@example.com",
      avatar_url: null,
      avatar_storage_path: "user-1/avatar.jpg",
      avatar_source: "upload",
      avatar_updated_at: "2026-05-02T12:00:00.000Z",
    });
  });

  it("updates an OAuth avatar when no manual avatar exists", () => {
    expect(
      buildSyncedProfileFields(
        {
          email: "person@example.com",
          avatar_url: "https://example.com/old.jpg",
          avatar_storage_path: null,
          avatar_source: "oauth",
          avatar_updated_at: "2026-05-02T12:00:00.000Z",
        },
        "person@example.com",
        "https://example.com/new.jpg",
        now,
      ),
    ).toEqual({
      email: "person@example.com",
      avatar_url: "https://example.com/new.jpg",
      avatar_storage_path: null,
      avatar_source: "oauth",
      avatar_updated_at: now,
    });
  });

  it("does not reimport an OAuth avatar after the user removes their photo", () => {
    expect(
      buildSyncedProfileFields(
        {
          email: "person@example.com",
          avatar_url: null,
          avatar_storage_path: null,
          avatar_source: null,
          avatar_updated_at: "2026-05-02T12:00:00.000Z",
        },
        "person@example.com",
        "https://example.com/avatar.jpg",
        now,
      ),
    ).toEqual({
      email: "person@example.com",
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: null,
      avatar_updated_at: "2026-05-02T12:00:00.000Z",
    });
  });

  it("still respects legacy removed-photo rows if avatar_source none exists", () => {
    expect(
      buildSyncedProfileFields(
        {
          email: "person@example.com",
          avatar_url: null,
          avatar_storage_path: null,
          avatar_source: "none",
          avatar_updated_at: null,
        },
        "person@example.com",
        "https://example.com/avatar.jpg",
        now,
      ),
    ).toEqual({
      email: "person@example.com",
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: "none",
      avatar_updated_at: null,
    });
  });
});
