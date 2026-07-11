import type { User } from "@supabase/supabase-js";

import {
  getOrSyncUserProfile,
  removeCurrentUserUploadedAvatar,
  removeUserAvatar,
  resetUserAvatarToOAuth,
  updateUserDisplayName,
  uploadUserAvatar,
} from "@/src/features/profile/repository";
import type { ProfileRow } from "@/src/features/profile/profile-sync";
import { requireSupabase } from "@/src/lib/supabase";

// IO characterization tests for repository.ts's orchestration functions: what DB/storage
// calls each function makes, in what order, and how it maps read/write results and errors.
// Pure mapping/decision logic lives in profile-sync.test.ts / profile-avatar.test.ts.

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    user_id: "u1",
    email: "p@e.com",
    display_name: "Pat",
    avatar_url: null,
    avatar_storage_path: null,
    avatar_source: null,
    avatar_updated_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "p@e.com",
    user_metadata: {},
    ...overrides,
  } as User;
}

/** A chainable mock for `client.from("profiles")`: select().eq().maybeSingle() and
 * insert().select().single(), where each successive insert() call resolves the next
 * entry of `insertResults` (defaulting to the last entry once exhausted). */
function mockProfilesTable(options: {
  existingRow?: ProfileRow | null;
  selectError?: unknown;
  insertResults?: { data: ProfileRow | null; error: unknown }[];
}) {
  const { existingRow = null, selectError = null, insertResults = [] } = options;

  const maybeSingle = jest
    .fn()
    .mockResolvedValue({ data: existingRow, error: selectError ?? null });
  const eq = jest.fn(() => ({ maybeSingle }));
  // Two call shapes exist in repository.ts: getCurrentProfileRow chains
  // .select().eq().maybeSingle(), while removeCurrentUserUploadedAvatar chains
  // .select().maybeSingle() directly (RLS scopes it to the caller). Support both.
  const select = jest.fn(() => ({ eq, maybeSingle }));

  const single = jest.fn(() => {
    const index = Math.min(single.mock.calls.length - 1, insertResults.length - 1);
    const result = insertResults[Math.max(index, 0)] ?? { data: null, error: null };
    return Promise.resolve(result);
  });
  const insertSelect = jest.fn(() => ({ single }));
  const insert = jest.fn((_payload: Record<string, unknown>) => ({ select: insertSelect }));

  return { select, eq, maybeSingle, insert, insertSelect, single };
}

function mockStorage(
  overrides: {
    uploadError?: unknown;
    removeError?: unknown;
    signedUrl?: string | null;
    signedUrlError?: unknown;
  } = {},
) {
  const upload = jest.fn().mockResolvedValue({ error: overrides.uploadError ?? null });
  const remove = jest.fn().mockResolvedValue({ error: overrides.removeError ?? null });
  const createSignedUrl = jest.fn().mockResolvedValue({
    data:
      overrides.signedUrl === undefined
        ? { signedUrl: "https://signed.example/avatar.jpg" }
        : { signedUrl: overrides.signedUrl },
    error: overrides.signedUrlError ?? null,
  });
  const from = jest.fn(() => ({ upload, remove, createSignedUrl }));

  return { from, upload, remove, createSignedUrl };
}

/** Wires a fake Supabase client (profiles table + storage bucket) as the return value of
 * the mocked `requireSupabase()`. */
function mockClient(
  tableOptions: Parameters<typeof mockProfilesTable>[0] = {},
  storageOptions: Parameters<typeof mockStorage>[0] = {},
) {
  const table = mockProfilesTable(tableOptions);
  const storage = mockStorage(storageOptions);
  const from = jest.fn(() => ({ select: table.select, insert: table.insert }));

  mockRequireSupabase.mockReturnValue({ from, storage: { from: storage.from } } as never);

  return { from, table, storage };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateUserDisplayName", () => {
  it("rejects an over-long name before any DB call", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as never);

    await expect(updateUserDisplayName("u1", "x".repeat(101))).rejects.toThrow(/100 characters/);
    expect(from).not.toHaveBeenCalled();
  });

  it("writes the trimmed name and returns the mapped profile on the happy path", async () => {
    const existing = buildRow({ display_name: "Old Name" });
    const updated = buildRow({ display_name: "New Name" });
    const { table } = mockClient({
      existingRow: existing,
      insertResults: [{ data: updated, error: null }],
    });

    const result = await updateUserDisplayName("u1", "  New Name  ");

    expect(result).toMatchObject({ userId: "u1", displayName: "New Name" });
    expect(table.insert).toHaveBeenCalledTimes(1);
    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", display_name: "New Name" }),
    );
  });

  it("clears the display name when given a blank string", async () => {
    const existing = buildRow({ display_name: "Old Name" });
    const cleared = buildRow({ display_name: null });
    const { table } = mockClient({
      existingRow: existing,
      insertResults: [{ data: cleared, error: null }],
    });

    await updateUserDisplayName("u1", "   ");

    expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ display_name: null }));
  });

  it("maps a PGRST204 display_name error to a friendly 'not available yet' error without retrying", async () => {
    const existing = buildRow();
    const { table } = mockClient({
      existingRow: existing,
      insertResults: [
        { data: null, error: { code: "PGRST204", message: "Could not find display_name column" } },
      ],
    });

    await expect(updateUserDisplayName("u1", "New Name")).rejects.toThrow(/not available yet/);
    // Unlike getOrSyncUserProfile, updateUserDisplayName does NOT retry name-less: the
    // whole point of the call is to set the name, so a fallback write would silently drop it.
    expect(table.insert).toHaveBeenCalledTimes(1);
  });

  it("rethrows an unrelated write error unchanged", async () => {
    const existing = buildRow();
    const otherError = { code: "23505", message: "duplicate key value" };
    mockClient({
      existingRow: existing,
      insertResults: [{ data: null, error: otherError }],
    });

    await expect(updateUserDisplayName("u1", "New Name")).rejects.toBe(otherError);
  });
});

