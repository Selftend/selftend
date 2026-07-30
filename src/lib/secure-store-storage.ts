import type { SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export const SECURE_STORE_CHUNK_SIZE = 1800;

// Keeps the Supabase session - refresh token included - out of device backups.
//
// expo-secure-store defaults to kSecAttrAccessibleWhenUnlocked, and on iOS any
// Keychain item that is not `*ThisDeviceOnly` is carried in an encrypted
// iTunes/Finder backup and RESTORES ONTO A DIFFERENT DEVICE. A backup plus its
// password would therefore hand over a live refresh token, and behind it the
// account and every journal entry the user has ever written. For a private
// mental-health journal that is the worst available failure, so the session is
// pinned to this device.
//
// The cost, accepted deliberately: a session no longer survives migration to a
// new phone, so someone restoring a backup signs in again rather than landing
// already-authenticated. That is the right trade here.
//
// iOS-only in effect - expo-secure-store applies `keychainAccessible` on iOS
// and ignores it on Android, so Android behaviour is unchanged. Note also that
// accessibility is fixed when an item is written: pre-existing items keep
// whatever they had until the value is next rewritten. Supabase rewrites the
// session on every token refresh, and iOS has never shipped, so there is no
// migration to perform.
export const SECURE_STORE_SET_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const CHUNK_COUNT_SUFFIX = ".selftendChunkCount";
const CHUNK_SUFFIX = ".selftendChunk.";

function getChunkCountKey(key: string) {
  return `${key}${CHUNK_COUNT_SUFFIX}`;
}

function getChunkKey(key: string, index: number) {
  return `${key}${CHUNK_SUFFIX}${index}`;
}

function chunkValue(value: string) {
  const chunks: string[] = [];

  for (let start = 0; start < value.length; start += SECURE_STORE_CHUNK_SIZE) {
    chunks.push(value.slice(start, start + SECURE_STORE_CHUNK_SIZE));
  }

  return chunks;
}

async function getStoredChunkCount(key: string) {
  const rawCount = await SecureStore.getItemAsync(getChunkCountKey(key));
  const count = rawCount ? Number(rawCount) : 0;

  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function deleteChunks(key: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    await SecureStore.deleteItemAsync(getChunkKey(key, index));
  }
}

async function getItem(key: string) {
  const chunkCount = await getStoredChunkCount(key);

  if (chunkCount === 0) {
    return SecureStore.getItemAsync(key);
  }

  const chunks: string[] = [];

  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = await SecureStore.getItemAsync(getChunkKey(key, index));

    if (chunk === null) {
      return null;
    }

    chunks.push(chunk);
  }

  return chunks.join("");
}

async function setItem(key: string, value: string) {
  const previousChunkCount = await getStoredChunkCount(key);

  if (value.length <= SECURE_STORE_CHUNK_SIZE) {
    await SecureStore.deleteItemAsync(getChunkCountKey(key));
    await deleteChunks(key, previousChunkCount);
    await SecureStore.setItemAsync(key, value, SECURE_STORE_SET_OPTIONS);
    return;
  }

  const chunks = chunkValue(value);

  for (const [index, chunk] of chunks.entries()) {
    await SecureStore.setItemAsync(getChunkKey(key, index), chunk, SECURE_STORE_SET_OPTIONS);
  }

  await SecureStore.setItemAsync(
    getChunkCountKey(key),
    String(chunks.length),
    SECURE_STORE_SET_OPTIONS,
  );
  await SecureStore.deleteItemAsync(key);

  if (previousChunkCount > chunks.length) {
    for (let index = chunks.length; index < previousChunkCount; index += 1) {
      await SecureStore.deleteItemAsync(getChunkKey(key, index));
    }
  }
}

async function removeItem(key: string) {
  const previousChunkCount = await getStoredChunkCount(key);

  await SecureStore.deleteItemAsync(key);
  await SecureStore.deleteItemAsync(getChunkCountKey(key));
  await deleteChunks(key, previousChunkCount);
}

export const secureStoreStorage: SupportedStorage = {
  getItem,
  removeItem,
  setItem,
};
