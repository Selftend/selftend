import { screen } from "@testing-library/react-native";

import { ResetPasswordForm } from "./reset-password-form";
import i18n from "@/src/i18n";
import { reset, tags } from "@/test/head-capture";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The invariant reaches the `(auth)` screens at runtime, INCLUDING a
 * state-dependent heading (#2294, docs/indexability.md § 4.5): the document
 * title follows the H1 the screen is showing, so it changes when the state
 * does. The expired reset link is the representative case; the mock seam is
 * `reset-password-form.test.tsx`'s.
 */

let mockSessionState: { session: { user: { id: string } } | null; status: "loading" | "ready" };

jest.mock("expo-router/head", () => require("@/test/head-capture").headMock());

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/auth/api", () => ({
  LEAKED_PASSWORD_ERROR: "LEAKED_PASSWORD",
  SESSION_MISSING_ERROR: "SESSION_MISSING",
  updatePassword: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  reset();
  setPlatformOS("web");
});

afterEach(() => {
  setPlatformOS("ios");
});

function documentTitle(): string | undefined {
  return tags().find(({ type }) => type === "title")?.props.children as string | undefined;
}

describe("ResetPasswordForm - the document title follows the H1's state (#2294)", () => {
  it("with a recovery session, the form's heading", () => {
    mockSessionState = { session: { user: { id: "u1" } }, status: "ready" };

    renderWithProviders(<ResetPasswordForm />);

    const h1 = screen.getByRole("heading", { level: 1 }).props.children as string;
    expect(h1).toBe("Reset your password");
    expect(documentTitle()).toBe(`${h1} - Selftend`);
  });

  it("without one, the expired-link heading", () => {
    mockSessionState = { session: null, status: "ready" };

    renderWithProviders(<ResetPasswordForm />);

    const h1 = screen.getByRole("heading", { level: 1 }).props.children as string;
    expect(h1).toBe("Link invalid or expired");
    expect(documentTitle()).toBe(`${h1} - Selftend`);
  });

  it("and no title at all while the session read is pending, since there is no heading", () => {
    mockSessionState = { session: null, status: "loading" };

    renderWithProviders(<ResetPasswordForm />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(documentTitle()).toBeUndefined();
  });
});
