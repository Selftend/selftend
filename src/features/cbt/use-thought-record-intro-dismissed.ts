import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Device-local by design, mirroring app-lock-store's AsyncStorage-backed zustand
// pattern: a persisted boolean plus a `hydrated` flag so the intro card can wait
// for the read before deciding whether to render (avoids a first-paint flash).
export const THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY =
  "selftend:cbt:thoughtRecordIntroDismissed";

interface ThoughtRecordIntroState {
  dismissed: boolean;
  hydrated: boolean;
  dismiss: () => void;
  hydrate: () => Promise<void>;
}

export const useThoughtRecordIntroStore = create<ThoughtRecordIntroState>((set) => ({
  dismissed: false,
  hydrated: false,
  dismiss: () => {
    // Optimistic set so the card disappears instantly; persistence is best-effort
    // (mirrors theme-store) since losing this write just means the card reappears
    // once, which is harmless.
    set({ dismissed: true });
    void AsyncStorage.setItem(THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY, "1").catch(() => {});
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY);
      set({ dismissed: stored === "1", hydrated: true });
    } catch {
      // A failed read must still flip `hydrated` so the caller stops waiting;
      // default dismissed:false is a safe passthrough (worst case: card shows once more).
      set({ hydrated: true });
    }
  },
}));

export function useThoughtRecordIntroDismissed(): {
  dismissed: boolean;
  dismiss: () => void;
  hydrated: boolean;
} {
  const dismissed = useThoughtRecordIntroStore((s) => s.dismissed);
  const hydrated = useThoughtRecordIntroStore((s) => s.hydrated);
  const dismiss = useThoughtRecordIntroStore((s) => s.dismiss);
  const hydrate = useThoughtRecordIntroStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { dismissed, dismiss, hydrated };
}
