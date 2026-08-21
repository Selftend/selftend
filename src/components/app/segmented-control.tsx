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
  /**
   * Names the GROUP, for when the segments alone do not say what they choose
   * between ("AM"/"PM" in one of ten reminder rows). It belongs on the tablist
   * itself — an `aria-label` on a plain wrapping View names nothing.
   */
  accessibilityLabel?: string;
  /**
   * Renders the group inert while still showing which segment is chosen — the
   * shape a dimmed-but-truthful row needs (the reminders row keeps displaying
   * its real time while the master switch is off).
   */
  disabled?: boolean;
}

/**
 * A tablist of mutually exclusive segments.
 *
 * ⚠️ Tap target: `py-1.5` is not decoration. The segments used to render 43.2 × 24
 * — exactly on the WCAG 2.5.8 AA floor with nothing to spare — and `hitSlop`
 * cannot rescue them, because react-native-web targets the DOM box and ignores it
 * (#1231). The only lever on web is real padding, so the height comes from here.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
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
      accessibilityLabel={accessibilityLabel}
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
            aria-disabled={disabled}
            disabled={disabled}
            role="tab"
            onPress={() => onChange(opt.value)}
            className={cn("rounded-full px-3 py-1.5", active ? "bg-card" : "")}
            // Skipped entirely while disabled, so the group leaves the tab order
            // instead of offering keys that do nothing.
            {...(disabled ? {} : roving.getItemProps(index, () => onChange(opt.value)))}
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
