import { useCallback } from "react";
import { useWatch } from "react-hook-form";
import type { FieldPathByValue, FieldValues, UseFormReturn } from "react-hook-form";

type StringListPath<TForm extends FieldValues> = FieldPathByValue<TForm, string[]>;

export function useStringListField<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  name: StringListPath<TForm>,
  opts: { keepAtLeastOne?: boolean } = {},
) {
  const { getValues, setValue, control } = form;

  // useWatch (a subscription hook), NOT form.watch(name) read during render:
  // these list rows are not registered inputs, and under the React Compiler a
  // render-time watch() read is memoized as a pure call with stable arguments -
  // the cached array never refreshes, so typed text vanished and Add never
  // rendered a row while the values kept landing in form state (#476).
  const items = (useWatch({ control, name }) ?? getValues(name)) as string[];

  const write = useCallback(
    (next: string[]) => {
      const value = next as unknown as Parameters<typeof setValue>[1];
      // shouldDirty keeps the wizard's draft-restore guard honest: a list edit
      // IS a user edit, and the one screen whose lists always worked
      // (recovery) already wrote with it.
      setValue(name, value, { shouldDirty: true });
    },
    [name, setValue],
  );

  const update = useCallback(
    (index: number, value: string) => {
      const next = [...(getValues(name) as string[])];
      next[index] = value;
      write(next);
    },
    [name, getValues, write],
  );

  const append = useCallback(() => {
    write([...(getValues(name) as string[]), ""]);
  }, [name, getValues, write]);

  const remove = useCallback(
    (index: number) => {
      const next = (getValues(name) as string[]).filter((_, i) => i !== index);
      write(opts.keepAtLeastOne && next.length === 0 ? [""] : next);
    },
    [name, getValues, write, opts.keepAtLeastOne],
  );

  return { items, update, append, remove };
}
