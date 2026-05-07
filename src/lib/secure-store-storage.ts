import type { SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export const SECURE_STORE_CHUNK_SIZE = 1800;

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
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const chunks = chunkValue(value);

  for (const [index, chunk] of chunks.entries()) {
    await SecureStore.setItemAsync(getChunkKey(key, index), chunk);
  }

  await SecureStore.setItemAsync(getChunkCountKey(key), String(chunks.length));
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
