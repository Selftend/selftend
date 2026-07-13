import { act, renderHook } from "@testing-library/react-native";

import { useStateWizardDraft } from "@/src/lib/use-state-wizard-draft";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

interface Draft {
  text: string;
}

const useTestDraftStore = createWizardDraftStore<Draft>("state-wizard-test");

describe("useStateWizardDraft", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTestDraftStore.setState({
      mode: "create",
      entityId: null,
      stepIndex: 0,
      values: null,
      updatedAt: null,
      hydrated: true,
    });
  });

  afterEach(() => jest.useRealTimers());

  it("restores a fresh persisted value and step", () => {
    const restore = jest.fn();
    useTestDraftStore.setState({
      values: { text: "still writing" },
      stepIndex: 2,
      updatedAt: Date.now(),
    });

    renderHook(() =>
      useStateWizardDraft({
        useDraftStore: useTestDraftStore,
        values: { text: "" },
        stepIndex: 0,
        restore,
      }),
    );

    expect(restore).toHaveBeenCalledWith({ text: "still writing" }, 2);
  });

  it("captures changed state after the debounce", () => {
    let text = "first";
    const { rerender } = renderHook(() =>
      useStateWizardDraft({
        useDraftStore: useTestDraftStore,
        values: { text },
        stepIndex: 1,
        restore: jest.fn(),
      }),
    );

    text = "latest";
    rerender(undefined);
    act(() => jest.advanceTimersByTime(800));

    expect(useTestDraftStore.getState().values).toEqual({ text: "latest" });
    expect(useTestDraftStore.getState().stepIndex).toBe(1);
  });

  it("clears memory after a successful save", () => {
    useTestDraftStore.setState({ values: { text: "private" }, updatedAt: Date.now() });
    const { result } = renderHook(() =>
      useStateWizardDraft({
        useDraftStore: useTestDraftStore,
        values: { text: "private" },
        stepIndex: 0,
        restore: jest.fn(),
      }),
    );

    act(() => result.current.clearDraft());

    expect(useTestDraftStore.getState().values).toBeNull();
    expect(useTestDraftStore.getState().updatedAt).toBeNull();
  });
});
