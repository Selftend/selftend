import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useRecoveryPlanForm } from "@/src/features/recovery/use-recovery-plan-form";
import type { RecoveryPlan } from "@/src/features/recovery/types";

const mockShowToast = jest.fn();

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

function makeUpsert() {
  return {
    mutateAsync: jest.fn().mockResolvedValue({ id: "plan-1" }),
    isPending: false,
  } as unknown as Parameters<typeof useRecoveryPlanForm>[0]["upsertRecoveryMutation"];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useRecoveryPlanForm", () => {
  it("submits sanitized default values to the upsert mutation and toasts success", async () => {
    const upsert = makeUpsert();
    const { result } = renderHook(() =>
      useRecoveryPlanForm({ recoveryPlan: null, upsertRecoveryMutation: upsert }),
    );

    await act(async () => {
      await result.current.handleSaveRecoveryPlan();
    });

    expect(upsert.mutateAsync).toHaveBeenCalledWith({
      recoveryKeys: [],
      personalSlogan: "",
      strategyIntegrationNotes: {},
      maintenanceCommitments: [],
    });
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("hydrates the string-list fields from a loaded recovery plan", async () => {
    const recoveryPlan: RecoveryPlan = {
      id: "plan-1",
      userId: "user-1",
      recoveryKeys: ["Walk first"],
      personalSlogan: "Keep practicing",
      strategyIntegrationNotes: { thoughts: "Use thought records." },
      maintenanceCommitments: ["Weekly review"],
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    };
    const { result } = renderHook(() =>
      useRecoveryPlanForm({ recoveryPlan, upsertRecoveryMutation: makeUpsert() }),
    );

    await waitFor(() => expect(result.current.recoveryKeysField.items).toEqual(["Walk first"]));
    expect(result.current.maintenanceCommitmentsField.items).toEqual(["Weekly review"]);
    expect(result.current.strategyIntegrationNotes).toEqual({ thoughts: "Use thought records." });
  });

  it("merges a strategy note without clobbering existing notes", () => {
    const { result } = renderHook(() =>
      useRecoveryPlanForm({ recoveryPlan: null, upsertRecoveryMutation: makeUpsert() }),
    );

    act(() => result.current.updateStrategyNote("thoughts", "spiral plan"));
    expect(result.current.strategyIntegrationNotes).toEqual({ thoughts: "spiral plan" });

    act(() => result.current.updateStrategyNote("activities", "track daily"));
    expect(result.current.strategyIntegrationNotes).toEqual({
      thoughts: "spiral plan",
      activities: "track daily",
    });
  });
});
