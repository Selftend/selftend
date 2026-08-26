import { guestHoldsContent, holdsUserContent } from "./guest-content";
import { exportUserData } from "@/src/features/settings/repository";

jest.mock("@/src/features/settings/repository", () => ({
  exportUserData: jest.fn(),
}));

const mockExport = exportUserData as jest.MockedFunction<typeof exportUserData>;

// The shape a guest who only cleared the consent gate exports: auto rows plus
// the export's own timestamp, every tool empty (json_agg yields null or [] for
// a user with no rows, depending on coalescing - both appear in the wild).
const EMPTY_GUEST_PAYLOAD = {
  exportDate: "2026-08-26T12:00:00Z",
  profile: null,
  preferences: { enabled_modules: ["cbt"], app_onboarding_completed: true },
  widgetPreferences: { hidden_widgets: [] },
  journalEntries: [],
  moodLogs: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("holdsUserContent", () => {
  it("reports no content for the auto-rows-only payload of a fresh guest", () => {
    expect(holdsUserContent(EMPTY_GUEST_PAYLOAD)).toBe(false);
  });

  it("counts a single tool row as content", () => {
    expect(
      holdsUserContent({
        ...EMPTY_GUEST_PAYLOAD,
        journalEntries: [{ id: "j1", content: "one note" }],
      }),
    ).toBe(true);
  });

  it("counts a singular program-state object as content", () => {
    expect(holdsUserContent({ ...EMPTY_GUEST_PAYLOAD, meditationProgramState: { stage: 2 } })).toBe(
      true,
    );
  });

  it("ignores auto rows however full they are", () => {
    expect(
      holdsUserContent({
        exportDate: "2026-08-26T12:00:00Z",
        profile: { display_name: "Guest" },
        preferences: { reminder_consent: true },
        widgetPreferences: { order: ["mood"] },
      }),
    ).toBe(false);
  });

  it("ignores push rows - reminder-consent plumbing, not tool content", () => {
    expect(
      holdsUserContent({
        ...EMPTY_GUEST_PAYLOAD,
        webPushSubscriptions: [{ endpoint: "https://push.example/abc" }],
        devicePushTokens: [{ token: "tok-1" }],
      }),
    ).toBe(false);
  });

  it("counts emotion preferences - user-authored customization stays on the warned side", () => {
    expect(
      holdsUserContent({ ...EMPTY_GUEST_PAYLOAD, emotionPreferences: [{ emotion_key: "calm" }] }),
    ).toBe(true);
  });

  it("fails toward warning on an unknown scalar key", () => {
    // A future metadata scalar must be added to the exclusion list consciously;
    // until then it warns rather than silently skipping the dialog.
    expect(holdsUserContent({ ...EMPTY_GUEST_PAYLOAD, schemaVersion: 3 })).toBe(true);
  });

  it("fails toward warning on a payload that is not an object", () => {
    expect(holdsUserContent(null)).toBe(true);
    expect(holdsUserContent("oops")).toBe(true);
  });
});

describe("guestHoldsContent", () => {
  it("resolves from the export payload", async () => {
    mockExport.mockResolvedValue(EMPTY_GUEST_PAYLOAD);
    await expect(guestHoldsContent()).resolves.toBe(false);
  });

  it("fails toward warning when the export fetch fails", async () => {
    mockExport.mockRejectedValue(new Error("Network request failed"));
    await expect(guestHoldsContent()).resolves.toBe(true);
  });
});
