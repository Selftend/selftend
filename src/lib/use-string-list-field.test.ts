import { act, renderHook } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import { useStringListField } from "@/src/lib/use-string-list-field";

type Form = { items: string[] };

// Drives the hook against a real RHF form. isDirty is read during render so RHF's
// formState proxy subscribes and re-renders reflect it.
function setup(initial: string[], opts?: { keepAtLeastOne?: boolean; shouldDirty?: boolean }) {
  return renderHook(() => {
    const form = useForm<Form>({ defaultValues: { items: initial } });
    const field = useStringListField(form, "items", opts);
    return { form, field, isDirty: form.formState.isDirty };
  });
}

describe("useStringListField", () => {
  it("exposes the current list via items", () => {
    const { result } = setup(["a", "b"]);
    expect(result.current.field.items).toEqual(["a", "b"]);
  });

  it("update() replaces the value at an index", () => {
    const { result } = setup(["a", "b"]);
    act(() => result.current.field.update(1, "B"));
    expect(result.current.form.getValues("items")).toEqual(["a", "B"]);
  });

  it("append() adds an empty string", () => {
    const { result } = setup(["a"]);
    act(() => result.current.field.append());
    expect(result.current.form.getValues("items")).toEqual(["a", ""]);
  });

  it("remove() deletes the item at an index", () => {
    const { result } = setup(["a", "b", "c"]);
    act(() => result.current.field.remove(1));
    expect(result.current.form.getValues("items")).toEqual(["a", "c"]);
  });

  // worry/beliefs forms: no options — the list may go empty.
  it("remove() can empty the list when keepAtLeastOne is not set", () => {
    const { result } = setup(["only"]);
    act(() => result.current.field.remove(0));
    expect(result.current.form.getValues("items")).toEqual([]);
  });

  // recovery form: keepAtLeastOne keeps a single empty input so a row is always rendered.
  it("keepAtLeastOne leaves one empty input when the last item is removed", () => {
    const { result } = setup(["only"], { keepAtLeastOne: true });
    act(() => result.current.field.remove(0));
    expect(result.current.form.getValues("items")).toEqual([""]);
  });

  // recovery form passes shouldDirty so unsaved edits flip the dirty guard.
  it("marks the form dirty on write when shouldDirty is set", () => {
    const { result } = setup(["a"], { shouldDirty: true });
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.field.append());
    expect(result.current.isDirty).toBe(true);
  });

  // worry/beliefs: default writes must NOT dirty the form (matches the original inline setValue).
  it("does not mark the form dirty on write by default", () => {
    const { result } = setup(["a"]);
    act(() => result.current.field.append());
    expect(result.current.isDirty).toBe(false);
  });
});
