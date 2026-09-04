import { useRef } from "react";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { buildRecordBand } from "@/src/features/progress/record-band";

interface RecordBandCardProps {
  /** Every civil day the viewer holds a record on, from `useRecordDays`. */
  dayKeys: string[] | undefined;
  lang: string;
}

/** Horizontal pixels per day on the axis. */
const DAY_WIDTH = 4;
/** Mark diameter. Narrower than `DAY_WIDTH` so adjacent days stay countable-looking. */
const MARK_SIZE = 3;
const BAND_HEIGHT = 28;

/**
 * "Your days" (#1906, from #1839 §3/§4) - one mark for each day the person
 * recorded anything, anywhere in the app, over all time.
 *
 * ☠️ **A day with six records and a day with one look identical. That is the
 * point, not a limitation to fix later.** The screen states that the record
 * exists and nothing else: no count line, no caption, no range control. #1840
 * cut the spanning scalar and #1834 named the shape to avoid - a numerator over
 * a drawn denominator - so a caption under this band would restore it by the
 * back door.
 *
 * ☠️ **The marks are inert. No press handler, no door.** #1840's stated reason
 * this screen is safe is that it holds no content: *"you cannot re-read a
 * thought record from a dot."* A pressable dot puts that back. A day names no
 * tool either, so there is nothing for a tool-screen door to target.
 *
 * ☠️ **No lattice, no gridlines, no year separators, no "today" pin.** The
 * lattice is the chain, not the calendar, and a drawn empty cell promotes
 * absence to a first-class mark. Only recorded days are drawn; the space
 * between them is space.
 *
 * ☠️ **A mark does not say which tool it came from** - `src/lib/theme/encoding.ts`
 * keeps hue only where colour carries information read off it, and
 * "distinguishes items in a set" is explicitly not enough. Moot anyway: the
 * unit is the day, not the tool.
 *
 * ⚠️ Built from plain `View`s rather than SVG, deliberately. `progress-screen.test.tsx`
 * asserts no `Svg` mounts on this screen as its proof that the mood trend is
 * gone (#1903); drawing this band in SVG would force that guard to be weakened
 * to accommodate it, and it is the only thing standing between this screen and
 * a chart coming back.
 */
export function RecordBandCard({ dayKeys, lang }: RecordBandCardProps) {
  const { t } = useTranslation("navigation");
  const scrollRef = useRef<ScrollView>(null);
  const band = buildRecordBand(dayKeys, lang);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("progress.timelineTitle")}</CardTitle>
        <CardDescription>{t("progress.timelineDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          ☠️ Loading renders NOTHING here, not the empty line. `undefined` is the
          query in flight and `[]` is a person with no record; collapsing them
          told someone with years of history that nothing was there, on first
          paint, on the screen whose job is to state the record truthfully.
        */}
        {band.state === "loading" ? null : band.state === "marks" ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            // Newest right, opening on today. `onContentSizeChange` rather than a
            // layout effect: the content width is only known once the band has
            // measured, and on web the ref can still be null on the first call.
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {/*
              One summary node, labelled by extent alone. The marks below are
              hidden from assistive tech - N dots announced one by one is noise,
              and a total would be the count that was cut.

              ☠️ An a11y-only count was REFUSED on #1906: handing AT users the
              figure removed for being harmful is worse than the gap. Said
              plainly - a screen-reader user gets almost nothing from this
              card. That is a known cost of the shape, not a defect to patch
              with a number.
            */}
            <View
              accessible
              accessibilityRole="image"
              // ☠️ `role="img"` as well, and it is load-bearing on web:
              // react-native-web DROPS the native-only `accessible` prop, and a
              // generic div may not carry an accessible name - so without this
              // the extent label below is simply not announced, and jest's iOS
              // preset cannot fail on it. `mood-week-hero.tsx` carries the same
              // pair for the same reason.
              role="img"
              accessibilityLabel={t("progress.timelineExtent", { from: band.firstMonthLabel })}
              testID="record-band"
              style={{ width: band.totalDays * DAY_WIDTH, height: BAND_HEIGHT }}
            >
              {band.months.map((month) => (
                <Text
                  key={month.offset}
                  variant="muted"
                  className="absolute top-0 text-[10px]"
                  style={{ left: month.offset * DAY_WIDTH }}
                >
                  {month.label}
                </Text>
              ))}
              {band.marks.map((offset) => (
                <View
                  key={offset}
                  className="absolute rounded-full bg-primary"
                  style={{
                    left: offset * DAY_WIDTH,
                    bottom: 0,
                    width: MARK_SIZE,
                    height: MARK_SIZE * 3,
                  }}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          /*
            Both empty bodies are a single muted line in this card's own
            `CardContent`, the shape `RecoveryTimelineCard` uses for
            `cbt:recovery.timeline.empty`.

            ☠️ NOT the house `EmptyState` (`src/components/app/screen-state.tsx`):
            it renders its own `Card` and would double-card inside this one.
            Neither line carries a title - the card above already has one.

            ☠️ The single-day state needs its own string. "Nothing here yet"
            would be a lie about the person's own record, and a count would be
            the count line this card refuses.

            ☠️ The empty state points NOWHERE - no button, no door out. An empty
            record is not a defect and has nothing to repair; a door here would
            say "go and use a tool so this fills in", making the band the reason
            to practise, which is `docs/product-principles.md` §12 / ADR-0004
            inverted. `/tools` is one sidebar row away.
          */
          <Text variant="muted">
            {band.state === "single-day"
              ? t("progress.timelineSingleDay")
              : t("progress.timelineEmpty")}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
