import type { ReactNode } from "react";
import { View } from "react-native";
import { Circle, G, Path, Rect, Svg, Text as SvgText } from "react-native-svg";

const AQUA = "hsl(196, 52%, 45%)";
const AQUA_35 = "hsla(196, 52%, 45%, 0.35)";
const AQUA_40 = "hsla(196, 52%, 45%, 0.40)";

// Decorative wrapper: View carries the RN a11y hide props so they don't leak
// to the SVG DOM element on web (react-native-svg renders a real <svg>, and
// accessibilityElementsHidden/importantForAccessibility are not valid SVG
// attributes — they would print React warnings). The SVG itself only needs
// aria-hidden for screen-reader hiding on web.
function DecorativeSvg({ children }: { children: ReactNode }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no">
      {children}
    </View>
  );
}

const HIDE_FROM_AT = { "aria-hidden": true } as Record<string, unknown>;

export function PatternBoxDiagram() {
  return (
    <DecorativeSvg>
      <Svg width="84" height="68" viewBox="0 0 84 68" {...HIDE_FROM_AT}>
        <Rect
          x="16"
          y="10"
          width="52"
          height="48"
          rx="6"
          fill="none"
          stroke={AQUA_35}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <G fill={AQUA}>
          <Circle cx="16" cy="10" r="3" />
          <Circle cx="68" cy="10" r="3" />
          <Circle cx="68" cy="58" r="3" />
          <Circle cx="16" cy="58" r="3" />
        </G>
        <SvgText x="42" y="38" textAnchor="middle" fontSize="9" fontWeight="600" fill={AQUA}>
          4·4·4·4
        </SvgText>
      </Svg>
    </DecorativeSvg>
  );
}

export function Pattern478Diagram() {
  return (
    <DecorativeSvg>
      <Svg width="84" height="68" viewBox="0 0 84 68" {...HIDE_FROM_AT}>
        <Path
          d="M6 50 Q 18 6 30 38 T 54 22 T 78 50"
          fill="none"
          stroke={AQUA_40}
          strokeWidth="1.5"
        />
        <Path
          d="M6 50 Q 18 28 30 30 L 78 30"
          fill="none"
          stroke={AQUA}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <SvgText x="42" y="62" textAnchor="middle" fontSize="9" fontWeight="600" fill={AQUA}>
          4·7·8
        </SvgText>
      </Svg>
    </DecorativeSvg>
  );
}

export function PatternCoherentDiagram() {
  return (
    <DecorativeSvg>
      <Svg width="84" height="68" viewBox="0 0 84 68" {...HIDE_FROM_AT}>
        <Path
          d="M4 34 C 16 12, 26 12, 38 34 S 60 56, 72 34 S 84 18, 80 34"
          fill="none"
          stroke={AQUA}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <SvgText x="42" y="62" textAnchor="middle" fontSize="9" fontWeight="600" fill={AQUA}>
          5·5
        </SvgText>
      </Svg>
    </DecorativeSvg>
  );
}
