import { useCallback } from "react";
import type { FieldPathByValue, FieldValues, UseFormReturn } from "react-hook-form";

type StringListPath<TForm extends FieldValues> = FieldPathByValue<TForm, string[]>;

export function useStringListField<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  name: StringListPath<TForm>,
  opts: { keepAtLeastOne?: boolean; shouldDirty?: boolean } = {},
) {
  const { watch, setValue } = form;
  const items = watch(name) as string[];

  // setValue must be byte-faithful: pass NO options object when shouldDirty is falsy
  // (worry/beliefs called setValue(name, next) with no third arg), and { shouldDirty: true } for recovery.
  const write = useCallback(
    (next: string[]) => {
      const value = next as unknown as Parameters<typeof setValue>[1];
      if (opts.shouldDirty) {
        setValue(name, value, { shouldDirty: true });
      } else {
        setValue(name, value);
      }
    },
    [name, setValue, opts.shouldDirty],
  );

  const update = useCallback(
    (index: number, value: string) => {
      const next = [...(watch(name) as string[])];
      next[index] = value;
      write(next);
    },
    [name, watch, write],
  );

  const append = useCallback(() => {
    write([...(watch(name) as string[]), ""]);
  }, [name, watch, write]);

  const remove = useCallback(
    (index: number) => {
      const next = (watch(name) as string[]).filter((_, i) => i !== index);
      write(opts.keepAtLeastOne && next.length === 0 ? [""] : next);
    },
    [name, watch, write, opts.keepAtLeastOne],
  );

  return { items, update, append, remove };
}
