import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useChallengeEditor } from "@/src/features/recovery/use-challenge-editor";

const mockShowToast = jest.fn();

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

interface MockMutation {
  mutateAsync: jest.Mock;
  isPending: boolean;
}

function makeArgs(
  overrides: {
    upsert?: MockMutation;
    save?: MockMutation;
    del?: MockMutation;
  } = {},
) {
  const upsert = overrides.upsert ?? {
    mutateAsync: jest.fn().mockResolvedValue({ id: "plan-1" }),
    isPending: false,
  };
  const save = overrides.save ?? {
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  };
  const del = overrides.del ?? {
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  };
  const getValues = jest.fn().mockReturnValue({
    recoveryKeys: [],
    personalSlogan: "",
    strategyIntegrationNotes: {},
    maintenanceCommitments: [],
  });

  const args = {
    getValues,
    upsertRecoveryMutation: upsert,
    saveChallengeMutation: save,
    deleteChallengeMutation: del,
  } as unknown as Parameters<typeof useChallengeEditor>[0];

  return { args, upsert, save, del };
}

function seedValidDraft(result: { current: ReturnType<typeof useChallengeEditor> }) {
  act(() => result.current.startNewChallenge());
  act(() => result.current.updateChallengeDescription("Hard week at work"));
  act(() => result.current.updateCopingStep(0, "Text a trusted person"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useChallengeEditor", () => {
  it("saves a valid draft in order (upsert plan -> save challenge) then clears the draft", async () => {
    const { args, upsert, save } = makeArgs();
    const { result } = renderHook(() => useChallengeEditor(args));

    seedValidDraft(result);
    expect(result.current.challengeDraft).not.toBeNull();

    await act(async () => {
      await result.current.handleSaveChallenge();
    });

    expect(upsert.mutateAsync).toHaveBeenCalledTimes(1);
    expect(save.mutateAsync).toHaveBeenCalledTimes(1);
    expect(save.mutateAsync).toHaveBeenCalledWith({
      recoveryPlanId: "plan-1",
      input: {
        challengeDescription: "Hard week at work",
        copingSteps: ["Text a trusted person"],
      },
      challengePlanId: undefined,
    });
    // upsert must resolve before save is invoked.
    expect(upsert.mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      save.mutateAsync.mock.invocationCallOrder[0],
    );
    expect(result.current.challengeDraft).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("is single-flight: a rapid double-press saves the challenge exactly once", async () => {
    let resolveUpsert: (() => void) | undefined;
    const upsert: MockMutation = {
      mutateAsync: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveUpsert = () => resolve({ id: "plan-1" });
          }),
      ),
      isPending: false,
    };
    const { args, save } = makeArgs({ upsert });
    const { result } = renderHook(() => useChallengeEditor(args));

    seedValidDraft(result);

    await act(async () => {
      void result.current.handleSaveChallenge();
      void result.current.handleSaveChallenge();
    });

    // Second press is ignored while the first save is in flight.
    expect(upsert.mutateAsync).toHaveBeenCalledTimes(1);
    expect(save.mutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpsert?.();
    });

    await waitFor(() => expect(save.mutateAsync).toHaveBeenCalledTimes(1));
    expect(upsert.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid draft with an error toast and no mutation", async () => {
    const { args, upsert, save } = makeArgs();
    const { result } = renderHook(() => useChallengeEditor(args));

    // Blank description -> schema invalid.
    act(() => result.current.startNewChallenge());

    await act(async () => {
      await result.current.handleSaveChallenge();
    });

    expect(upsert.mutateAsync).not.toHaveBeenCalled();
    expect(save.mutateAsync).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    // Draft stays open so the user can fix it.
    expect(result.current.challengeDraft).not.toBeNull();
  });

  it("deletes a challenge plan and shows a success toast", async () => {
    const { args, del } = makeArgs();
    const { result } = renderHook(() => useChallengeEditor(args));

    await act(async () => {
      await result.current.handleDeleteChallenge("challenge-1");
    });

    expect(del.mutateAsync).toHaveBeenCalledWith("challenge-1");
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });
});
