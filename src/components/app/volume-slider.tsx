import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";

interface VolumeSliderProps {
  value: number; // 0..1
  /** Fires continuously while dragging - use for instant (frontend) updates. */
  onChange: (value: number) => void;
  /** Fires once when the drag ends - use to persist the final value. */
  onCommit?: (value: number) => void;
  accessibilityLabel: string;
  orientation?: "horizontal" | "vertical";
}

const TRACK = 6;
const THUMB = 18;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function VolumeSlider({
  value,
  onChange,
  onCommit,
  accessibilityLabel,
  orientation = "horizontal",
}: VolumeSliderProps) {
  const vertical = orientation === "vertical";
  const [size, setSize] = useState(0);
  const sizeRef = useRef(0);
  const lastRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  const setFromPos = (pos: number) => {
    if (sizeRef.current <= 0) return;
    const next = clamp01(vertical ? 1 - pos / sizeRef.current : pos / sizeRef.current);
    lastRef.current = next;
    onChangeRef.current(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        setFromPos(vertical ? e.nativeEvent.locationY : e.nativeEvent.locationX),
      onPanResponderMove: (e) =>
        setFromPos(vertical ? e.nativeEvent.locationY : e.nativeEvent.locationX),
      onPanResponderRelease: () => onCommitRef.current?.(lastRef.current),
      onPanResponderTerminate: () => onCommitRef.current?.(lastRef.current),
    }),
  ).current;

  const pct = clamp01(value);

  if (vertical) {
    return (
      <View
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          sizeRef.current = h;
          setSize(h);
        }}
        style={{
          width: THUMB + 12,
          alignItems: "center",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <View
          className="rounded-full bg-muted"
          style={{ width: TRACK, height: "100%", justifyContent: "flex-end" }}
        >
          <View
            className="rounded-full bg-aqua"
            style={{ width: TRACK, height: `${pct * 100}%` }}
          />
        </View>
        {size > 0 ? (
          <View
            className="rounded-full bg-aqua"
            style={{
              position: "absolute",
              top: Math.max(0, Math.min(size - THUMB, (1 - pct) * size - THUMB / 2)),
              width: THUMB,
              height: THUMB,
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        sizeRef.current = w;
        setSize(w);
      }}
      style={{
        height: THUMB + 12,
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <View className="rounded-full bg-muted" style={{ height: TRACK, width: "100%" }}>
        <View className="rounded-full bg-aqua" style={{ height: TRACK, width: `${pct * 100}%` }} />
      </View>
      {size > 0 ? (
        <View
          className="rounded-full bg-aqua"
          style={{
            position: "absolute",
            left: Math.max(0, Math.min(size - THUMB, pct * size - THUMB / 2)),
            width: THUMB,
            height: THUMB,
          }}
        />
      ) : null}
    </View>
  );
}
