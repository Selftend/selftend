import { createDraftStore } from "@/src/stores/create-draft-store";

interface Values {
  title: string;
}

describe("createDraftStore", () => {
  const useStore = createDraftStore<Values>();

  beforeEach(() => {
    useStore.getState().reset();
  });

  it("hydrate sets the entityId and clears values for a different draft", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "draft-a" });
    useStore.getState().hydrate("b");

    expect(useStore.getState()).toMatchObject({ entityId: "b", values: null });
  });

  it("hydrate keeps values when re-hydrating the same entityId", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "draft-a" });
    useStore.getState().hydrate("a");

    expect(useStore.getState().values).toEqual({ title: "draft-a" });
  });

  it("hydrate with no argument targets the null (create) draft", () => {
    useStore.getState().hydrate();
    expect(useStore.getState().entityId).toBeNull();
  });

  it("reset clears entityId and values", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "x" });
    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({ entityId: null, values: null });
  });
});
