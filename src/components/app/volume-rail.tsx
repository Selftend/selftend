import { View } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { VolumeSlider } from "@/src/components/app/volume-slider";

/**
 * One volume lane as design `4c` draws it: icon, a fixed label column, the
 * track, and the current percentage - a restyle of the always-visible sliders
 * the session screen has carried since the sounds sheet gave up volume
 * (sounds-sheet.tsx keeps selection; these keep loudness).
 *
 * At the 360dp floor the fixed columns (18px icon + 78px label + 34px readout
 * + three 14px gaps) leave the track ~140px, comfortably above the 18px thumb.
 */
export function VolumeRail({
  icon,
  label,
  value,
  onChange,
  onCommit,
  accessibilityLabel,
}: {
  icon: MaterialIconName;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  accessibilityLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-3.5">
      <Icon name={icon} size={18} className="text-muted-foreground" />
      <Text variant="muted" className="w-[78px] text-[13px]" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-1">
        <VolumeSlider
          accessibilityLabel={accessibilityLabel}
          onChange={onChange}
          onCommit={onCommit}
          value={value}
        />
      </View>
      <Text variant="muted" className="w-[34px] text-right text-xs tabular-nums">
        {Math.round(value * 100)}%
      </Text>
    </View>
  );
}
