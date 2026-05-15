import { act, renderHook } from "@testing-library/react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import { useLanguageSync } from "@/src/features/settings/use-language-sync";
import { useLanguage } from "@/src/providers/i18n-provider";

jest.mock("@/src/providers/i18n-provider", () => ({
  useLanguage: jest.fn(),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
}));

const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUseUpdatePreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

function makePreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    ...defaultUserPreferences,
    ...overrides,
  };
}

type LanguageContextOverrides = {
  language: "en" | "bg";
  hydrated?: boolean;
  hasStoredLanguage?: boolean;
};

function mockLanguageContext({
  language,
  hydrated = true,
  hasStoredLanguage = false,
}: LanguageContextOverrides) {
  mockUseLanguage.mockReturnValue({
    language,
    setLanguage,
    hydrated,
    hasStoredLanguage,
  });
}

const mutate = jest.fn();
const setLanguage = jest.fn().mockResolvedValue(undefined);

describe("useLanguageSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdatePreferences.mockReturnValue({
      mutate,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("pulls the server language on first sign-in when nothing is stored locally", () => {
    mockLanguageContext({ language: "en", hasStoredLanguage: false });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "bg" })));

    expect(setLanguage).toHaveBeenCalledTimes(1);
    expect(setLanguage).toHaveBeenCalledWith("bg");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps the locally-stored language when it differs from the server", () => {
    mockLanguageContext({ language: "bg", hasStoredLanguage: true });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "en" })));

    expect(setLanguage).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ language: "bg" }));
  });

  it("does not pull when the server language already matches local", () => {
    mockLanguageContext({ language: "bg", hasStoredLanguage: true });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "bg" })));

    expect(setLanguage).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ignores unsupported server values and keeps the local language", () => {
    mockLanguageContext({ language: "en", hasStoredLanguage: false });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "xx" })));

    expect(setLanguage).not.toHaveBeenCalled();
  });

  it("does nothing until the i18n provider has hydrated AsyncStorage", () => {
    mockLanguageContext({ language: "en", hydrated: false });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "bg" })));

    expect(setLanguage).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("pushes a local change after the initial pull settles", () => {
    const preferences = makePreferences({ language: "en" });
    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockLanguageContext({ language: lang, hasStoredLanguage: false });
        return useLanguageSync("user-1", preferences);
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

  it("does not push when the user is signed out", () => {
    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockLanguageContext({ language: lang, hasStoredLanguage: false });
        return useLanguageSync(null, makePreferences({ language: "en" }));
      },
      { initialProps: { lang: "en" } },
    );

    act(() => {
      rerender({ lang: "bg" });
    });

    expect(mutate).not.toHaveBeenCalled();
  });
});
