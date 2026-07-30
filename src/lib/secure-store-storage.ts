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
// and ignores it on Android, so Android behaviour is unchanged.
//
// This option only ever applies to items created AFTER it, and rewriting does
// NOT upgrade an existing item. expo-secure-store calls `SecItemAdd`, and on
// `errSecDuplicateItem` falls back to `SecItemUpdate` with an update dictionary
// of `[kSecValueData: ...]` only (see
// node_modules/expo-secure-store/ios/SecureStoreModule.swift), so
// `kSecAttrAccessible` is left exactly as first written. An item stored under
// the old default therefore stays backup-migratable for the life of the
// keychain entry - and keychain entries can outlive an app uninstall.
//
// Nothing needs migrating here for one reason only: iOS has never shipped, so
// no item under this bundle identifier exists to be stuck. Do not read this as
// "it heals on the next token refresh" - it does not.
//
// Consequence for any FUTURE change to accessibility: it must explicitly delete
// and recreate every key, because a plain rewrite will silently keep the old
// class. (Caught in review on PR #531.)
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
