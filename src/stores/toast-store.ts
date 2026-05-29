import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastState {
  toast: ToastMessage | null;
  dismissToast: () => void;
  showToast: (toast: ToastInput) => void;
}

let nextToastId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  dismissToast: () => set({ toast: null }),
  showToast: ({ title, description, tone = "info", durationMs = 4500 }) =>
    set({
      toast: {
        id: nextToastId++,
        title,
        description,
        tone,
        durationMs,
      },
    }),
}));
