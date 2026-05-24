import React, { useRef } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { currentDateKey, useSelectedDateStore } from "@/src/stores/selected-date-store";

const WINDOW_DAYS = 60; // how many past days the strip renders before the calendar is needed

/** `YYYY-MM-DD` keys for the last WINDOW_DAYS days, oldest first, today last. */
function recentDayKeys(): string[] {
  const keys: string[] = [];
  const base = new Date(`${currentDateKey()}T00:00:00.000Z`);
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function chipLabels(key: string): { weekday: string; day: string } {
  const d = new Date(`${key}T00:00:00.000Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
    day: String(d.getUTCDate()),
  };
}

export function DateBar() {
  const { t } = useTranslation("navigation");
  const selectedDate = useSelectedDateStore((s) => s.selectedDate);
  const setSelectedDate = useSelectedDateStore((s) => s.setSelectedDate);
  const resetToToday = useSelectedDateStore((s) => s.resetToToday);
  const today = currentDateKey();
  const days = recentDayKeys();
  const scrollRef = useRef<ScrollView>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  // Opens the browser's native date picker from the calendar icon (web only),
  // so the bar shows just an icon — not a visible date input field.
  const openCalendar = () => {
    const el = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const getStripNode = (): HTMLElement | null =>
    (
      scrollRef.current as unknown as { getScrollableNode?: () => HTMLElement } | null
    )?.getScrollableNode?.() ?? null;

  // Pan the day strip on web — desktop has no touch-drag. Mobile keeps native drag.
  const scrollStrip = (direction: -1 | 1) => {
    const node = getStripNode();
    if (node && typeof node.scrollBy === "function") {
      node.scrollBy({ left: direction * 200, behavior: "smooth" });
    }
  };

  // Keep today (rightmost) in view on first layout. On web, set scrollLeft to the
  // content width directly — the browser clamps to the true end regardless of when
  // the strip's own width settles (scrollToEnd can land short under flex layout).
  const pinToToday = () => {
    if (Platform.OS === "web") {
      const node = getStripNode();
      if (node) node.scrollLeft = node.scrollWidth;
    } else {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  };

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-background px-3 py-2">
      {/* Calendar jump: an icon button that opens the native date picker (web). */}
      {Platform.OS === "web" ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("dateBar.openCalendar")}
            onPress={openCalendar}
            className="size-9 items-center justify-center rounded-lg border border-border bg-card active:bg-accent/40"
          >
            <Icon name="calendar-month" className="size-5 text-foreground" />
          </Pressable>
          {React.createElement("input", {
            type: "date",
            max: today,
            value: selectedDate,
            ref: dateInputRef,
            "aria-hidden": true,
            tabIndex: -1,
            onChange: (e: { target: { value: string } }) => {
              if (e.target.value) setSelectedDate(e.target.value);
            },
            style: {
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 1,
              height: 1,
              opacity: 0,
              border: 0,
              padding: 0,
              pointerEvents: "none",
            },
          })}
        </View>
      ) : null}

      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.scrollOlder")}
          onPress={() => scrollStrip(-1)}
          className="size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card active:bg-accent/40"
        >
          <Icon name="chevron-left" className="size-5 text-foreground" />
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={pinToToday}
        className="flex-1"
        contentContainerClassName="flex-row items-center gap-1.5"
      >
        {days.map((key) => {
          const selected = key === selectedDate;
          const isToday = key === today;
          const { weekday, day } = chipLabels(key);
          const a11y = isToday ? `${t("dateBar.today")} ${key}` : key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              accessibilityState={{ selected }}
              onPress={() => setSelectedDate(key)}
              className={cn(
                "min-w-[44px] items-center rounded-lg border px-2 py-1",
                selected ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <Text
                className={cn("text-[10px]", selected ? "text-primary" : "text-muted-foreground")}
              >
                {isToday ? t("dateBar.today") : weekday}
              </Text>
              <Text className={cn("text-sm font-semibold", selected && "text-primary")}>{day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.scrollNewer")}
          onPress={() => scrollStrip(1)}
          className="size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card active:bg-accent/40"
        >
          <Icon name="chevron-right" className="size-5 text-foreground" />
        </Pressable>
      ) : null}

      {selectedDate !== today ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dateBar.today")}
          onPress={resetToToday}
          className="flex-row items-center gap-1 rounded-lg bg-primary px-2 py-1"
        >
          <Icon name="today" className="size-4 text-primary-foreground" />
          <Text className="text-xs font-semibold text-primary-foreground">
            {t("dateBar.today")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