describe("getOrSyncUserProfile", () => {
  it("returns the existing row unchanged when nothing needs syncing", async () => {
    const existing = buildRow({ email: "p@e.com", avatar_url: null, avatar_source: null });
    const { table } = mockClient({ existingRow: existing });

    const result = await getOrSyncUserProfile(buildUser({ email: "p@e.com", user_metadata: {} }));

    expect(result).toMatchObject({ userId: "u1", displayName: "Pat" });
    expect(table.insert).not.toHaveBeenCalled();
  });

  it("writes when a synced field (email) changed, without importing a name", async () => {
    const existing = buildRow({ email: "old@e.com" });
    const updated = buildRow({ email: "new@e.com" });
    const { table } = mockClient({
      existingRow: existing,
      insertResults: [{ data: updated, error: null }],
    });

    const result = await getOrSyncUserProfile(buildUser({ email: "new@e.com", user_metadata: {} }));

    expect(result).toMatchObject({ userId: "u1", email: "new@e.com" });
    expect(table.insert).toHaveBeenCalledTimes(1);
    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@e.com", display_name: "Pat" }),
    );
  });

  it("imports the OAuth full_name into a blank display_name", async () => {
    const existing = buildRow({ display_name: null });
    const updated = buildRow({ display_name: "Imported Name" });
    const { table } = mockClient({
      existingRow: existing,
      insertResults: [{ data: updated, error: null }],
    });

    const result = await getOrSyncUserProfile(
      buildUser({ user_metadata: { full_name: "Imported Name" } }),
    );

    expect(result).toMatchObject({ displayName: "Imported Name" });
    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Imported Name" }),
    );
  });

  it("falls back to a name-less write on a PGRST204 display_name error", async () => {
    // No existing row; a name is present in metadata, so a write is attempted; the
    // primary (with display_name) write fails PGRST204, so a name-less retry follows.
    const row = buildRow({ display_name: null });
    const { table } = mockClient({
      existingRow: null,
      insertResults: [
        { data: null, error: { code: "PGRST204", message: "display_name column missing" } },
        { data: row, error: null },
      ],
    });

    const result = await getOrSyncUserProfile(buildUser({ user_metadata: { full_name: "Pat" } }));

    expect(result).toMatchObject({ userId: "u1" });
    expect(table.insert).toHaveBeenCalledTimes(2); // primary write + name-less fallback
    // The fallback write must omit display_name entirely (not send it as null either).
    const fallbackPayload = table.insert.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty("display_name");
  });

  it("wraps a non-PGRST204 write failure via getAvatarSetupError instead of retrying", async () => {
    const rlsError = { message: "new row violates row-level security policy" };
    const { table } = mockClient({
      existingRow: null,
      insertResults: [{ data: null, error: rlsError }],
    });

    await expect(
      getOrSyncUserProfile(buildUser({ user_metadata: { full_name: "Pat" } })),
    ).rejects.toThrow(/permissions/i);
    expect(table.insert).toHaveBeenCalledTimes(1);
  });

  it("wraps a profile-select failure via getAvatarSetupError", async () => {
    mockClient({
      selectError: { message: "new row violates row-level security policy" },
    });

    await expect(getOrSyncUserProfile(buildUser())).rejects.toThrow(/permissions/i);
  });
});

