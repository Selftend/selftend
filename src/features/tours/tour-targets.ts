import { useCallback, useEffect } from "react";
import type { View } from "react-native";

// Module-level registry: components register measurable views under stable keys;
// tour components look targets up without prop-drilling across layout boundaries
// (e.g. the hamburger lives in app-header, the check-in widget in today-screen).
const targets = new Map<string, View>();
const listeners = new Set<() => void>();

let _version = 0;

function notify() {
  for (const listener of listeners) listener();
}

export function setTourTarget(key: string, ref: View | null): void {
  if (ref) targets.set(key, ref);
  else targets.delete(key);
  _version += 1;
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

/** Ref callback that registers this view as a tour target; unregisters on unmount. */
export function useTourTargetRef(key: string): (ref: View | null) => void {
  useEffect(() => () => setTourTarget(key, null), [key]);
  return useCallback((ref: View | null) => setTourTarget(key, ref), [key]);
}
