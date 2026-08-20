/**
 * THROWAWAY PROBE ROUTE — wayfinder #1231 (phone-width measurement). Not for merge.
 *
 * Renders, at real fidelity and at simulated phone widths:
 *   A — today's shipped DateTimeField card (calendar + timePicker + Done)
 *   B — #1191's proposed web `datetime` sheet (date-mode calendar + HH:MM row + Clear/Done)
 *   C — the proposed date-only target-date sheet (calendar + Clear/Done)
 *   D — the reminders row with the proposed inline compact HH:MM control
 *
 * Every box carries a testID so Playwright can read its boundingClientRect.
 */
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useThemePalette } from "@/src/lib/theme-palette";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

const WIDTHS = [320, 360, 375, 390, 430];

/** The proposed inline HH : MM control (#1191). Typed, not dragged. */
function ProbeTimeInput({
  compact,
  twelveHour,
  testID,
}: {
  compact?: boolean;
  twelveHour: boolean;
  testID: string;
}) {
  const theme = useThemePalette();
  const [hh, setHh] = useState(twelveHour ? "07" : "19");
  const [mm, setMm] = useState("05");
  const [meridiem, setMeridiem] = useState<"am" | "pm">("pm");

  const fontSize = compact ? 14 : 16;

  return (
    <View
      testID={testID}
      className={cn(
        "flex-row items-center rounded-md border border-input bg-background",
        compact ? "h-9 w-auto self-start px-2.5" : "h-12 w-full px-3",
      )}
      style={{ gap: compact ? 4 : 6 }}
    >
      <TextInput
        testID={`${testID}-hh`}
        value={hh}
        onChangeText={setHh}
        keyboardType="number-pad"
        maxLength={2}
        style={{
          fontSize,
          color: theme.foreground,
          textAlign: "center",
          // Two digits at the rendered size, plus a little breathing room. A
          // percentage/flex width would let the field collapse in the compact row.
          width: compact ? 22 : 26,
          padding: 0,
          ...(Platform.OS === "web" ? { outlineStyle: "none" as never } : null),
        }}
      />
      <Text testID={`${testID}-colon`} style={{ fontSize }} className="text-muted-foreground">
        :
      </Text>
      <TextInput
        testID={`${testID}-mm`}
        value={mm}
        onChangeText={setMm}
        keyboardType="number-pad"
        maxLength={2}
        style={{
          fontSize,
          color: theme.foreground,
          textAlign: "center",
          width: compact ? 22 : 26,
          padding: 0,
          ...(Platform.OS === "web" ? { outlineStyle: "none" as never } : null),
        }}
      />
      {twelveHour ? (
        <View testID={`${testID}-meridiem`} className="ml-1">
          <SegmentedControl
            options={[
              { value: "am", label: "AM" },
              { value: "pm", label: "PM" },
            ]}
            value={meridiem}
            onChange={(next) => setMeridiem(next)}
          />
        </View>
      ) : null}
    </View>
  );
}

function Footer({ testID }: { testID: string }) {
  return (
    <View testID={testID} className="mt-2 flex-row items-center justify-between gap-3">
      <Button testID={`${testID}-clear`} variant="ghost" size="sm">
        <Text>Clear</Text>
      </Button>
      <Button testID={`${testID}-done`} size="sm" className="min-w-[96px]">
        <Text>Done</Text>
      </Button>
    </View>
  );
}

/** The modal's exact chrome: `flex-1 items-center justify-center p-6` + the card. */
function SheetChrome({
  width,
  testID,
  children,
}: {
  width: number;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <View testID={`${testID}-viewport`} style={{ width }} className="items-center p-6">
      <View testID={testID} className="w-full max-w-[340px] rounded-2xl bg-card p-3">
        {children}
      </View>
    </View>
  );
}

function usePickerStyles() {
  const scheme = useColorSchemeName();
  const defaultStyles = useDefaultStyles(scheme);
  const theme = useThemePalette();
  return {
    ...defaultStyles,
    today: { borderColor: theme.primary, borderWidth: 1 },
    selected: { backgroundColor: theme.primary },
    selected_label: { color: theme.primaryForeground },
  };
}

