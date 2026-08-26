import { create } from "zustand";

/**
 * The one-time fresh-start notice (#1450): set by SessionProvider when a
 * stored session could not be restored, rendered by FreshStartNotice in the
 * root layout, gone for good on dismiss. In-memory only - the marker that
 * triggers it is cleared the moment it is shown, so a reload cannot repeat it.
 */
interface FreshStartNoticeState {
  visible: boolean;
  showFreshStartNotice: () => void;
  dismissFreshStartNotice: () => void;
}

export const useFreshStartNoticeStore = create<FreshStartNoticeState>((set) => ({
  visible: false,
  showFreshStartNotice: () => set({ visible: true }),
  dismissFreshStartNotice: () => set({ visible: false }),
}));
