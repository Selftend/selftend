import * as SecureStore from "expo-secure-store";

import { secureStoreStorage, SECURE_STORE_CHUNK_SIZE } from "@/src/lib/secure-store-storage";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockDeleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
const mockGetItemAsync = jest.mocked(SecureStore.getItemAsync);
const mockSetItemAsync = jest.mocked(SecureStore.setItemAsync);

function chunkCountKey(key: string) {
  return `${key}.selftendChunkCount`;
}

function chunkKey(key: string, index: number) {
  return `${key}.selftendChunk.${index}`;
}

describe("secureStoreStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores small values directly and clears previous chunk metadata", async () => {
    mockGetItemAsync.mockResolvedValueOnce("2");

    await secureStoreStorage.setItem("auth-token", "small-session");

    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkCountKey("auth-token"));
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkKey("auth-token", 0));
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkKey("auth-token", 1));
    expect(mockSetItemAsync).toHaveBeenCalledWith("auth-token", "small-session");
  });

  it("splits large values into SecureStore-safe chunks", async () => {
    const value = "a".repeat(SECURE_STORE_CHUNK_SIZE * 2 + 12);
    mockGetItemAsync.mockResolvedValueOnce(null);

    await secureStoreStorage.setItem("auth-token", value);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkKey("auth-token", 0),
      "a".repeat(SECURE_STORE_CHUNK_SIZE),
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkKey("auth-token", 1),
      "a".repeat(SECURE_STORE_CHUNK_SIZE),
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(chunkKey("auth-token", 2), "a".repeat(12));
    expect(mockSetItemAsync).toHaveBeenCalledWith(chunkCountKey("auth-token"), "3");
    expect(mockSetItemAsync).not.toHaveBeenCalledWith("auth-token", value);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("auth-token");
  });

  it("reads chunked values when chunk metadata exists", async () => {
    mockGetItemAsync.mockImplementation(async (key) => {
      if (key === chunkCountKey("auth-token")) {
        return "3";
      }

      if (key === chunkKey("auth-token", 0)) {
        return "chunk-";
      }

      if (key === chunkKey("auth-token", 1)) {
        return "stored-";
      }

      if (key === chunkKey("auth-token", 2)) {
        return "session";
      }

      return null;
    });

    await expect(secureStoreStorage.getItem("auth-token")).resolves.toBe("chunk-stored-session");
  });

  it("falls back to direct SecureStore reads when no chunks exist", async () => {
    mockGetItemAsync.mockResolvedValueOnce(null).mockResolvedValueOnce("stored-session");

    await expect(secureStoreStorage.getItem("auth-token")).resolves.toBe("stored-session");
    expect(mockGetItemAsync).toHaveBeenCalledWith("auth-token");
  });

  it("removes direct and chunked storage for a key", async () => {
    mockGetItemAsync.mockResolvedValueOnce("2");

    await secureStoreStorage.removeItem("auth-token");

    expect(mockDeleteItemAsync).toHaveBeenCalledWith("auth-token");
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkCountKey("auth-token"));
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkKey("auth-token", 0));
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(chunkKey("auth-token", 1));
  });
});
