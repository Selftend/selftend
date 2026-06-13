import { act, renderHook } from "@testing-library/react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import { useSettingsSync } from "@/src/features/settings/use-settings-sync";
import { useLanguage } from "@/src/providers/i18n-provider";
import { useThemeStore } from "@/src/stores/theme-store";

jest.mock("@/src/providers/i18n-provider", () => ({
  useLanguage: jest.fn(),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/stores/theme-store", () => ({
  useThemeStore: jest.fn(),
  isThemePreference: (v: unknown) => v === "light" || v === "dark" || v === "system",
}));

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>;
const mockUseUpdatePreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

function makePreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return { ...defaultUserPreferences, ...overrides };
}

type ContextState = {
  language?: "en" | "bg";
  hydrated?: boolean;
  theme?: "system" | "light" | "dark";
};

const mutate = jest.fn();
const setLanguage = jest.fn().mockResolvedValue(undefined);
const setThemePreference = jest.fn();

function mockContexts({ language = "en", hydrated = true, theme = "system" }: ContextState = {}) {
  mockUseLanguage.mockReturnValue({ language, setLanguage, hydrated });
  mockUseThemeStore.mockImplementation((selector: (s: any) => unknown) =>
    selector({ preference: theme, setPreference: setThemePreference, hydrate: jest.fn() }),
  );
}

describe("useSettingsSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdatePreferences.mockReturnValue({
      mutate,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("applies DB language over local on first login", () => {
    mockContexts({ language: "en" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "bg" })));
    expect(setLanguage).toHaveBeenCalledWith("bg");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("applies DB theme over local on first login", () => {
    mockContexts({ theme: "system" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "en", theme: "dark" })));
    expect(setThemePreference).toHaveBeenCalledWith("dark");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("applies DB values even when local storage already had a different value", () => {
    mockContexts({ language: "bg", theme: "light" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "en", theme: "dark" })));
    expect(setLanguage).toHaveBeenCalledWith("en");
    expect(setThemePreference).toHaveBeenCalledWith("dark");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not update when DB and local values already match", () => {
    mockContexts({ language: "bg", theme: "dark" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "bg", theme: "dark" })));
    expect(setLanguage).not.toHaveBeenCalled();
    expect(setThemePreference).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not overwrite local theme when DB has no theme saved yet", () => {
    mockContexts({ language: "en", theme: "dark" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "en", theme: null })));
    // Local theme is preserved - DB null does not reset it to system.
    expect(setThemePreference).not.toHaveBeenCalled();
    // Local theme is pushed to DB to save it for the first time.
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" }));
  });

  it("ignores unsupported DB language values", () => {
    mockContexts({ language: "en" });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "xx" })));
    expect(setLanguage).not.toHaveBeenCalled();
  });

  it("does nothing until the i18n provider has hydrated", () => {
    mockContexts({ language: "en", hydrated: false });
    renderHook(() => useSettingsSync("user-1", makePreferences({ language: "bg", theme: "dark" })));
    expect(setLanguage).not.toHaveBeenCalled();
    expect(setThemePreference).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("pushes local language change to DB after initial sync", () => {
    const preferences = makePreferences({ language: "en", theme: "system" });
    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockContexts({ language: lang });
        return useSettingsSync("user-1", preferences);
      },
      { initialProps: { lang: "en" } },
    );

    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      rerender({ lang: "bg" });
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ language: "bg" }));
  });

  it("pushes local theme change to DB after initial sync", () => {
    const preferences = makePreferences({ language: "en", theme: "system" });
    const { rerender } = renderHook(
      ({ theme }: { theme: "system" | "light" | "dark" }) => {
        mockContexts({ theme });
        return useSettingsSync("user-1", preferences);
      },
      { initialProps: { theme: "system" as const } },
    );

    expect(mutate).not.toHaveBeenCalled();

    act(() => {
      rerender({ theme: "dark" });
    });

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" }));
  });

  it("re-pulls DB values on account switch instead of pushing the previous user's local values", () => {
    // User A signs in: local matches their DB, so initial sync neither pulls nor pushes.
    const { rerender } = renderHook(
      ({
        uid,
        prefs,
        theme,
      }: {
        uid: string;
        prefs: UserPreferences;
        theme: "system" | "light" | "dark";
      }) => {
        mockContexts({ theme });
        return useSettingsSync(uid, prefs);
      },
      {
        initialProps: {
          uid: "user-a",
          prefs: makePreferences({ language: "en", theme: "light" }),
          theme: "light" as const,
        },
      },
    );
    expect(setThemePreference).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();

    // User B signs in (same mounted hook): their DB theme is dark, but local still
    // holds User A's light. Must PULL B's dark theme, not PUSH A's light onto B.
    act(() => {
      rerender({
        uid: "user-b",
        prefs: makePreferences({ language: "en", theme: "dark" }),
        theme: "light",
      });
    });

    expect(setThemePreference).toHaveBeenCalledWith("dark");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not push when the user is signed out", () => {
    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockContexts({ language: lang });
        return useSettingsSync(null, makePreferences({ language: "en" }));
      },
      { initialProps: { lang: "en" } },
    );

    act(() => {
      rerender({ lang: "bg" });
    });

    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not push the stale local language while the initial pull is still resolving", async () => {
    // First sync where BOTH language and theme differ. setLanguage stays pending, so
    // the language pull is still in flight when the SYNCHRONOUS theme update re-fires
    // the effect. The push branch must not run yet (it would write stale local "en"
    // back over the DB's "bg"). Regression guard for the self-race.
    let resolveLang: (() => void) | undefined;
    const pendingSetLanguage = jest.fn(
      () => new Promise<void>((resolve) => (resolveLang = resolve)),
    );
    const prefs = makePreferences({ language: "bg", theme: "dark" });

    const { rerender } = renderHook(
      ({ theme, lang }: { theme: "system" | "light" | "dark"; lang: "en" | "bg" }) => {
        mockUseLanguage.mockReturnValue({
          language: lang,
          setLanguage: pendingSetLanguage,
          hydrated: true,
        });
        mockUseThemeStore.mockImplementation((selector: (s: any) => unknown) =>
          selector({ preference: theme, setPreference: setThemePreference, hydrate: jest.fn() }),
        );
        return useSettingsSync("user-1", prefs);
      },
      { initialProps: { theme: "system" as const, lang: "en" as const } },
    );

    expect(pendingSetLanguage).toHaveBeenCalledWith("bg");
    expect(setThemePreference).toHaveBeenCalledWith("dark");
    expect(mutate).not.toHaveBeenCalled();

    // Theme update applied (system -> dark) re-fires the effect while language is still
    // the stale local "en" (the pull promise hasn't resolved).
    act(() => rerender({ theme: "dark", lang: "en" }));
    expect(mutate).not.toHaveBeenCalled(); // <-- fails without the pullInFlightRef guard

    // After the pull resolves and language catches up to "bg", still no spurious push.
    await act(async () => {
      resolveLang?.();
      await Promise.resolve();
    });
    act(() => rerender({ theme: "dark", lang: "bg" }));
    expect(mutate).not.toHaveBeenCalled();
  });
});
