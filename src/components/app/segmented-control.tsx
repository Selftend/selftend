import { Pressable, View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useRovingFocus } from "@/src/lib/roving-focus";

interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const roving = useRovingFocus({
    count: options.length,
    // No match: treat the first segment as active so the group stays tab-reachable.
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
    onActivate: (index) => onChange(options[index].value),
  });

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-full bg-muted p-0.5"
      role="tablist"
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="tab"
            aria-selected={active}
            role="tab"
            onPress={() => onChange(opt.value)}
            className={cn("rounded-full px-3 py-1", active ? "bg-card" : "")}
            {...roving.getItemProps(index, () => onChange(opt.value))}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
