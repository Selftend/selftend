import { act, fireEvent, screen } from "@testing-library/react-native";

import SupportScreen from "./support";
import { appEnv } from "@/src/lib/env";
import { requireSupabase } from "@/src/lib/supabase";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/support",
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

let mockUser: { id: string; email?: string; is_anonymous?: boolean } | null = null;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

const mockInvoke = jest.fn();
jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = requireSupabase as jest.MockedFunction<typeof requireSupabase>;

const REPLY_TO_LABEL = "Email me back at (optional)";
const MESSAGE = "A message long enough to pass validation.";

const originalSupportEmail = appEnv.supportEmail;

async function submit() {
  // The card's TITLE is also "Send feedback"; the role narrows it to the button.
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Send feedback" })));
}

describe("SupportScreen guest reply-to (#1447)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "guest-1", is_anonymous: true };
    appEnv.supportEmail = "support@selftend.org";
    mockInvoke.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({
      functions: { invoke: mockInvoke },
    } as unknown as ReturnType<typeof requireSupabase>);
  });

  afterEach(() => {
    appEnv.supportEmail = originalSupportEmail;
  });

  it("offers the field to a guest", () => {
    renderWithProviders(<SupportScreen />);

    expect(screen.getByLabelText(REPLY_TO_LABEL)).toBeTruthy();
  });

  it("does not offer the field to a registered user - their address is server-resolved", () => {
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };

    renderWithProviders(<SupportScreen />);

    expect(screen.queryByLabelText(REPLY_TO_LABEL)).toBeNull();
  });

  it("sends the trimmed reply-to when a guest fills it", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);
    fireEvent.changeText(screen.getByLabelText(REPLY_TO_LABEL), "  reply@example.com  ");

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE, replyTo: "reply@example.com" },
    });
  });

  it("sends no replyTo key at all when a guest leaves it empty", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE },
    });
  });

  it("refuses a filled but malformed address without sending", async () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);
    fireEvent.changeText(screen.getByLabelText(REPLY_TO_LABEL), "not-an-email");

    await submit();

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address, or leave the field empty.")).toBeTruthy();
  });

  it("never sends a replyTo for a registered user", async () => {
    mockUser = { id: "user-1", email: "person@example.com", is_anonymous: false };

    renderWithProviders(<SupportScreen />);
    fireEvent.changeText(screen.getByLabelText("Message"), MESSAGE);

    await submit();

    expect(mockInvoke).toHaveBeenCalledWith("send-feedback", {
      body: { category: "suggestion", message: MESSAGE },
    });
  });
});
