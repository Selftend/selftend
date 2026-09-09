import { create } from "zustand";

import type { NotificationTargetKey } from "@/src/features/notifications/registry";

interface ReminderPromptRequest {
  targetKey: NotificationTargetKey;
  // When the completion that triggered the prompt happened (epoch ms); the
  // card proposes this, rounded, as the daily reminder time.
  completedAt: number;
}

interface ReminderPromptState {
  request: ReminderPromptRequest | null;
  // True while the reminder prompt card is on screen. Published by the card so
  // the starter-routine offer (#1677) can yield: both floaters share the same
  // bottom slot, and on any save the reminder prompt wins.
  promptVisible: boolean;
  // Called by tool save flows after a successful save. Eligibility is decided
  // by the host card, so call sites stay one-liners.
  requestReminderPrompt: (targetKey: NotificationTargetKey) => void;
  dismissReminderPrompt: () => void;
  setPromptVisible: (visible: boolean) => void;
}

export const useReminderPromptStore = create<ReminderPromptState>((set) => ({
  request: null,
  promptVisible: false,
  requestReminderPrompt: (targetKey) => set({ request: { targetKey, completedAt: Date.now() } }),
  dismissReminderPrompt: () => set({ request: null }),
  setPromptVisible: (visible) => set({ promptVisible: visible }),
}));

// Plain-function entry point for non-component code (mutation onSuccess handlers).
export function requestReminderPrompt(targetKey: NotificationTargetKey) {
  useReminderPromptStore.getState().requestReminderPrompt(targetKey);
}