describe("uploadUserAvatar", () => {
  const base64Input = {
    userId: "u1",
    uri: "file:///avatar.jpg",
    base64: Buffer.from("fake-image-bytes").toString("base64"),
    fileName: "avatar.jpg",
    mimeType: "image/jpeg",
  };

  it("rejects an unsupported file type before touching storage", async () => {
    const { storage } = mockClient();

    await expect(
      uploadUserAvatar({ ...base64Input, mimeType: "image/gif", fileName: "avatar.gif" }),
    ).rejects.toThrow(/JPEG, PNG, or WebP/);
    expect(storage.from).not.toHaveBeenCalled();
  });

  it("uploads, writes the profile, and returns a signed URL for the new upload", async () => {
    const uploadedRow = buildRow({
      avatar_source: "upload",
      avatar_storage_path: "u1/avatar-123.jpg",
      avatar_url: null,
    });
    const { storage, table } = mockClient(
      { existingRow: buildRow(), insertResults: [{ data: uploadedRow, error: null }] },
      { signedUrl: "https://signed.example/new-avatar.jpg" },
    );

    const result = await uploadUserAvatar(base64Input);

    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ avatar_source: "upload" }));
    expect(storage.createSignedUrl).toHaveBeenCalledWith("u1/avatar-123.jpg", expect.any(Number));
    expect(result).toMatchObject({
      userId: "u1",
      avatarSource: "upload",
      avatarUrl: "https://signed.example/new-avatar.jpg",
    });
    // No previous object to clean up.
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("removes the old storage object once the new one is written successfully", async () => {
    const uploadedRow = buildRow({
      avatar_source: "upload",
      avatar_storage_path: "u1/avatar-new.jpg",
    });
    const { storage } = mockClient(
      { existingRow: buildRow(), insertResults: [{ data: uploadedRow, error: null }] },
      {},
    );

    await uploadUserAvatar({ ...base64Input, previousStoragePath: "u1/avatar-old.jpg" });

    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith(["u1/avatar-old.jpg"]);
  });

  it("cleans up the freshly uploaded object when the profile write fails", async () => {
    const dbError = { message: "some other failure" };
    const { storage, table } = mockClient(
      { existingRow: buildRow(), insertResults: [{ data: null, error: dbError }] },
      {},
    );

    await expect(uploadUserAvatar(base64Input)).rejects.toBe(dbError);

    expect(table.insert).toHaveBeenCalledTimes(1);
    // Cleanup targets the object this call just created, not any previous one.
    expect(storage.remove).toHaveBeenCalledTimes(1);
    const [[removedPaths]] = storage.remove.mock.calls;
    expect(removedPaths[0]).toMatch(/^u1\/avatar-\d+\.jpg$/);
  });

  it("maps a storage upload failure via getAvatarSetupError without attempting a DB write", async () => {
    const { table } = mockClient(
      {},
      { uploadError: { message: "new row violates row-level security policy" } },
    );

    await expect(uploadUserAvatar(base64Input)).rejects.toThrow(/permissions/i);
    expect(table.insert).not.toHaveBeenCalled();
  });

  it("fetches the URI into bytes when no base64 payload is provided", async () => {
    const bytes = new TextEncoder().encode("bytes").buffer;
    const fetchMock = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(bytes) });
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const uploadedRow = buildRow({
        avatar_source: "upload",
        avatar_storage_path: "u1/avatar-fetched.jpg",
      });
      mockClient({
        existingRow: buildRow(),
        insertResults: [{ data: uploadedRow, error: null }],
      });

      await uploadUserAvatar({
        userId: "u1",
        uri: "https://example.com/pic.jpg",
        fileName: "pic.jpg",
        mimeType: "image/jpeg",
      });

      expect(fetchMock).toHaveBeenCalledWith("https://example.com/pic.jpg");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("returns a null avatar URL when the upload row has no storage path", async () => {
    const uploadedRow = buildRow({ avatar_source: "upload", avatar_storage_path: null });
    const { storage } = mockClient({
      existingRow: buildRow(),
      insertResults: [{ data: uploadedRow, error: null }],
    });

    const result = await uploadUserAvatar(base64Input);

    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(result.avatarUrl).toBeNull();
  });

  it("wraps a signed-URL creation error via getAvatarSetupError", async () => {
    const uploadedRow = buildRow({
      avatar_source: "upload",
      avatar_storage_path: "u1/avatar-x.jpg",
    });
    mockClient(
      { existingRow: buildRow(), insertResults: [{ data: uploadedRow, error: null }] },
      { signedUrlError: { message: "new row violates row-level security policy" } },
    );

    await expect(uploadUserAvatar(base64Input)).rejects.toThrow(/permissions/i);
  });

  it("throws when the signed-URL response is missing a URL", async () => {
    const uploadedRow = buildRow({
      avatar_source: "upload",
      avatar_storage_path: "u1/avatar-x.jpg",
    });
    mockClient(
      { existingRow: buildRow(), insertResults: [{ data: uploadedRow, error: null }] },
      { signedUrl: null },
    );

    await expect(uploadUserAvatar(base64Input)).rejects.toThrow(
      /Unable to create a signed profile picture URL/,
    );
  });
});

