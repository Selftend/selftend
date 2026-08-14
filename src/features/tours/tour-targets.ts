import { useCallback, useEffect } from "react";
import type { View } from "react-native";

// Module-level registry: components register measurable views under stable keys;
// tour components look targets up without prop-drilling across layout boundaries
// (e.g. the hamburger lives in invisible-header, the check-in widget in today-screen).
const targets = new Map<string, View>();
const listeners = new Set<() => void>();

let _version = 0;
/**
 * The registered keys as a value, recomputed on write and never on read.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return the SAME reference until the
 * store actually changes - building this array inside the getter would hand React a fresh
 * array every render and spin it forever. Keeping it here is what lets a consumer read the
 * registry as reactive DATA rather than reading a version counter and then calling
 * `getTourTarget` imperatively during render, which is invisible to the React Compiler.
 */
let _registeredKeys: readonly string[] = [];

/** Stable empty snapshot for the server/initial render. */
const NO_KEYS: readonly string[] = [];

function notify() {
  for (const listener of listeners) listener();
}

export function setTourTarget(key: string, ref: View | null): void {
  if (ref) targets.set(key, ref);
  else targets.delete(key);
  _version += 1;
  _registeredKeys = [...targets.keys()];
  notify();
}

export function getTourTarget(key: string): View | null {
  return targets.get(key) ?? null;
}

export function subscribeTourTargets(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns a monotonically increasing counter, incremented on every setTourTarget call. */
export function getTourTargetVersion(): number {
  return _version;
}

/** The keys with a registered target right now, as a `useSyncExternalStore` snapshot. */
export function getRegisteredTourTargetKeys(): readonly string[] {
  return _registeredKeys;
}

/** The server/initial snapshot: nothing has registered yet. */
export function getNoTourTargetKeys(): readonly string[] {
  return NO_KEYS;
}

/** Ref callback that registers this view as a tour target; unregisters on unmount. */
export function useTourTargetRef(key: string): (ref: View | null) => void {
  useEffect(() => () => setTourTarget(key, null), [key]);
  return useCallback((ref: View | null) => setTourTarget(key, ref), [key]);
}
