import { act, renderHook } from "@testing-library/react-native";
import { useForm } from "react-hook-form";

import { useStringListField } from "@/src/lib/use-string-list-field";

type Form = { items: string[] };

// Drives the hook against a real RHF form. isDirty is read during render so RHF's
// formState proxy subscribes and re-renders reflect it.
function setup(initial: string[], opts?: { keepAtLeastOne?: boolean }) {
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

  // worry/beliefs forms: no options - the list may go empty.
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

  // A list edit IS a user edit: every write flips the dirty guard, so a
  // wizard's draft-restore can't clobber what the user just typed (#476).
  it("marks the form dirty on every write", () => {
    const { result } = setup(["a"]);
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.field.append());
    expect(result.current.isDirty).toBe(true);
  });

  // The rows are not registered inputs; items must still track writes through
  // the useWatch subscription (render-time form.watch() reads were memoized
  // away under the React Compiler - #476).
  it("items reflects a write on the next render", () => {
    const { result } = setup(["a"]);
    act(() => result.current.field.update(0, "edited"));
    expect(result.current.field.items).toEqual(["edited"]);
    act(() => result.current.field.append());
    expect(result.current.field.items).toEqual(["edited", ""]);
  });
});
