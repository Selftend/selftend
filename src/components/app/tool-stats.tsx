import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

interface ToolStatItem {
  /** Bold, accent-colored value, e.g. "12", "7.5h", "Stage 3". */
  value: string;
  /** Muted trailing label, e.g. "entries". Pass "" to render the value alone. */
  label: string;
}

interface ToolStatsProps {
  items: ToolStatItem[];
  /**
   * Tailwind text-color class for the bold values. These are small text, so pass
   * the ink token, not the published accent: `text-accent-ink` inside a room of
   * that hue, `text-<hue>-ink` (e.g. "text-be-ink") anywhere else (#403). Must be
   * a literal used elsewhere. Ignored entirely when `tone="onField"`.
   */
  accentClassName: string;
  /** Optional data line under the stats (e.g. "LAST · 5/31/2026"). Uppercase, accent-tinted. */
  subline?: string;
  /**
   * Styling for `subline`. "accent" (default) is the bold uppercase accent-tinted treatment.
   * "muted" renders calm, sentence-case, muted text - use for empty/"no data yet" states so
   * they don't read as alarming.
   */
  sublineTone?: "accent" | "muted";
  /** Optional "Inspired by ..." credit, rendered as the last line under the stats. */
  credit?: string;
  /**
   * "default" renders the inline accent-on-surface row. "onField" renders the
   * Direction B field treatment for a module-hue field header: display-face
   * white values in columns with small labels underneath (`accentClassName`
   * is ignored — everything is white ink on the field).
   */
  tone?: "default" | "onField";
}

export function ToolStats({
  items,
  accentClassName,
  subline,
  sublineTone = "accent",
  credit,
  tone = "default",
}: ToolStatsProps) {
  if (tone === "onField") {
    return (
      <View className="gap-2.5">
        <View className="flex-row flex-wrap items-end gap-x-6 gap-y-2">
          {items.map((item, i) => (
            <View key={i}>
              <Text className="font-display text-[22px] font-extrabold leading-[1.15] text-white">
                {item.value}
              </Text>
              {item.label ? (
                <Text className="text-[11px] text-white/[0.88]">{item.label}</Text>
              ) : null}
            </View>
          ))}
        </View>
        {subline ? (
          sublineTone === "muted" ? (
            <Text className="text-sm text-white/[0.88]">{subline}</Text>
          ) : (
            <Text className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/[0.92]">
              {subline}
            </Text>
          )
        ) : null}
        {credit ? <Text className="text-[11px] text-white/[0.88]">{credit}</Text> : null}
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item, i) => (
          <Text key={i} variant="muted" className="text-[13px]">
            <Text className={`text-[13px] font-bold ${accentClassName}`}>{item.value}</Text>
            {item.label ? ` ${item.label}` : ""}
          </Text>
        ))}
      </View>
      {subline ? (
        sublineTone === "muted" ? (
          <Text className="text-sm text-muted-foreground">{subline}</Text>
        ) : (
          <Text className={`text-[11px] font-bold uppercase tracking-[0.14em] ${accentClassName}`}>
            {subline}
          </Text>
        )
      ) : null}
      {credit ? (
        <Text variant="eyebrow" tint="primary" className="mt-0.5">
          {credit}
        </Text>
      ) : null}
    </View>
  );
}
