import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { THEME } from "@/lib/theme";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import {
  currentDateKey,
  localDateKey,
  useSelectedDateStore,
} from "@/src/stores/selected-date-store";

const INITIAL_DAYS = 60;
const LOAD_CHUNK = 120;
const ITEM_WIDTH = 52; // fixed cell width keeps getItemLayout/scrollToIndex reliable

/** Local `YYYY-MM-DD` keys, newest first (today at index 0) for the last `count` days. */
function dayKeys(count: number, todayKey: string): string[] {
  const keys: string[] = [];
  const base = new Date(`${todayKey}T12:00:00`); // local noon avoids DST/midnight edge cases
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(localDateKey(d));
  }
  return keys;
}

function chipLabels(key: string): { weekday: string; month: string; day: string } {
  const d = new Date(`${key}T12:00:00`); // parsed as local
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    month: d.toLocaleDateString(undefined, { month: "short" }),
    day: String(d.getDate()),
  };
}

/** Whole days between `key` and today (0 = today, 1 = yesterday, …) = its index in the list. */
function daysBeforeToday(key: string): number {
  const a = new Date(`${key}T12:00:00`);
  const b = new Date();
  b.setHours(12, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function DateBar() {
  const { t } = useTranslation("navigation");
  const selectedDate = useSelectedDateStore((s) => s.selectedDate);
  const setSelectedDate = useSelectedDateStore((s) => s.setSelectedDate);
  const resetToToday = useSelectedDateStore((s) => s.resetToToday);
  const today = currentDateKey();
  const todayNumber = chipLabels(today).day;
  const onToday = selectedDate === today;

  const [count, setCount] = useState(INITIAL_DAYS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const days = useMemo(() => dayKeys(count, today), [count, today]);
  const listRef = useRef<FlatList<string>>(null);
  const offsetRef = useRef(0);
  const didInit = useRef(false);

  const scheme = useAppColorScheme();
  const defaultStyles = useDefaultStyles(scheme);
  const pickerStyles = useMemo(
    () => ({
      ...defaultStyles,
      today: { borderColor: THEME[scheme].primary, borderWidth: 1 },
      selected: { backgroundColor: THEME[scheme].primary },
      selected_label: { color: THEME[scheme].primaryForeground },
    }),
    [defaultStyles, scheme],
  );

  const getItemLayout = (_data: ArrayLike<string> | null | undefined, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  });

  // Scroll so the given day sits in the centre. Days too close to either end
  // can't centre — scrollToIndex clamps to the edge, which is what we want.
  const centerOn = (key: string, animated = true) => {
    const index = daysBeforeToday(key); // newest-first: today = 0
    if (index < 0) return;
    if (index >= count) setCount(index + LOAD_CHUNK);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated });
    });
  };

  const handleSelect = (key: string) => {
    setSelectedDate(key);
    centerOn(key);
  };

  const goToday = () => {
    resetToToday();
    centerOn(today);
  };

  // Inverted list: scrolling toward older days increases the offset.
  const scrollStrip = (direction: -1 | 1) => {
    const next = Math.max(0, offsetRef.current - direction * 200);
    listRef.current?.scrollToOffset({ offset: next, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.x;
  };

  const renderItem = ({ item: key }: { item: string }) => {
    const selected = key === selectedDate;
    const isToday = key === today;
    const { weekday, month, day } = chipLabels(key);
    // Dates outside the current month show the month instead of the weekday,
    // so you always know which month you're scrolled into.
    const sameMonth = key.slice(0, 7) === today.slice(0, 7);
    const topLabel = isToday ? t("dateBar.today") : sameMonth ? weekday : month;
    const a11y = isToday ? `${t("dateBar.today")} ${key}` : key;
    return (
      <View style={{ width: ITEM_WIDTH }} className="items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          accessibilityState={{ selected }}
          onPress={() => handleSelect(key)}
          className={cn(
            "min-w-[44px] items-center rounded-full px-2 py-1.5",
            selected ? "bg-primary/10" : "active:bg-muted/50",
          )}
        >
          <Text
            className={cn(
              "text-[10px]",
              selected || isToday ? "text-primary" : "text-muted-foreground",
            )}
          >
            {topLabel}
          </Text>
          <Text
            className={cn(
              "text-sm font-semibold",
              selected || isToday ? "text-primary" : "text-foreground",
            )}
          >
            {day}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-background px-3 py-2">
      {/* Calendar jump: opens an in-app month picker (all platforms). Month
          navigation only browses — the date changes only when a day is tapped. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("dateBar.openCalendar")}
        onPress={() => setPickerOpen(true)}
        className="size-9 shrink-0 items-center justify-center rounded-lg active:bg-muted/50"
      >
        <Icon name="calendar-month" className="size-5 text-muted-foreground" />
      </Pressable>

      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.scrollOlder")}
          onPress={() => scrollStrip(-1)}
          className="size-9 shrink-0 items-center justify-center rounded-lg active:bg-muted/50"
        >
          <Icon name="chevron-left" className="size-5 text-muted-foreground" />
        </Pressable>
      ) : null}

      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(key) => key}
        renderItem={renderItem}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialNumToRender={45}
        maxToRenderPerBatch={30}
        windowSize={31}
        updateCellsBatchingPeriod={30}
        onEndReached={() => setCount((c) => c + LOAD_CHUNK)}
        onEndReachedThreshold={1}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollToIndexFailed={() => {}}
        onLayout={() => {
          if (didInit.current || onToday) return;
          didInit.current = true;
          centerOn(selectedDate, false);
        }}
        className="flex-1"
      />

      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.scrollNewer")}
          onPress={() => scrollStrip(1)}
          className="size-9 shrink-0 items-center justify-center rounded-lg active:bg-muted/50"
        >
          <Icon name="chevron-right" className="size-5 text-muted-foreground" />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("dateBar.today")}
        accessibilityState={{ disabled: onToday }}
        disabled={onToday}
        onPress={goToday}
        className={cn(
          "size-9 shrink-0 items-center justify-center rounded-lg active:bg-muted/50",
          onToday && "opacity-40",
        )}
      >
        <View className="size-5 items-center justify-center">
          <Icon name="calendar-today" className="size-5 text-muted-foreground" />
          <Text className="absolute inset-x-0 top-[8px] text-center text-[10px] font-bold leading-none text-muted-foreground">
            {todayNumber}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setPickerOpen(false)}
        >
          <Pressable className="w-full max-w-[340px] rounded-2xl bg-card p-3" onPress={() => {}}>
            <DateTimePicker
              mode="single"
              date={dayjs(selectedDate)}
              maxDate={dayjs().endOf("day")}
              onChange={({ date }) => {
                setPickerOpen(false);
                handleSelect(dayjs(date).format("YYYY-MM-DD"));
              }}
              styles={pickerStyles}
              components={{
                IconPrev: <Icon name="chevron-left" className="size-5 text-foreground" />,
                IconNext: <Icon name="chevron-right" className="size-5 text-foreground" />,
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
