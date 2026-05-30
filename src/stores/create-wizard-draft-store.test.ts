import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

interface Values {
  name: string;
}

describe("createWizardDraftStore", () => {
  const useStore = createWizardDraftStore<Values>();

  beforeEach(() => {
    useStore.getState().reset();
  });

  // hydrate
  it("hydrate keeps stepIndex and values when both mode and entityId match", () => {
    useStore.getState().hydrate("edit", "entity-1");
    useStore.getState().setValues({ name: "draft" });
    useStore.getState().nextStep(5);
    useStore.getState().hydrate("edit", "entity-1");

    expect(useStore.getState()).toMatchObject({ stepIndex: 1, values: { name: "draft" } });
  });

  it("hydrate resets stepIndex and values when mode differs", () => {
    useStore.getState().hydrate("edit", "entity-1");
    useStore.getState().setValues({ name: "draft" });
    useStore.getState().nextStep(5);
    useStore.getState().hydrate("create", "entity-1");

    expect(useStore.getState()).toMatchObject({ stepIndex: 0, values: null });
  });

  it("hydrate resets stepIndex and values when entityId differs", () => {
    useStore.getState().hydrate("edit", "entity-1");
    useStore.getState().setValues({ name: "draft" });
    useStore.getState().nextStep(5);
    useStore.getState().hydrate("edit", "entity-2");

    expect(useStore.getState()).toMatchObject({ stepIndex: 0, values: null });
  });

  it("hydrate with no entityId defaults entityId to null", () => {
    useStore.getState().hydrate("create");
    expect(useStore.getState().entityId).toBeNull();
  });

  // nextStep
  it("nextStep advances the step index", () => {
    useStore.getState().hydrate("create");
    useStore.getState().nextStep(5);
    expect(useStore.getState().stepIndex).toBe(1);
  });

  it("nextStep clamps at max", () => {
    useStore.getState().nextStep(2);
    useStore.getState().nextStep(2);
    useStore.getState().nextStep(2);
    useStore.getState().nextStep(2);

    expect(useStore.getState().stepIndex).toBe(2);
  });

  // previousStep
  it("previousStep decrements the step index", () => {
    useStore.getState().nextStep(5);
    useStore.getState().previousStep();
    expect(useStore.getState().stepIndex).toBe(0);
  });

  it("previousStep clamps at 0", () => {
    useStore.getState().previousStep();
    useStore.getState().previousStep();
    expect(useStore.getState().stepIndex).toBe(0);
  });

  // reset
  it("reset restores mode:create, entityId:null, stepIndex:0, values:null", () => {
    useStore.getState().hydrate("edit", "entity-x");
    useStore.getState().setValues({ name: "something" });
    useStore.getState().nextStep(5);
    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({
      mode: "create",
      entityId: null,
      stepIndex: 0,
      values: null,
    });
  });

  // setStepIndex
  it("setStepIndex sets the step index directly", () => {
    useStore.getState().setStepIndex(3);
    expect(useStore.getState().stepIndex).toBe(3);
  });

  // setValues
  it("setValues sets the values directly", () => {
    useStore.getState().setValues({ name: "hello" });
    expect(useStore.getState().values).toEqual({ name: "hello" });
  });
});
