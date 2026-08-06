import { create } from "zustand";

// The banner strips (offline / verify-email / update) anchor at the bottom of
// the protected content column (#667), where the bottom-floating widgets — the
// reminder prompt card and the RoutineFab (#670) — used to own the space.
// ProtectedLayout publishes the strip's measured height here so those widgets
// can offset themselves above visible banners instead of covering them.
interface BannerInsetState {
  /**
   * Measured CONTENT height of the bottom banner strip; 0 while no banner is
   * visible. Excludes the strip's conditional safe-area padding (#670) — the
   * floating consumers' base offset already includes insets.bottom, so
   * base + this height lands them exactly above the padded strip.
   */
  height: number;
  setHeight: (height: number) => void;
}

export const useBannerInsetStore = create<BannerInsetState>((set) => ({
  height: 0,
  setHeight: (height) => set({ height }),
}));
