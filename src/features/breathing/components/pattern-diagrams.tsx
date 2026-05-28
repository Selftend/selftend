import { Circle, G, Path, Rect, Svg, Text as SvgText } from "react-native-svg";

const AQUA = "hsl(196, 52%, 45%)";
const AQUA_35 = "hsla(196, 52%, 45%, 0.35)";
const AQUA_40 = "hsla(196, 52%, 45%, 0.40)";

export function PatternBoxDiagram() {
  return (
    <Svg
      width="84"
      height="68"
      viewBox="0 0 84 68"
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...({ "aria-hidden": true } as Record<string, unknown>)}
    >
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
  );
}

export function Pattern478Diagram() {
  return (
    <Svg
      width="84"
      height="68"
      viewBox="0 0 84 68"
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...({ "aria-hidden": true } as Record<string, unknown>)}
    >
      <Path d="M6 50 Q 18 6 30 38 T 54 22 T 78 50" fill="none" stroke={AQUA_40} strokeWidth="1.5" />
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
  );
}

export function PatternCoherentDiagram() {
  return (
    <Svg
      width="84"
      height="68"
      viewBox="0 0 84 68"
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...({ "aria-hidden": true } as Record<string, unknown>)}
    >
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
  );
}
