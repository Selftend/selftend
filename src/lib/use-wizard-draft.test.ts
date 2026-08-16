import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useForm, type UseFormReturn } from "react-hook-form";

import { selectWizardDraftValues, useWizardDraft } from "@/src/lib/use-wizard-draft";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

// Mock the toast store module so we can intercept showToast calls
jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: jest.fn(),
}));

const mockUseToastStore = useToastStore as jest.MockedFunction<typeof useToastStore>;

// Drain the persist middleware's async rehydration (hydrated:true setState)
// before RTL's auto-cleanup unmounts the tree - a store notification landing on
// an unmounted renderer crashes the next test's renderHook. This afterEach is
// registered AFTER RTL's, so jest runs it FIRST (afterEach is LIFO).
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

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
 *  - watch: records subscribers; `emitChange()` simulates a keystroke
 *  - getValues: returns `formValues`
 *  - formState.isSubmitting: always false in tests (we're not testing that)
 */
function makeForm(
  triggerResult: boolean,
  formValues: TestForm = { name: "Test", description: "Desc" },
  invalidErrors?: Record<string, unknown>,
) {
  const watchCallbacks: (() => void)[] = [];
  const unsubscribe = jest.fn();
  const form = {
    trigger: jest.fn().mockResolvedValue(triggerResult),
    handleSubmit:
      (
        handler: (values: TestForm) => Promise<void>,
        onInvalid?: (errors: Record<string, unknown>) => void,
      ) =>
      async (..._args: unknown[]) => {
        if (invalidErrors) {
          onInvalid?.(invalidErrors);
          return;
        }
        await handler(formValues);
      },
    getValues: jest.fn(() => formValues),
    reset: jest.fn(),
    watch: jest.fn((callback: () => void) => {
      watchCallbacks.push(callback);
      return { unsubscribe };
    }),
    formState: {
      isSubmitting: false,
      isDirty: false,
    } as UseFormReturn<TestForm>["formState"],
  } as unknown as UseFormReturn<TestForm>;

  return { form, emitChange: () => watchCallbacks.forEach((callback) => callback()) };
}

const STEP_FIELDS = [["name"], ["description"]] as const;

const TOAST_LABELS = {
  saved: "Saved!",
  problem: "There was a problem",
  invalid: "Some answers need a fix",
  invalidMoved: "Moved you back",
  fallbackError: "Unknown error",
};

async function setupHook({
  triggerResult = true,
  onSave = jest.fn().mockResolvedValue("saved"),
  onSaved = jest.fn(),
  onError = jest.fn(),
  formValues = { name: "Test", description: "Desc" } as TestForm,
  draftMode = "create" as "create" | "edit",
  entityId = null as string | null,
  initialStepIndex = undefined as number | undefined,
  invalidErrors = undefined as Record<string, unknown> | undefined,
}: {
  triggerResult?: boolean;
  onSave?: jest.Mock;
  onSaved?: jest.Mock;
  onError?: jest.Mock;
  formValues?: TestForm;
  draftMode?: "create" | "edit";
  entityId?: string | null;
  initialStepIndex?: number;
  invalidErrors?: Record<string, unknown>;
} = {}) {
  const flowKey = `hook-test-${flowKeyCounter++}`;
  const useDraftStore = createWizardDraftStore<TestForm>(flowKey);
  const showToast = jest.fn();

  mockUseToastStore.mockImplementation((selector: (s: any) => any) => selector({ showToast }));

  if (initialStepIndex !== undefined) {
    act(() => useDraftStore.getState().setStepIndex(initialStepIndex));
  }

  const { form, emitChange } = makeForm(triggerResult, formValues, invalidErrors);

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

  // Settle the store's async rehydration INSIDE the test, while the tree is
  // still mounted - a hydrated:true setState landing between tests would hit
  // the unmounted renderer and crash the next renderHook.
  await act(async () => {
    await useDraftStore.persist.rehydrate();
  });

  return {
    hookResult,
    showToast,
    onSave,
    onSaved,
    onError,
    form,
    emitChange,
    useDraftStore,
    flowKey,
  };
}

let flowKeyCounter = 0;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useWizardDraft - stepIndex and goToStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts at step 0", async () => {
    const { hookResult } = await setupHook();
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("stepIndex clamps to stepFields.length - 1", async () => {
    // Force stepIndex beyond the last step index
    const { hookResult } = await setupHook({ initialStepIndex: 99 });

    // stepFields.length - 1 = 1
    expect(hookResult.result.current.stepIndex).toBe(1);
  });

  it("goToStep moves backward", async () => {
    const { hookResult } = await setupHook();

    // Advance to step 1
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(1);

    // goToStep back to 0
    act(() => hookResult.result.current.goToStep(0));
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("goToStep does not move forward", async () => {
    const { hookResult } = await setupHook();
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
    const { hookResult } = await setupHook({ triggerResult: true });
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(1);
  });

  it("does not advance when validation fails", async () => {
    const { hookResult } = await setupHook({ triggerResult: false });
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.stepIndex).toBe(0);
  });

  it("validates only the current step's fields", async () => {
    const { hookResult, form } = await setupHook({ triggerResult: true });
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
    const { hookResult, showToast } = await setupHook({ onSave, onSaved });

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
    const { hookResult, showToast } = await setupHook({ onSave, onError });

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
    const { hookResult, showToast } = await setupHook({ onSave });

    await act(() => hookResult.result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Unknown error" }),
    );
  });

  // Regression guard for the double-press fix: RHF's handleSubmit does not block
  // re-entrant calls, so handleSave itself must be single-flight. Five wizard flows
  // (thought record, goals, beliefs, tasks, exposure) rely on this one wrapper.
  it("runs onSave only once for two synchronous handleSave calls (double-press)", async () => {
    let resolveSave!: (value: string) => void;
    const onSave = jest.fn(() => new Promise<string>((resolve) => (resolveSave = resolve)));
    const onSaved = jest.fn();
    const { hookResult } = await setupHook({ onSave: onSave as jest.Mock, onSaved });

    await act(async () => {
      // Two presses before any re-render; the first save is still in flight.
      void hookResult.result.current.handleSave();
      void hookResult.result.current.handleSave();
      resolveSave("saved-entity");
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("jumps to the failing step and explains the jump when save-time validation fails", async () => {
    // A field on an EARLIER step can be invalid at save time (overlong paste,
    // rejected rehydrated draft); Save must not silently no-op.
    const onSave = jest.fn();
    const { hookResult, showToast, onSaved } = await setupHook({
      onSave,
      initialStepIndex: 1,
      invalidErrors: { name: { type: "max", message: "some.validation.key" } },
    });
    expect(hookResult.result.current.stepIndex).toBe(1);

    await act(() => hookResult.result.current.handleSave());

    expect(onSave).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    // "name" belongs to step 0 - the wizard navigated back to it so the inline
    // error is visible.
    expect(hookResult.result.current.stepIndex).toBe(0);
    // NOT the `problem` label: nothing was attempted, so nothing failed, and the
    // draft is still held. Asserting the difference is the point of the test -
    // the two paths shared one string, so an invalid field read as data loss.
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Some answers need a fix",
        description: "Moved you back",
        tone: "error",
      }),
    );
    expect(showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "There was a problem" }),
    );
  });

  it("omits the moved-you-back line when the invalid field is on the current step", async () => {
    // The jump explanation must not appear when there was no jump; it would be
    // describing navigation that never happened.
    const { hookResult, showToast } = await setupHook({
      onSave: jest.fn(),
      initialStepIndex: 0,
      invalidErrors: { name: { type: "max", message: "some.validation.key" } },
    });

    await act(() => hookResult.result.current.handleSave());

    expect(hookResult.result.current.stepIndex).toBe(0);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Some answers need a fix", description: undefined }),
    );
  });
});

