import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";

describe("cbt draft store", () => {
  beforeEach(() => {
    useCbtDraftStore.getState().reset();
  });

  it("hydrates edit state and resets the step index", () => {
    useCbtDraftStore.getState().hydrate("edit", "record-1");

    expect(useCbtDraftStore.getState()).toMatchObject({
      mode: "edit",
      recordId: "record-1",
      stepIndex: 0,
      values: null,
    });
  });

  it("keeps values for the same draft and clears them after save", () => {
    const values = {
      automaticThought: "This will fail",
      balancedThought: "It may still be recoverable",
      distortions: ["catastrophizing"],
      emotions: ["Anxious"],
      situation: "A save failed",
    };

    useCbtDraftStore.getState().hydrate("create");
    useCbtDraftStore.getState().setValues(values);
    useCbtDraftStore.getState().hydrate("create");

    expect(useCbtDraftStore.getState().values).toEqual(values);

    useCbtDraftStore.getState().reset();

    expect(useCbtDraftStore.getState().values).toBeNull();
  });

  it("does not step beyond the last step", () => {
    useCbtDraftStore.getState().nextStep(4);
    useCbtDraftStore.getState().nextStep(4);
    useCbtDraftStore.getState().nextStep(4);
    useCbtDraftStore.getState().nextStep(4);
    useCbtDraftStore.getState().nextStep(4);
    useCbtDraftStore.getState().nextStep(4);

    expect(useCbtDraftStore.getState().stepIndex).toBe(4);
  });
});
