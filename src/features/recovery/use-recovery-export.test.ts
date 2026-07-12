import { act, renderHook } from "@testing-library/react-native";

import { useRecoveryExport } from "@/src/features/recovery/use-recovery-export";

const mockShowToast = jest.fn();
const mockDeliverMarkdown = jest.fn();

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

jest.mock("@/src/features/recovery/export-target", () => ({
  deliverMarkdown: (...args: unknown[]) => mockDeliverMarkdown(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDeliverMarkdown.mockResolvedValue(undefined);
});

describe("useRecoveryExport", () => {
  it("builds the markdown, delivers it, and shows a success toast", async () => {
    const buildExportText = jest.fn(() => "MARKDOWN");
    const { result } = renderHook(() => useRecoveryExport(buildExportText));

    expect(result.current.isExporting).toBe(false);

    await act(async () => {
      await result.current.handleExportRecoveryPlan();
    });

    expect(buildExportText).toHaveBeenCalledTimes(1);
    expect(mockDeliverMarkdown).toHaveBeenCalledTimes(1);
    expect(mockDeliverMarkdown).toHaveBeenCalledWith(
      "MARKDOWN",
      expect.stringContaining("selftend-recovery-plan-"),
      "recovery.export.fileTitle",
    );
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
    expect(result.current.isExporting).toBe(false);
  });

  it("shows an error toast when building the export throws, and resets isExporting", async () => {
    const buildExportText = jest.fn(() => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useRecoveryExport(buildExportText));

    await act(async () => {
      await result.current.handleExportRecoveryPlan();
    });

    expect(mockDeliverMarkdown).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", description: "boom" }),
    );
    expect(result.current.isExporting).toBe(false);
  });
});
