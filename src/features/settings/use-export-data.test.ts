import { act, renderHook } from "@testing-library/react-native";

import { useExportData } from "@/src/features/settings/use-export-data";
import { useExportUserData } from "@/src/features/settings/queries";

jest.mock("react-i18next", () => ({
  // Preserve initReactI18next etc. — src/utils/date transitively loads src/i18n,
  // which calls i18n.use(initReactI18next) at import time.
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/settings/queries", () => ({ useExportUserData: jest.fn() }));

const mockUseExport = useExportUserData as jest.MockedFunction<typeof useExportUserData>;
const mutateAsync = jest.fn();

// NOTE: the web (Blob + anchor download) vs native (Share sheet) delivery branch
// is exercised by the manual checklist (section H), not here. Neither branch can
// complete under jest: `document` is absent (web path) and `await import(...)` needs
// --experimental-vm-modules (native path). So these tests lock only the
// platform-agnostic contract: the export mutation runs, failures are swallowed, and
// the mutation's pending/error flags pass through.
describe("useExportData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("swallows export failures (error surfaces via mutation state, not a throw)", async () => {
    mutateAsync.mockRejectedValue(new Error("export failed"));

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportData();
    });

    expect(result.current.exported).toBe(false);
  });

  it("passes the mutation's pending / error flags straight through", () => {
    mockUseExport.mockReturnValue({
      isError: true,
      isPending: true,
      mutateAsync,
    } as unknown as ReturnType<typeof useExportUserData>);

    const { result } = renderHook(() => useExportData());

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(true);
  });
});
