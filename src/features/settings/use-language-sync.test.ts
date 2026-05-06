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

describe("useLanguageSync", () => {
  const mutate = jest.fn();
  const setLanguage = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdatePreferences.mockReturnValue({
      mutate,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("pulls the server language once when preferences load", () => {
    mockUseLanguage.mockReturnValue({ language: "en", setLanguage });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "bg" })));

    expect(setLanguage).toHaveBeenCalledTimes(1);
    expect(setLanguage).toHaveBeenCalledWith("bg");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not pull when the server language already matches local", () => {
    mockUseLanguage.mockReturnValue({ language: "bg", setLanguage });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "bg" })));

    expect(setLanguage).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ignores unsupported server values and keeps the local language", () => {
    mockUseLanguage.mockReturnValue({ language: "en", setLanguage });

    renderHook(() => useLanguageSync("user-1", makePreferences({ language: "xx" })));

    expect(setLanguage).not.toHaveBeenCalled();
  });

  it("pushes a local change after the initial pull settles", () => {
    mockUseLanguage.mockReturnValue({ language: "en", setLanguage });

    const preferences = makePreferences({ language: "en" });
    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockUseLanguage.mockReturnValue({ language: lang, setLanguage });
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
    mockUseLanguage.mockReturnValue({ language: "en", setLanguage });

    const { rerender } = renderHook(
      ({ lang }: { lang: "en" | "bg" }) => {
        mockUseLanguage.mockReturnValue({ language: lang, setLanguage });
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
