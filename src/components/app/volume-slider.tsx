import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<View>(null);
  const originRef = useRef<number | null>(null);
  const lastRef = useRef(value);
  // Latest-callback refs, written in an effect (not render) so the compiler's
  // rules hold; the once-created PanResponder reads them at gesture time.
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onChangeRef.current = onChange;
    onCommitRef.current = onCommit;
  });

  // Positions are tracked in page (window) coordinates against the container's
  // measured origin. locationX/locationY are relative to whichever CHILD view the
  // finger happens to be over (thumb, fill bar), so a drag crossing them made the
  // value jump toward 0 - and a release at that moment committed the bogus 0.
  const setFromPage = (page: number) => {
    if (sizeRef.current <= 0 || originRef.current === null) return;
    const pos = page - originRef.current;
    const next = clamp01(vertical ? 1 - pos / sizeRef.current : pos / sizeRef.current);
    lastRef.current = next;
    onChangeRef.current(next);
  };

  // eslint-disable-next-line react-hooks/refs -- PanResponder's callbacks are defined here but only ever run during gestures, never in render; the legacy API offers no compiler-era alternative
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // A hosting ScrollView must not steal the gesture mid-drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_e, g) => {
        // Re-measure per gesture: the container can move (scroll, layout changes).
        originRef.current = null;
        containerRef.current?.measureInWindow((x, y) => {
          originRef.current = vertical ? y : x;
          setFromPage(vertical ? g.y0 : g.x0);
        });
      },
      onPanResponderMove: (_e, g) => setFromPage(vertical ? g.moveY : g.moveX),
      onPanResponderRelease: () => onCommitRef.current?.(lastRef.current),
      onPanResponderTerminate: () => onCommitRef.current?.(lastRef.current),
    }),
  );

  const pct = clamp01(value);

  if (vertical) {
    return (
      <View
        {...panResponder.panHandlers}
        ref={containerRef}
        collapsable={false}
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
      ref={containerRef}
      collapsable={false}
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
