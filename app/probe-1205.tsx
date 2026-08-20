/**
 * THROWAWAY PROBE ROUTE — wayfinder #1205 (picker sheet keyboard/SR contract). Not for merge.
 *
 * Renders the sheet as a REAL modal with the chrome #1185 specifies — PressShieldModal →
 * sibling backdrop (tabIndex -1) → card → picker → Clear/Done footer — so focus-on-open,
 * the tab cycle, Escape and focus-return can be driven with a real keyboard rather than
 * reasoned about from react-native-web's source.
 */
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useThemePalette } from "@/src/lib/theme-palette";

export default function Probe1205() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dayjs("2026-09-15T19:05:00"));
  const scheme = useColorSchemeName();
  const defaultStyles = useDefaultStyles(scheme);
  const theme = useThemePalette();
  const pickerStyles = {
    ...defaultStyles,
    today: { borderColor: theme.primary, borderWidth: 1 },
    selected: { backgroundColor: theme.primary },
    selected_label: { color: theme.primaryForeground },
  };

  return (
    <View testID="probe-1205-root" className="flex-1 gap-4 p-6">
      <Button testID="before-trigger">
        <Text>Before</Text>
      </Button>
      <Button testID="open-trigger" onPress={() => setOpen(true)}>
        <Text>Open picker</Text>
      </Button>
      <Button testID="after-trigger">
        <Text>After</Text>
      </Button>
      <Text testID="current-value">{date.format("YYYY-MM-DD")}</Text>

      <PressShieldModal
        animation="fade"
        visible={open}
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View testID="sheet-container" className="flex-1 items-center justify-center p-3 sm:p-6">
          <Pressable
            testID="sheet-backdrop"
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="absolute inset-0 bg-black/50"
            onPress={() => setOpen(false)}
            role="button"
            {...(Platform.OS === "web" ? { tabIndex: -1 as const } : {})}
          />
          <View testID="sheet-card" className="w-full max-w-[340px] rounded-2xl bg-card p-3">
            <View testID="sheet-picker">
              <DateTimePicker
                mode="single"
                date={date}
                locale="en"
                firstDayOfWeek={1}
                showOutsideDays={false}
                onChange={({ date: next }) => next && setDate(dayjs(next))}
                styles={pickerStyles}
                components={{
                  IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                  IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
                }}
              />
            </View>
            <View testID="sheet-footer" className="mt-2 flex-row items-center justify-between gap-3">
              <Button testID="sheet-clear" variant="ghost" size="sm" onPress={() => setOpen(false)}>
                <Text>Clear</Text>
              </Button>
              <Button testID="sheet-done" size="sm" onPress={() => setOpen(false)}>
                <Text>Done</Text>
              </Button>
            </View>
          </View>
        </View>
      </PressShieldModal>
    </View>
  );
}
