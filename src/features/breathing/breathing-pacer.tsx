import { View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import type { SharedValue } from "react-native-reanimated";

import type { PacerColors } from "@/src/features/breathing/pacer-colors";

// The session screen's focal element (design `4c`): a halo and a disc that
// scale with the breath, an SVG progress ring that fills over each cycle, and
// a mark at the start of every phase. Purely presentational - the session
// screen owns the clock and drives `breath` / `cycleProgress`, so the circle,
// the ring and the phase text cannot disagree about where in the cycle the
// session is (#779's one-clock rule). Colours arrive through pacerColors();
// no colour literal belongs here.

const DESIGN_SIZE = 268;
const RING_RADIUS = 122;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const HALO_SIZE = 190;
const DISC_SIZE = 168;
const MARK_SIZE = 5;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BreathingPacerProps {
  colors: PacerColors;
  /** 0 = fully exhaled (small), 1 = fully inhaled (large). */
  breath: SharedValue<number>;
  /** 0..1 through the current cycle; the ring's fill and the marks read it. */
  cycleProgress: SharedValue<number>;
  /** Where each phase starts, as a 0..1 fraction of the cycle. */
  phaseStartFractions: number[];
  /** Index into `phaseStartFractions` of the running phase; -1 before the first. */
  activePhaseIndex: number;
  size?: number;
}

export function BreathingPacer({
  colors,
  breath,
  cycleProgress,
  phaseStartFractions,
  activePhaseIndex,
  size = DESIGN_SIZE,
}: BreathingPacerProps) {
  const scale = size / DESIGN_SIZE;

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.62 + breath.get() * 0.38 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + breath.get() * 0.25,
    transform: [{ scale: 0.7 + breath.get() * 0.34 }],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - cycleProgress.get()),
  }));

  const halo = HALO_SIZE * scale;
  const disc = DISC_SIZE * scale;
  const center = size / 2;
  const markRadius = RING_RADIUS * scale;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      testID="breathing-pacer"
    >
      <Animated.View style={[{ position: "absolute", width: halo, height: halo }, haloStyle]}>
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="breathing-halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.halo} stopOpacity={0.32} />
              <Stop offset="72%" stopColor={colors.halo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#breathing-halo)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            backgroundColor: colors.circleFill,
          },
          discStyle,
        ]}
      />

      {/* -90° so progress starts at 12 o'clock, where the first phase mark sits. */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${DESIGN_SIZE} ${DESIGN_SIZE}`}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={DESIGN_SIZE / 2}
          cy={DESIGN_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={colors.ringTrack}
          strokeWidth={2}
        />
        <AnimatedCircle
          cx={DESIGN_SIZE / 2}
          cy={DESIGN_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={colors.ringFill}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE}`}
          animatedProps={ringProps}
        />
      </Svg>

      {phaseStartFractions.map((fraction, index) => {
        const angle = fraction * 2 * Math.PI - Math.PI / 2;
        return (
          <View
            key={index}
            style={{
              position: "absolute",
              width: MARK_SIZE,
              height: MARK_SIZE,
              borderRadius: MARK_SIZE / 2,
              left: center + markRadius * Math.cos(angle) - MARK_SIZE / 2,
              top: center + markRadius * Math.sin(angle) - MARK_SIZE / 2,
              backgroundColor: index === activePhaseIndex ? colors.ringFill : colors.markIdle,
            }}
          />
        );
      })}
    </View>
  );
}
