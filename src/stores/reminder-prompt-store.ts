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
  // Called by tool save flows after a successful save. Eligibility is decided
  // by the host card, so call sites stay one-liners.
  requestReminderPrompt: (targetKey: NotificationTargetKey) => void;
  dismissReminderPrompt: () => void;
}

export const useReminderPromptStore = create<ReminderPromptState>((set) => ({
  request: null,
  requestReminderPrompt: (targetKey) => set({ request: { targetKey, completedAt: Date.now() } }),
  dismissReminderPrompt: () => set({ request: null }),
}));

// Plain-function entry point for non-component code (mutation onSuccess handlers).
export function requestReminderPrompt(targetKey: NotificationTargetKey) {
  useReminderPromptStore.getState().requestReminderPrompt(targetKey);
}
