import { act, renderHook } from "@testing-library/react-native";
import type { UseFormReturn } from "react-hook-form";

import { selectWizardDraftValues, useWizardDraft } from "@/src/lib/use-wizard-draft";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

// Mock the toast store module so we can intercept showToast calls
jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: jest.fn(),
}));

const mockUseToastStore = useToastStore as jest.MockedFunction<typeof useToastStore>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestForm {
  name: string;
  description: string;
}

/**
 * Create a minimal react-hook-form stub that lets us control:
 *  - trigger: resolves to `triggerResult`
 *  - handleSubmit: calls through to the handler with `formValues`
 *  - formState.isSubmitting: always false in tests (we're not testing that)
 */
function makeForm(
  triggerResult: boolean,
  formValues: TestForm = { name: "Test", description: "Desc" },
): UseFormReturn<TestForm> {
  return {
    trigger: jest.fn().mockResolvedValue(triggerResult),
    handleSubmit:
      (handler: (values: TestForm) => Promise<void>) =>
      async (..._args: unknown[]) => {
        await handler(formValues);
      },
    formState: { isSubmitting: false } as UseFormReturn<TestForm>["formState"],
  } as unknown as UseFormReturn<TestForm>;
}

const STEP_FIELDS = [["name"], ["description"]] as const;

const TOAST_LABELS = {
  saved: "Saved!",
  problem: "There was a problem",
  fallbackError: "Unknown error",
};

function setupHook({
  triggerResult = true,
  onSave = jest.fn().mockResolvedValue("saved"),
  onSaved = jest.fn(),
  onError = jest.fn(),
  formValues = { name: "Test", description: "Desc" } as TestForm,
  draftMode = "create" as "create" | "edit",
  entityId = null as string | null,
  initialStepIndex = undefined as number | undefined,
}: {
  triggerResult?: boolean;
  onSave?: jest.Mock;
  onSaved?: jest.Mock;
  onError?: jest.Mock;
  formValues?: TestForm;
  draftMode?: "create" | "edit";
  entityId?: string | null;
  initialStepIndex?: number;
} = {}) {
  const useDraftStore = createWizardDraftStore<TestForm>();
  const showToast = jest.fn();

  mockUseToastStore.mockImplementation((selector: (s: any) => any) => selector({ showToast }));

  if (initialStepIndex !== undefined) {
    act(() => useDraftStore.getState().setStepIndex(initialStepIndex));
  }

  const form = makeForm(triggerResult, formValues);

  const hookResult = renderHook(() =>
    useWizardDraft({
      useDraftStore,
      draftMode,
      entityId,
      stepFields: STEP_FIELDS,
      form,
      onSave,
      onSaved,
      onError,
      toastLabels: TOAST_LABELS,
    }),
  );

  return { hookResult, showToast, onSave, onSaved, onError, form, useDraftStore };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useWizardDraft - stepIndex and goToStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts at step 0", () => {
    const { hookResult } = setupHook();
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("stepIndex clamps to stepFields.length - 1", () => {
    // Force stepIndex beyond the last step index
    const { hookResult } = setupHook({ initialStepIndex: 99 });

    // stepFields.length - 1 = 1
    expect(hookResult.result.current.stepIndex).toBe(1);
  });

  it("goToStep moves backward", async () => {
    const { hookResult } = setupHook();

    // Advance to step 1
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(1);

    // goToStep back to 0
    act(() => hookResult.result.current.goToStep(0));
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("goToStep does not move forward", async () => {
    const { hookResult } = setupHook();
    expect(hookResult.result.current.stepIndex).toBe(0);

    // Attempt to jump forward from step 0 to step 1 via goToStep
    act(() => hookResult.result.current.goToStep(1));

    // Should stay at 0 since goToStep only goes backward (index > stepIndex rejected)
    expect(hookResult.result.current.stepIndex).toBe(0);
  });
});

describe("useWizardDraft - handleNext", () => {
  beforeEach(() => jest.clearAllMocks());

  it("advances to next step when validation passes", async () => {
    const { hookResult } = setupHook({ triggerResult: true });
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(1);
  });

  it("does not advance when validation fails", async () => {
    const { hookResult } = setupHook({ triggerResult: false });
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("validates only the current step's fields", async () => {
    const { hookResult, form } = setupHook({ triggerResult: true });
    await act(() => hookResult.result.current.handleNext());
    // Should have been called with first step fields
    expect(form.trigger).toHaveBeenCalledWith(["name"]);
  });
});

describe("useWizardDraft - handleSave", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls onSave with form values, then reset, then shows success toast", async () => {
    const onSave = jest.fn().mockResolvedValue("saved-entity");
    const onSaved = jest.fn();
    const { hookResult, showToast } = setupHook({ onSave, onSaved });

    await act(() => hookResult.result.current.handleSave());

    expect(onSave).toHaveBeenCalledWith({ name: "Test", description: "Desc" });
    expect(onSaved).toHaveBeenCalledWith("saved-entity");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved!", tone: "success" }),
    );
  });

  it("shows error toast and calls onError when onSave throws", async () => {
    const onSave = jest.fn().mockRejectedValue(new Error("save failed"));
    const onError = jest.fn();
    const { hookResult, showToast } = setupHook({ onSave, onError });

    await act(() => hookResult.result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "There was a problem",
        description: "save failed",
        tone: "error",
      }),
    );
    expect(onError).toHaveBeenCalledWith("save failed");
  });

  it("uses fallbackError message when thrown error is not an Error instance", async () => {
    const onSave = jest.fn().mockRejectedValue("string-error");
    const { hookResult, showToast } = setupHook({ onSave });

    await act(() => hookResult.result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Unknown error" }),
    );
  });
});

describe("useWizardDraft - isLastStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("isLastStep is false on the first step", () => {
    const { hookResult } = setupHook();
    expect(hookResult.result.current.isLastStep).toBe(false);
  });

  it("isLastStep is true on the last step", async () => {
    const { hookResult } = setupHook();
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.isLastStep).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: selectWizardDraftValues
// ---------------------------------------------------------------------------
describe("selectWizardDraftValues", () => {
  it("returns values when mode and entityId match", () => {
    const selector = selectWizardDraftValues<TestForm>("edit", "entity-1");
    const values: TestForm = { name: "n", description: "d" };
    const state = { mode: "edit" as const, entityId: "entity-1", stepIndex: 0, values };
    expect(selector(state as Parameters<typeof selector>[0])).toEqual(values);
  });

  it("returns null when mode does not match", () => {
    const selector = selectWizardDraftValues<TestForm>("create", "entity-1");
    const state = {
      mode: "edit" as const,
      entityId: "entity-1",
      stepIndex: 0,
      values: { name: "n", description: "d" },
    };
    expect(selector(state as Parameters<typeof selector>[0])).toBeNull();
  });

  it("returns null when entityId does not match", () => {
    const selector = selectWizardDraftValues<TestForm>("edit", "entity-1");
    const state = {
      mode: "edit" as const,
      entityId: "entity-2",
      stepIndex: 0,
      values: { name: "n", description: "d" },
    };
    expect(selector(state as Parameters<typeof selector>[0])).toBeNull();
  });

  it("returns null when values is null even if mode and entityId match", () => {
    const selector = selectWizardDraftValues<TestForm>("create", null);
    const state = { mode: "create" as const, entityId: null, stepIndex: 0, values: null };
    expect(selector(state as Parameters<typeof selector>[0])).toBeNull();
  });
});
