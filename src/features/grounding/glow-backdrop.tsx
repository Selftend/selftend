import { StyleSheet, View } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

interface GlowBackdropProps {
  hue: ExerciseHue;
}

const GLOW = 440;

// Decorative soft hue glow, centered behind the screen's focal content. Static by
// design: an animated version (reanimated) leaked into web layout/scroll height and
// left a gap below the screen, so this is a plain, out-of-flow, clipped backdrop that
// cannot affect layout. Rendered as an SVG radial gradient for a soft falloff on web
// and native.
export function GlowBackdrop({ hue }: GlowBackdropProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const color = hueHsl(hue, isDark, 1);
  const gradientId = `grounding-glow-${hue}`;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          pointerEvents: "none",
        },
      ]}
    >
      <Svg width={GLOW} height={GLOW}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.07} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