describe("useWizardDraft - isLastStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("isLastStep is false on the first step", async () => {
    const { hookResult } = await setupHook();
    expect(hookResult.result.current.isLastStep).toBe(false);
  });

  it("isLastStep is true on the last step", async () => {
    const { hookResult } = await setupHook();
    await act(() => hookResult.result.current.handleNext());
    expect(hookResult.result.current.isLastStep).toBe(true);
  });
});

describe("useWizardDraft - draft capture and persistence", () => {
  beforeEach(() => jest.clearAllMocks());

  it("captures form values into the draft store ~800ms after typing pauses (debounced)", async () => {
    jest.useFakeTimers();
    try {
      const { emitChange, useDraftStore } = await setupHook({
        formValues: { name: "typed", description: "text" },
      });

      act(() => emitChange()); // keystroke
      act(() => jest.advanceTimersByTime(400));
      act(() => emitChange()); // another keystroke resets the debounce
      act(() => jest.advanceTimersByTime(799));
      expect(useDraftStore.getState().values).toBeNull();

      act(() => jest.advanceTimersByTime(1));
      expect(useDraftStore.getState().values).toEqual({ name: "typed", description: "text" });
      expect(useDraftStore.getState().updatedAt).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("persists the current values immediately on a valid handleNext", async () => {
    const { hookResult, useDraftStore } = await setupHook({
      triggerResult: true,
      formValues: { name: "step one done", description: "" },
    });

    await act(() => hookResult.result.current.handleNext());

    expect(useDraftStore.getState().values).toEqual({ name: "step one done", description: "" });
  });

  it("does not persist values when handleNext validation fails", async () => {
    const { hookResult, useDraftStore } = await setupHook({ triggerResult: false });

    await act(() => hookResult.result.current.handleNext());

    expect(useDraftStore.getState().values).toBeNull();
  });

  it("clears the draft from memory AND disk after a successful save", async () => {
    const { hookResult, useDraftStore, flowKey } = await setupHook();
    const storageKey = `selftend:wizard-draft:${flowKey}`;

    act(() => useDraftStore.getState().setValues({ name: "in progress", description: "" }));
    // Let the persist middleware finish writing.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await AsyncStorage.getItem(storageKey)).not.toBeNull();

    await act(() => hookResult.result.current.handleSave());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(useDraftStore.getState().values).toBeNull();
    expect(await AsyncStorage.getItem(storageKey)).toBeNull();
  });

  it("explicitly discards the draft from memory and disk without a delayed capture reviving it", async () => {
    jest.useFakeTimers();
    try {
      const { hookResult, emitChange, useDraftStore, flowKey } = await setupHook({
        formValues: { name: "private draft", description: "unfinished" },
      });
      const storageKey = `selftend:wizard-draft:${flowKey}`;

      act(() => emitChange());
      act(() => useDraftStore.getState().setValues({ name: "private draft", description: "" }));
      await act(async () => Promise.resolve());
      expect(await AsyncStorage.getItem(storageKey)).not.toBeNull();

      act(() => hookResult.result.current.clearDraft());
      act(() => jest.advanceTimersByTime(1_000));
      await act(async () => Promise.resolve());

      expect(useDraftStore.getState().values).toBeNull();
      expect(await AsyncStorage.getItem(storageKey)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps the draft when the save fails", async () => {
    const onSave = jest.fn().mockRejectedValue(new Error("save failed"));
    const { hookResult, useDraftStore } = await setupHook({ onSave });

    await act(() => hookResult.result.current.handleSave());

    // submitForm stored the submitted values before attempting the save.
    expect(useDraftStore.getState().values).toEqual({ name: "Test", description: "Desc" });
  });

  it("exposes hydrated once the persisted draft has been read back", async () => {
    const { hookResult } = await setupHook();

    await waitFor(() => expect(hookResult.result.current.hydrated).toBe(true));
  });

  // Late-restore tests use a REAL react-hook-form instance (no formState stub):
  // RHF's formState is a Proxy that only tracks fields read during render, so a
  // stub would let an inert isDirty guard pass silently.
  function renderWithRealForm(useDraftStore: ReturnType<typeof createWizardDraftStore<TestForm>>) {
    const showToast = jest.fn();
    mockUseToastStore.mockImplementation((selector: (s: any) => any) => selector({ showToast }));
    return renderHook(() => {
      const form = useForm<TestForm>({ defaultValues: { name: "", description: "" } });
      const wizard = useWizardDraft({
        useDraftStore,
        draftMode: "create",
        entityId: null,
        stepFields: STEP_FIELDS,
        form,
        onSave: jest.fn().mockResolvedValue("saved"),
        onSaved: jest.fn(),
        toastLabels: TOAST_LABELS,
      });
      return { form, wizard };
    });
  }

  function seedDraft(flowKey: string, updatedAt: number) {
    return AsyncStorage.setItem(
      `selftend:wizard-draft:${flowKey}`,
      JSON.stringify({
        state: {
          mode: "create",
          entityId: null,
          stepIndex: 1,
          values: { name: "persisted draft", description: "still here" },
          updatedAt,
        },
        version: 1,
      }),
    );
  }

  it("restores a draft into the form when rehydration completes after mount", async () => {
    // Pre-seed storage, then create the store: rehydration resolves a beat after
    // the hook renders (the web-refresh-onto-a-wizard case).
    const flowKey = `hook-test-preseeded-${Date.now()}`;
    await seedDraft(flowKey, Date.now());

    const useDraftStore = createWizardDraftStore<TestForm>(flowKey);
    const view = renderWithRealForm(useDraftStore);

    await waitFor(() => expect(view.result.current.wizard.hydrated).toBe(true));
    expect(view.result.current.form.getValues()).toEqual({
      name: "persisted draft",
      description: "still here",
    });
  });

  it("does not clobber a form the user already typed into (live isDirty guard)", async () => {
    const flowKey = `hook-test-dirty-${Date.now()}`;
    await seedDraft(flowKey, Date.now());

    const useDraftStore = createWizardDraftStore<TestForm>(flowKey);
    const view = renderWithRealForm(useDraftStore);
    // Type before the (async) rehydration lands - nothing has yielded to the
    // event loop yet, so hydration cannot have completed.
    act(() => view.result.current.form.setValue("name", "user typed", { shouldDirty: true }));

    await waitFor(() => expect(view.result.current.wizard.hydrated).toBe(true));
    expect(view.result.current.form.getValues("name")).toBe("user typed");
    expect(view.result.current.form.getValues("description")).toBe("");
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
