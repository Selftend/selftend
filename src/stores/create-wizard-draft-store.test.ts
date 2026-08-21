import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createWizardDraftStore,
  WIZARD_DRAFT_PERSIST_VERSION,
  WIZARD_DRAFT_TTL_MS,
} from "@/src/stores/create-wizard-draft-store";
import {
  purgePersistedWizardDrafts,
  resetAllDraftStores,
  WIZARD_DRAFT_STORAGE_PREFIX,
} from "@/src/stores/draft-store-registry";

interface Values {
  name: string;
}

// Let the persist middleware flush its (promise-based) AsyncStorage writes.
async function flushPersistWrites() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function storageKey(flowKey: string) {
  return `selftend:wizard-draft:${flowKey}`;
}

describe("createWizardDraftStore", () => {
  const useStore = createWizardDraftStore<Values>("test-flow");

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

describe("createWizardDraftStore - persistence", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips a draft through AsyncStorage into a fresh store", async () => {
    const writer = createWizardDraftStore<Values>("roundtrip");
    writer.getState().hydrate("create");
    writer.getState().setValues({ name: "half-written draft" });
    writer.getState().setStepIndex(2);
    await flushPersistWrites();

    const raw = await AsyncStorage.getItem(storageKey("roundtrip"));
    expect(raw).toContain("half-written draft");

    // A fresh store with the same flow key = app restart / page refresh.
    const reader = createWizardDraftStore<Values>("roundtrip");
    await reader.persist.rehydrate();

    expect(reader.getState().hydrated).toBe(true);
    expect(reader.getState().values).toEqual({ name: "half-written draft" });
    expect(reader.getState().stepIndex).toBe(2);
  });

  it("marks hydrated even when storage holds no draft", async () => {
    const store = createWizardDraftStore<Values>("empty-flow");
    await store.persist.rehydrate();

    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().values).toBeNull();
  });

  it("drops a persisted draft older than the TTL", async () => {
    await AsyncStorage.setItem(
      storageKey("stale-flow"),
      JSON.stringify({
        state: {
          mode: "create",
          entityId: null,
          stepIndex: 3,
          values: { name: "day-old draft" },
          updatedAt: Date.now() - WIZARD_DRAFT_TTL_MS - 1000,
        },
        version: WIZARD_DRAFT_PERSIST_VERSION,
      }),
    );

    const store = createWizardDraftStore<Values>("stale-flow");
    await store.persist.rehydrate();

    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().values).toBeNull();
    expect(store.getState().stepIndex).toBe(0);

    // The expired draft holds PHI: rejecting it at rehydrate must also remove
    // the lingering DISK copy, not just skip loading it.
    await flushPersistWrites();
    expect(await AsyncStorage.getItem(storageKey("stale-flow"))).toBeNull();
  });

  it("drops a shape-mismatched draft instead of feeding it to zodResolver", async () => {
    await AsyncStorage.setItem(
      storageKey("mismatched-flow"),
      JSON.stringify({
        state: {
          mode: "create",
          entityId: null,
          stepIndex: 1,
          // values must be an object (form values) - an older app version or
          // corrupted write must not crash the wizard.
          values: "not-an-object",
          updatedAt: Date.now(),
        },
        version: WIZARD_DRAFT_PERSIST_VERSION,
      }),
    );

    const store = createWizardDraftStore<Values>("mismatched-flow");
    await store.persist.rehydrate();

    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().values).toBeNull();
  });

  it("clearPersisted removes the draft from disk", async () => {
    const store = createWizardDraftStore<Values>("clear-flow");
    store.getState().setValues({ name: "to be cleared" });
    await flushPersistWrites();
    expect(await AsyncStorage.getItem(storageKey("clear-flow"))).not.toBeNull();

    store.getState().clearPersisted();
    await flushPersistWrites();

    expect(await AsyncStorage.getItem(storageKey("clear-flow"))).toBeNull();
  });

  it("resetAllDraftStores wipes persisted drafts from disk (sign-out removes PHI)", async () => {
    const store = createWizardDraftStore<Values>("signout-flow");
    store.getState().setValues({ name: "private in-progress record" });
    await flushPersistWrites();
    expect(await AsyncStorage.getItem(storageKey("signout-flow"))).not.toBeNull();

    resetAllDraftStores();
    await flushPersistWrites();

    expect(store.getState().values).toBeNull();
    expect(await AsyncStorage.getItem(storageKey("signout-flow"))).toBeNull();
  });

  it("purgePersistedWizardDrafts removes UNREGISTERED drafts by key prefix (cross-context leak)", async () => {
    // The leak this guards: a draft persisted in a PREVIOUS page load whose
    // store module was never evaluated in this JS context - it is invisible to
    // the registry, but its PHI is still on disk under the shared prefix.
    await AsyncStorage.setItem(
      `${WIZARD_DRAFT_STORAGE_PREFIX}ghost-flow`,
      JSON.stringify({
        state: {
          mode: "create",
          entityId: null,
          stepIndex: 2,
          values: { name: "previous user's private text" },
          updatedAt: Date.now(),
        },
        version: WIZARD_DRAFT_PERSIST_VERSION,
      }),
    );
    // An unrelated key must survive the purge untouched.
    await AsyncStorage.setItem("selftend:unrelated", "keep me");

    await purgePersistedWizardDrafts();

    expect(await AsyncStorage.getItem(`${WIZARD_DRAFT_STORAGE_PREFIX}ghost-flow`)).toBeNull();
    expect(await AsyncStorage.getItem("selftend:unrelated")).toBe("keep me");
  });

  it("the store key builder and the purge share the same prefix (cannot drift)", async () => {
    const store = createWizardDraftStore<Values>("prefix-parity-flow");
    store.getState().setValues({ name: "will be purged by prefix" });
    await flushPersistWrites();

    await purgePersistedWizardDrafts();

    expect(await AsyncStorage.getItem(storageKey("prefix-parity-flow"))).toBeNull();
  });
});