export default function Probe1231() {
  const pickerStyles = usePickerStyles();
  const [date, setDate] = useState(dayjs("2026-09-15T19:05:00"));
  const now = dayjs("2026-09-20T12:00:00");
  const today = now.startOf("day");

  return (
    <ScrollView testID="probe-root" contentContainerStyle={{ paddingBottom: 200 }}>
      {WIDTHS.map((width) => (
        <View key={`a-${width}`}>
          <Text testID={`label-a-${width}`}>A shipped datetime @{width}</Text>
          <SheetChrome width={width} testID={`card-a-${width}`}>
            <View testID={`picker-a-${width}`}>
              <DateTimePicker
                mode="single"
                date={date}
                maxDate={now}
                timePicker
                onChange={({ date: next }) => next && setDate(dayjs(next))}
                styles={pickerStyles}
                components={{
                  IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                  IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
                }}
              />
            </View>
            <View className="mt-2">
              <Button testID={`done-a-${width}`}>
                <Text>Done</Text>
              </Button>
            </View>
          </SheetChrome>
        </View>
      ))}

      {(["en", "bg"] as const).map((locale) =>
        WIDTHS.map((width) => (
          <View key={`b-${locale}-${width}`}>
            <Text testID={`label-b-${locale}-${width}`}>
              B proposed datetime {locale} @{width}
            </Text>
            <SheetChrome width={width} testID={`card-b-${locale}-${width}`}>
              <View testID={`picker-b-${locale}-${width}`}>
                <DateTimePicker
                  mode="single"
                  date={date}
                  locale={locale}
                  firstDayOfWeek={1}
                  showOutsideDays={false}
                  maxDate={now}
                  onChange={({ date: next }) => next && setDate(dayjs(next))}
                  styles={pickerStyles}
                  components={{
                    IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                    IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
                  }}
                />
              </View>
              <View testID={`timerow-b-${locale}-${width}`} className="mt-2">
                <ProbeTimeInput
                  twelveHour={locale === "en"}
                  testID={`timeinput-b-${locale}-${width}`}
                />
              </View>
              <Footer testID={`footer-b-${locale}-${width}`} />
            </SheetChrome>
          </View>
        )),
      )}

      {(["en", "bg"] as const).map((locale) =>
        WIDTHS.map((width) => (
          <View key={`c-${locale}-${width}`}>
            <Text testID={`label-c-${locale}-${width}`}>
              C proposed date-only {locale} @{width}
            </Text>
            <SheetChrome width={width} testID={`card-c-${locale}-${width}`}>
              <View testID={`picker-c-${locale}-${width}`}>
                <DateTimePicker
                  mode="single"
                  date={today}
                  locale={locale}
                  firstDayOfWeek={1}
                  showOutsideDays={false}
                  minDate={today}
                  disabledDates={(d) => dayjs(d).isBefore(today, "day")}
                  onChange={() => {}}
                  styles={pickerStyles}
                  components={{
                    IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                    IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
                  }}
                />
              </View>
              <Footer testID={`footer-c-${locale}-${width}`} />
            </SheetChrome>
          </View>
        )),
      )}

      {/* D — the reminders row, in the real screen's chrome. Rendered at the REAL
          window width, so `wide` is whatever the viewport makes it. */}
      <Text testID="label-d">D reminders row (real window width)</Text>
      <View testID="d-scroll" className="grow p-6">
        <View testID="d-inner" className="mx-auto w-full max-w-2xl gap-6">
          <View testID="d-card" className="rounded-xl border border-border bg-card px-4">
            <ProbeReminderRow label="Дневник на благодарността" twelveHour testID="d-bg-12" />
            <ProbeReminderRow label="Дневник на благодарността" twelveHour={false} testID="d-bg-24" />
            <ProbeReminderRow label="Gratitude journal" twelveHour testID="d-en-12" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** NotificationTargetRow's exact layout, with the proposed inline control in place. */
function ProbeReminderRow({
  label,
  twelveHour,
  testID,
}: {
  label: string;
  twelveHour: boolean;
  testID: string;
}) {
  const [wide, setWide] = useState(false);

  return (
    <View
      testID={testID}
      className="gap-1.5 py-3.5"
      onLayout={() => {
        // Mirrors the row's own useWindowDimensions branch without importing it,
        // so the probe can report BOTH faces from one page if needed.
        if (Platform.OS === "web") setWide(window.innerWidth >= 640);
      }}
    >
      <View testID={`${testID}-line`} className="flex-row items-center gap-[14px]">
        <Icon name="favorite" className={cn("size-5 shrink-0", CHROME_MARK)} />
        <View
          testID={`${testID}-body`}
          className={cn("min-w-0 flex-1", wide ? "flex-row items-center gap-3" : "items-start gap-1")}
        >
          <Text
            testID={`${testID}-label`}
            numberOfLines={1}
            className={cn("text-[15px] font-semibold", wide && "min-w-[150px] shrink-0")}
          >
            {label}
          </Text>
          <ProbeTimeInput compact twelveHour={twelveHour} testID={`${testID}-time`} />
        </View>
        <Switch testID={`${testID}-switch`} checked onCheckedChange={() => {}} />
      </View>
    </View>
  );
}
