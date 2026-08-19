import { act, renderHook } from "@testing-library/react-native";

import { useRecoveryExport } from "@/src/features/recovery/use-recovery-export";
import { captureError } from "@/src/lib/sentry";

const mockShowToast = jest.fn();
const mockDeliverMarkdown = jest.fn();

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  // The real predicate, so "offline is not reported" is tested against the rule
  // the rest of the app reports by rather than against a stub of it.
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;

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

  // This asserted `description: "boom"` until #1060 - i.e. it pinned the raw thrown
  // message reaching the user, in English whatever their language. That contract is
  // deliberately gone, not weakened: the sentence is translated, and the raw error
  // goes to Sentry instead (below).
  it("shows a translated error toast when building the export throws, and resets isExporting", async () => {
    const buildExportText = jest.fn(() => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useRecoveryExport(buildExportText));

    await act(async () => {
      await result.current.handleExportRecoveryPlan();
    });

    expect(mockDeliverMarkdown).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith({
      // An export saves nothing, so `feedback.problem` ("Something did not save")
      // titled an action the user never took (#1060).
      title: "common:feedback.wentWrong",
      description: "recovery.export.exportError",
      tone: "error",
    });
    expect(result.current.isExporting).toBe(false);
  });

  // The thrown message no longer reaches the screen, and `deliverMarkdown` is not a
  // TanStack mutation, so query-client's global reporter never sees it - Sentry is
  // the only place a failed export stays diagnosable from (#1060).
  it("reports the discarded error to Sentry", async () => {
    const error = new Error("boom");
    const { result } = renderHook(() =>
      useRecoveryExport(() => {
        throw error;
      }),
    );

    await act(async () => {
      await result.current.handleExportRecoveryPlan();
    });

    expect(mockCaptureError).toHaveBeenCalledWith(error);
  });

  it("does not report the offline case, but still tells the user", async () => {
    const { result } = renderHook(() =>
      useRecoveryExport(() => {
        throw new Error("Network request failed");
      }),
    );

    await act(async () => {
      await result.current.handleExportRecoveryPlan();
    });

    expect(mockCaptureError).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });
});
