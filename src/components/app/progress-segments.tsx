import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { useAccentHsl } from "@/src/lib/theme-palette";
import { currentStateProps } from "@/src/lib/accessibility";

/**
 * One stop on a rail: what that part of the form is called, and whether it
 * holds something the user put there.
 *
 * ☠️ `filled` is per-stop and never a prefix count. A prefix lies the moment
 * fields are filled out of order, which is exactly what a one-column form
 * exists to allow (#1380). It also has to be false for a field that arrives
 * PRE-ANSWERED - a defaulted radio group is not an answer until the user
 * touches it - or a fresh form lights segments before anything is typed.
 */
export interface ProgressStop {
  label: string;
  filled: boolean;
}

interface StepModeProps {
  /** How many steps the flow has. */
  total: number;
  /** 0-based index of the step on screen. */
  current: number;
  /** Makes each segment a button that jumps to that step. */
  onSelect?: (index: number) => void;
  stops?: never;
  note?: never;
}

interface RailModeProps {
  /** The parts of a one-column form, in the order they appear down the page. */
  stops: ProgressStop[];
  /**
   * The plain sentence that states where the user is. It is the ONLY part of
   * the rail assistive technology reads: the bars and their captions are
   * decorative, so this sentence has to carry the whole meaning on its own.
   */
  note: string;
  total?: never;
  current?: never;
  onSelect?: never;
}

type ProgressSegmentsProps = StepModeProps | RailModeProps;

/**
 * The app's 4px progress segments, in two shapes.
 *
 * **Step mode** (`total` + `current`) is the original: a stepped flow, where
 * everything before the current step is done and everything after it is out of
 * reach. Segments are buttons when `onSelect` is given, and each one carries the
 * step accessibility contract.
 *
 * **Rail mode** (`stops` + `note`) is the one-column form's labelled rail. It
 * names its parts rather than counting steps, so a user can see what they are
 * being asked before answering any of it and answer the last part first. It is
 * READ-ONLY - the column has no step to jump to, every field is already on
 * screen - so it draws no pressables at all.
 *
 * The two shapes share this component rather than forking because they are the
 * same 4px segment run with the same accent; only what a lit segment MEANS
 * differs (a step you have passed, versus a part you have filled).
 */
export function ProgressSegments(props: ProgressSegmentsProps) {
  const accent = useAccentHsl();
  const { t } = useTranslation("cbt");

  if (props.stops) {
    const { stops, note } = props;
    return (
      <View className="gap-2">
        {/*
         * Decorative: a run of unlabelled bars read out one by one is noise,
         * and their captions duplicate the field labels a screen reader is
         * about to reach anyway. The note below is the accessible statement.
         */}
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="gap-1.5"
        >
          <View className="flex-row gap-1.5">
            {stops.map((stop) => (
              <View
                key={stop.label}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: accent(stop.filled ? 1 : 0.16),
                }}
              />
            ))}
          </View>
          <View className="flex-row gap-1">
            {stops.map((stop) => (
              // The captions wrap rather than shrink: at 360dp five of them
              // share about 310px, which is under the widest label's single
              // line, and a clipped stop name is worse than a two-line one.
              <Text
                key={stop.label}
                className={
                  stop.filled
                    ? "min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-foreground"
                    : "min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                }
              >
                {stop.label}
              </Text>
            ))}
          </View>
        </View>
        <Text variant="muted" className="text-xs">
          {note}
        </Text>
      </View>
    );
  }

  const { total, current, onSelect } = props;
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const alpha = i < current ? 1 : i === current ? 0.6 : 0.16;
        return (
          <Pressable
            key={i}
            accessibilityLabel={t("grounding.goToStep", { current: i + 1, total })}
            accessibilityRole="button"
            disabled={!onSelect}
            onPress={() => onSelect?.(i)}
            role="button"
            {...currentStateProps(i === current, "step")}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <View style={{ height: 4, borderRadius: 2, backgroundColor: accent(alpha) }} />
          </Pressable>
        );
      })}
    </View>
  );
}
