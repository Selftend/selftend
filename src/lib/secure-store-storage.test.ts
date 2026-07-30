import * as SecureStore from "expo-secure-store";

import {
  secureStoreStorage,
  SECURE_STORE_CHUNK_SIZE,
  SECURE_STORE_SET_OPTIONS,
} from "@/src/lib/secure-store-storage";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  // Real expo-secure-store exports this as a numeric
  // KeychainAccessibilityConstant; the value only has to be distinguishable
  // from the other constants for these assertions.
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 3,
  WHEN_UNLOCKED: 5,
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
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "auth-token",
      "small-session",
      SECURE_STORE_SET_OPTIONS,
    );
  });

  it("splits large values into SecureStore-safe chunks", async () => {
    const value = "a".repeat(SECURE_STORE_CHUNK_SIZE * 2 + 12);
    mockGetItemAsync.mockResolvedValueOnce(null);

    await secureStoreStorage.setItem("auth-token", value);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkKey("auth-token", 0),
      "a".repeat(SECURE_STORE_CHUNK_SIZE),
      SECURE_STORE_SET_OPTIONS,
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkKey("auth-token", 1),
      "a".repeat(SECURE_STORE_CHUNK_SIZE),
      SECURE_STORE_SET_OPTIONS,
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkKey("auth-token", 2),
      "a".repeat(12),
      SECURE_STORE_SET_OPTIONS,
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      chunkCountKey("auth-token"),
      "3",
      SECURE_STORE_SET_OPTIONS,
    );
    expect(mockSetItemAsync).not.toHaveBeenCalledWith("auth-token", value);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("auth-token");
  });

  // The exposure this guards: on iOS, any Keychain item that is not
  // `*ThisDeviceOnly` travels in an encrypted device backup and restores onto a
  // DIFFERENT device, so a backup plus its password yields a live refresh token
  // and every journal entry behind it. Dropping the third argument produces no
  // visible symptom and no failing behaviour test, which is exactly why the
  // accessibility constant is asserted directly rather than implied.
  it("pins every written item to this device so it cannot ride a device backup", async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await secureStoreStorage.setItem("auth-token", "small-session");
    await secureStoreStorage.setItem("big-token", "b".repeat(SECURE_STORE_CHUNK_SIZE + 1));

    expect(mockSetItemAsync.mock.calls.length).toBeGreaterThan(0);

    for (const call of mockSetItemAsync.mock.calls) {
      expect(call[2]).toEqual({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      expect(call[2]?.keychainAccessible).not.toBe(SecureStore.WHEN_UNLOCKED);
    }
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
