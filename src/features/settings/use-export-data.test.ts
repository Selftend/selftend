import { act, renderHook } from "@testing-library/react-native";

import { useExportData } from "@/src/features/settings/use-export-data";
import { useExportUserData } from "@/src/features/settings/queries";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("react-i18next", () => ({
  // Preserve initReactI18next etc. — src/utils/date transitively loads src/i18n,
  // which calls i18n.use(initReactI18next) at import time.
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/settings/queries", () => ({ useExportUserData: jest.fn() }));
jest.mock("@/src/stores/toast-store", () => ({ useToastStore: jest.fn() }));

const mockUseExport = useExportUserData as jest.MockedFunction<typeof useExportUserData>;
const mockUseToastStore = useToastStore as unknown as jest.Mock;
const showToast = jest.fn();
const mutateAsync = jest.fn();

// NOTE: the web (Blob + anchor download) vs native (Share sheet) delivery branch
// is exercised by the manual checklist (section H), not here. Neither branch can
// complete under jest: `document` is absent (web path) and `await import(...)` needs
// --experimental-vm-modules (native path). So these tests lock only the
// platform-agnostic contract: the export mutation runs, neither outcome throws, and
// the mutation's pending flag passes through.
describe("useExportData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToastStore.mockImplementation((selector: (s: { showToast: unknown }) => unknown) =>
      selector({ showToast }),
    );
    mockUseExport.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useExportUserData>);
  });

  it("runs the export mutation without throwing", async () => {
    mutateAsync.mockResolvedValue({ hello: "world" });

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportData();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  // The two permanent `Text` nodes this used to grow (success and error) were the
  // last things keeping the R7 banner pair alive (#982). Both outcomes toast now,
  // and the failure still does not throw.
  it("reports a failed export as an error toast rather than throwing", async () => {
    mutateAsync.mockRejectedValue(new Error("export failed"));

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportData();
    });

    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  it("passes the mutation's pending flag straight through", () => {
    mockUseExport.mockReturnValue({
      isError: false,
      isPending: true,
      mutateAsync,
    } as unknown as ReturnType<typeof useExportUserData>);

    const { result } = renderHook(() => useExportData());

    expect(result.current.isPending).toBe(true);
  });
});