describe("removeUserAvatar", () => {
  it("clears the avatar columns and removes the previous storage object", async () => {
    const cleared = buildRow({ avatar_source: null, avatar_url: null, avatar_storage_path: null });
    const { storage, table } = mockClient({
      existingRow: buildRow({ avatar_source: "upload", avatar_storage_path: "u1/avatar-old.jpg" }),
      insertResults: [{ data: cleared, error: null }],
    });

    const result = await removeUserAvatar("u1", "u1/avatar-old.jpg");

    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_source: null, avatar_storage_path: null }),
    );
    expect(storage.remove).toHaveBeenCalledWith(["u1/avatar-old.jpg"]);
    expect(result).toMatchObject({ avatarSource: null });
  });

  it("skips storage removal when there is no previous storage path", async () => {
    const cleared = buildRow({ avatar_source: null });
    const { storage } = mockClient({
      existingRow: buildRow(),
      insertResults: [{ data: cleared, error: null }],
    });

    await removeUserAvatar("u1", null);

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("logs rather than throws when storage removal of the previous object fails", async () => {
    const cleared = buildRow({ avatar_source: null });
    const { storage } = mockClient(
      { existingRow: buildRow(), insertResults: [{ data: cleared, error: null }] },
      { removeError: { message: "object not found" } },
    );
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await expect(removeUserAvatar("u1", "u1/avatar-old.jpg")).resolves.toMatchObject({
      avatarSource: null,
    });

    expect(storage.remove).toHaveBeenCalledWith(["u1/avatar-old.jpg"]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to remove stored avatar object:",
      "object not found",
    );
    warnSpy.mockRestore();
  });

  it("wraps a write failure via getAvatarSetupError", async () => {
    mockClient({
      existingRow: buildRow(),
      insertResults: [
        { data: null, error: { message: "new row violates row-level security policy" } },
      ],
    });

    await expect(removeUserAvatar("u1")).rejects.toThrow(/permissions/i);
  });
});

describe("resetUserAvatarToOAuth", () => {
  it("writes the OAuth avatar and removes the previous uploaded object", async () => {
    const updated = buildRow({
      avatar_source: "oauth",
      avatar_url: "https://oauth.example/pic.jpg",
    });
    const { storage, table } = mockClient({
      existingRow: buildRow({ avatar_source: "upload", avatar_storage_path: "u1/avatar-old.jpg" }),
      insertResults: [{ data: updated, error: null }],
    });

    const result = await resetUserAvatarToOAuth(
      buildUser({ user_metadata: { avatar_url: "https://oauth.example/pic.jpg" } }),
      "u1/avatar-old.jpg",
    );

    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_source: "oauth", avatar_storage_path: null }),
    );
    expect(storage.remove).toHaveBeenCalledWith(["u1/avatar-old.jpg"]);
    expect(result).toMatchObject({ avatarSource: "oauth" });
  });

  it("clears avatar_source when the OAuth provider has no picture", async () => {
    const updated = buildRow({ avatar_source: null, avatar_url: null });
    const { table } = mockClient({
      existingRow: buildRow(),
      insertResults: [{ data: updated, error: null }],
    });

    await resetUserAvatarToOAuth(buildUser({ user_metadata: {} }));

    expect(table.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_source: null,
        avatar_url: null,
        avatar_updated_at: null,
      }),
    );
  });

  it("wraps a write failure via getAvatarSetupError", async () => {
    mockClient({
      existingRow: buildRow(),
      insertResults: [
        { data: null, error: { message: "new row violates row-level security policy" } },
      ],
    });

    await expect(resetUserAvatarToOAuth(buildUser())).rejects.toThrow(/permissions/i);
  });
});

describe("removeCurrentUserUploadedAvatar", () => {
  it("removes the storage object when the current profile's avatar is an upload", async () => {
    const { storage } = mockClient({
      existingRow: buildRow({ avatar_source: "upload", avatar_storage_path: "u1/avatar-x.jpg" }),
    });

    await removeCurrentUserUploadedAvatar();

    expect(storage.remove).toHaveBeenCalledWith(["u1/avatar-x.jpg"]);
  });

  it("does nothing when the current avatar is not an upload", async () => {
    const { storage } = mockClient({ existingRow: buildRow({ avatar_source: "oauth" }) });

    await removeCurrentUserUploadedAvatar();

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("does nothing when there is no current profile row", async () => {
    const { storage } = mockClient({ existingRow: null });

    await removeCurrentUserUploadedAvatar();

    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("wraps a select failure via getAvatarSetupError", async () => {
    mockClient({ selectError: { message: "new row violates row-level security policy" } });

    await expect(removeCurrentUserUploadedAvatar()).rejects.toThrow(/permissions/i);
  });
});
