import Constants from "expo-constants";
import { Platform } from "react-native";

import { appEnv } from "@/src/lib/env";

// The fetch+compare core of the update surface (#388 spec sections 2-3).
// Platform-free and side-effect-free: the hook in use-update-availability.ts
// owns timing (throttle, grace window) and storage (per-version dismissal);
// this module answers "what is deployed?" and "is that newer than me?".

export interface VersionDocument {
  version: string;
  publishedAt: string;
}

/**
 * The running app's version. One source of truth end to end: package.json ->
 * app.config.ts `version` -> expo-constants at runtime, on every platform
 * (native versionName and the web bundle are both baked from it at build).
 * The spec named expo-application for native; expo-constants reads the same
 * value with no new dependency, which the dependency policy prefers.
 */
export function getRunningVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Strict x.y.z parse; anything else (prerelease tags included) is rejected. */
export function parseSemver(value: unknown): [number, number, number] | null {
  if (typeof value !== "string") return null;
  const match = SEMVER.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * True only when `candidate` is STRICTLY newer than `running` and both parse.
 * Running-ahead (a dev build newer than the deploy) is "nothing to offer", not
 * an error - the banner must never fire on it.
 */
export function isNewerVersion(candidate: string, running: string): boolean {
  const c = parseSemver(candidate);
  const r = parseSemver(running);
  if (!c || !r) return false;
  for (let i = 0; i < 3; i++) {
    if (c[i] !== r[i]) return c[i] > r[i];
  }
  return false;
}

/**
 * Where the version document lives. Web fetches same-origin so the check
 * works on any host (self-hosters included); native has no origin, so it
 * reads the configured public app URL and quietly gives up when unset.
 */
export function getVersionDocumentUrl(): string | null {
  if (Platform.OS === "web") return "/version.json";
  const base = appEnv.publicAppUrl.trim();
  if (!base) return null;
  try {
    return new URL("/version.json", base).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch and validate the deployed version document. EVERY failure mode -
 * network error, non-200, non-JSON (including the SPA fallback that answers
 * 200 text/html before the first deploy that writes the document), missing or
 * malformed fields - resolves to null: "no answer", never a prompt.
 */
export async function fetchVersionDocument(): Promise<VersionDocument | null> {
  const url = getVersionDocumentUrl();
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) return null;
    const { version, publishedAt } = data as { version?: unknown; publishedAt?: unknown };
    if (!parseSemver(version)) return null;
    if (typeof publishedAt !== "string" || Number.isNaN(Date.parse(publishedAt))) return null;
    return { version: version as string, publishedAt };
  } catch {
    return null;
  }
}
