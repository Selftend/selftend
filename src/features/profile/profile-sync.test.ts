import {
  buildSyncedProfileFields,
  isRemovedAvatarRow,
  hasProfileFieldChanges,
  pickMutableFields,
  emptyMutableFields,
  mapUserProfile,
} from "@/src/features/profile/profile-sync";

const now = "2026-05-03T12:00:00.000Z";

describe("buildSyncedProfileFields", () => {
  it("imports an OAuth avatar for a new profile", () => {
    expect(buildSyncedProfileFields(null, "p@e.com", "https://x/a.jpg", now)).toEqual({
      email: "p@e.com",
      avatar_url: "https://x/a.jpg",
      avatar_storage_path: null,
      avatar_source: "oauth",
      avatar_updated_at: now,
    });
  });

  it("gives a new profile null avatar fields when there is no OAuth url", () => {
    expect(buildSyncedProfileFields(null, "p@e.com", null, now)).toEqual({
      email: "p@e.com",
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: null,
      avatar_updated_at: null,
    });
  });

  it("keeps a manually uploaded avatar when OAuth metadata changes", () => {
    const row = {
      email: "old@e.com",
      avatar_url: null,
      avatar_storage_path: "u/av.jpg",
      avatar_source: "upload" as const,
      avatar_updated_at: "2026-05-02T12:00:00.000Z",
    };
    expect(buildSyncedProfileFields(row, "p@e.com", "https://x/a.jpg", now)).toMatchObject({
      email: "p@e.com",
      avatar_source: "upload",
      avatar_storage_path: "u/av.jpg",
    });
  });

  it("refreshes an oauth avatar when the url changes", () => {
    const row = {
      email: "p@e.com",
      avatar_url: "https://x/old.jpg",
      avatar_storage_path: null,
      avatar_source: "oauth" as const,
      avatar_updated_at: "2026-05-02T12:00:00.000Z",
    };
    expect(buildSyncedProfileFields(row, "p@e.com", "https://x/new.jpg", now)).toMatchObject({
      avatar_url: "https://x/new.jpg",
      avatar_source: "oauth",
      avatar_updated_at: now,
    });
  });

  it("clears an oauth avatar that disappeared upstream", () => {
    const row = {
      email: "p@e.com",
      avatar_url: "https://x/old.jpg",
      avatar_storage_path: null,
      avatar_source: "oauth" as const,
      avatar_updated_at: "2026-05-02T12:00:00.000Z",
    };
    expect(buildSyncedProfileFields(row, "p@e.com", null, now)).toMatchObject({
      avatar_url: null,
      avatar_source: null,
      avatar_updated_at: null,
    });
  });
});

describe("isRemovedAvatarRow", () => {
  it("is true when avatar_source is 'none'", () => {
    expect(
      isRemovedAvatarRow({
        avatar_source: "none",
        avatar_url: null,
        avatar_storage_path: null,
        avatar_updated_at: "t",
      }),
    ).toBe(true);
  });
  it("is true for an explicitly cleared row (null source, timestamp set)", () => {
    expect(
      isRemovedAvatarRow({
        avatar_source: null,
        avatar_url: null,
        avatar_storage_path: null,
        avatar_updated_at: "t",
      }),
    ).toBe(true);
  });
  it("is false for a fresh empty row", () => {
    expect(
      isRemovedAvatarRow({
        avatar_source: null,
        avatar_url: null,
        avatar_storage_path: null,
        avatar_updated_at: null,
      }),
    ).toBe(false);
  });
});

describe("hasProfileFieldChanges", () => {
  const base = {
    email: "a",
    avatar_url: "b",
    avatar_storage_path: "c",
    avatar_source: "oauth" as const,
    avatar_updated_at: "d",
  };
  it("detects an email change", () => {
    expect(hasProfileFieldChanges(base, { ...base, email: "z" })).toBe(true);
  });
  it("is false when nothing changed", () => {
    expect(hasProfileFieldChanges(base, { ...base })).toBe(false);
  });
});

describe("pickMutableFields / emptyMutableFields / mapUserProfile", () => {
  it("emptyMutableFields is all null", () => {
    expect(emptyMutableFields()).toEqual({
      email: null,
      display_name: null,
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: null,
      avatar_updated_at: null,
    });
  });
  it("pickMutableFields copies the mutable columns", () => {
    const row = {
      user_id: "u",
      email: "e",
      display_name: "n",
      avatar_url: "a",
      avatar_storage_path: "s",
      avatar_source: "oauth" as const,
      avatar_updated_at: "t",
      created_at: "c",
      updated_at: "u2",
    };
    expect(pickMutableFields(row)).toEqual({
      email: "e",
      display_name: "n",
      avatar_url: "a",
      avatar_storage_path: "s",
      avatar_source: "oauth",
      avatar_updated_at: "t",
    });
  });
  it("mapUserProfile applies the resolved avatar url", () => {
    const row = {
      user_id: "u",
      email: "e",
      display_name: "n",
      avatar_url: "ignored",
      avatar_storage_path: "s",
      avatar_source: "upload" as const,
      avatar_updated_at: "t",
      created_at: "c",
      updated_at: "u2",
    };
    expect(mapUserProfile(row, "signed")).toMatchObject({
      userId: "u",
      avatarUrl: "signed",
      displayName: "n",
    });
  });
});
