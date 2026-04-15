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
    });
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
