import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { DeleteAccountRow } from "./delete-account-row";
import { signOut } from "@/src/features/auth/api";
import { useDeleteUserAccount } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/features/auth/api", () => ({ signOut: jest.fn() }));
jest.mock("@/src/features/settings/queries", () => ({ useDeleteUserAccount: jest.fn() }));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockUseDeleteUserAccount = useDeleteUserAccount as jest.MockedFunction<
  typeof useDeleteUserAccount
>;
const mutateAsync = jest.fn();

function mockDeletion({ rejects = false }: { rejects?: boolean } = {}) {
  mutateAsync.mockImplementation(() =>
    rejects ? Promise.reject(new Error("delete failed")) : Promise.resolve(undefined),
  );
  mockUseDeleteUserAccount.mockReturnValue({
    mutateAsync,
    isError: rejects,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteUserAccount>);
}

// The row opens its modal synchronously, so nothing here needs waiting on - only
// the post-deletion `signOut` does, and each test awaits that itself.
function confirmDeletion() {
  fireEvent.press(screen.getByLabelText("Delete my account"));
  expect(screen.getByText("Delete account permanently?")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
  fireEvent.press(screen.getByText("Delete account"));
}

describe("DeleteAccountRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockDeletion();
  });

  /**
   * #968 made the sign-out scope an explicit argument because supabase-js's silent
   * `global` default was ending sessions on devices the user had not touched. This
   * row is the one caller where `global` is the honest answer: the account row is
   * gone, so every device's session is already dead server-side, and saying `local`
   * here would claim otherwise.
   */
  it("signs out globally after the account is deleted", async () => {
    renderWithProviders(<DeleteAccountRow />);

    confirmDeletion();

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith("global"));
    // Order matters: the deletion needs a live session, so it runs first.
    expect(mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
  });

  it("does not sign out when the deletion itself failed", async () => {
    mockDeletion({ rejects: true });
    renderWithProviders(<DeleteAccountRow />);

    confirmDeletion();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // The account still exists and the session is still the user's - dropping them
    // to sign-in here would look like the deletion had worked.
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
