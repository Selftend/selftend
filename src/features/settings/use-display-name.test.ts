import { act, renderHook } from "@testing-library/react-native";

import type { UserProfile } from "@/src/features/profile/profile-sync";
import { useUpdateUserDisplayName } from "@/src/features/profile/queries";
import { useDisplayName } from "@/src/features/settings/use-display-name";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/profile/queries", () => ({
  useUpdateUserDisplayName: jest.fn(),
}));

const mockUseUpdate = useUpdateUserDisplayName as jest.MockedFunction<
  typeof useUpdateUserDisplayName
>;
const mutateAsync = jest.fn();

function profile(displayName: string | null): UserProfile {
  return { displayName } as UserProfile;
}

describe("useDisplayName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdate.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserDisplayName>);
  });

  it("seeds the input value from the loaded profile display name", () => {
    const { result } = renderHook(() => useDisplayName("u1", profile("Ann")));
    expect(result.current.value).toBe("Ann");
  });

  it("seeds an empty string when the profile has no display name", () => {
    const { result } = renderHook(() => useDisplayName("u1", profile(null)));
    expect(result.current.value).toBe("");
  });

  it("saves the current value and shows the saved message", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDisplayName("u1", profile("Ann")));

    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledWith("Ann");
    expect(result.current.message).toBe("profile.nameSaved");
    expect(result.current.error).toBe("");
  });

  it("surfaces a localized error string on save failure", async () => {
    mutateAsync.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useDisplayName("u1", profile("Ann")));

    await act(async () => {
      await result.current.save();
    });

    // getErrorMessage returns the Error message verbatim (fallback unused here).
    expect(result.current.error).toBe("nope");
    expect(result.current.message).toBe("");
  });
});
