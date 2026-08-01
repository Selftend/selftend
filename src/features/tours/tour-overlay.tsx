import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { Portal } from "@rn-primitives/portal";

import { Text } from "@/src/components/react-native-reusables/text";
import { useThemeHex } from "@/src/lib/theme-palette";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const OVERLAY_COLOR = "rgba(0, 0, 0, 0.65)";
const HIGHLIGHT_BORDER_COLOR = "rgba(255,255,255,0.75)";
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_MARGIN = 16;
const SPOTLIGHT_PADDING = 6;

const tooltipActionsStyle: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
};

export interface TourTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourOverlayProps {
  targetRect: TourTargetRect;
  description: string;
  dismissLabel: string;
  skipAllLabel: string;
  isPending: boolean;
  onDismiss: () => void;
  onDismissAll: () => void;
}

export function TourOverlay({
  targetRect,
  description,
  dismissLabel,
  skipAllLabel,
  isPending,
  onDismiss,
  onDismissAll,
}: TourOverlayProps): React.JSX.Element {
  const reduceMotionEnabled = useReduceMotionEnabled();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardColor = useThemeHex("--popover");

  const spotLeft = targetRect.x - SPOTLIGHT_PADDING;
  const spotTop = targetRect.y - SPOTLIGHT_PADDING;
  const spotWidth = targetRect.width + SPOTLIGHT_PADDING * 2;
  const spotHeight = targetRect.height + SPOTLIGHT_PADDING * 2;
  const spotRadius = Math.min(16, spotHeight / 2);

  const centerX = targetRect.x + targetRect.width / 2;

  const tooltipWidth = Math.min(screenWidth - TOOLTIP_MARGIN * 2, TOOLTIP_MAX_WIDTH);
  const tooltipLeft = Math.min(
    Math.max(TOOLTIP_MARGIN, centerX - tooltipWidth / 2),
    screenWidth - tooltipWidth - TOOLTIP_MARGIN,
  );
  const tooltipTop = spotTop + spotHeight + 14;
  // Flip the tooltip above the spotlight when there is not enough room below
  // (160 px is a conservative allowance for tooltip height).
  const flipTooltip = spotTop + spotHeight + 14 + 160 > screenHeight;
  const arrowLeft = Math.max(12, Math.min(centerX - tooltipLeft - 7, tooltipWidth - 26));

  const overlayContent = (
    <>
      {Platform.OS === "web" ? (
        <View style={getWebHighlightStyle(spotTop, spotLeft, spotWidth, spotHeight, spotRadius)} />
      ) : (
        <NativeHighlight
          spotTop={spotTop}
          spotLeft={spotLeft}
          spotWidth={spotWidth}
          spotHeight={spotHeight}
          spotRadius={spotRadius}
        />
      )}

      <View
        testID="tour-tooltip-card"
        style={{
          position: "absolute",
          ...(flipTooltip ? { bottom: screenHeight - (spotTop - 14) } : { top: tooltipTop }),
          left: tooltipLeft,
          width: tooltipWidth,
          backgroundColor: cardColor,
          borderRadius: 12,
          padding: 16,
          // Platform-gated so native output is byte-for-byte what it was before the
          // RN-Web deprecation migration. Web: boxShadow only (RN-Web deprecates
          // shadow* — this silences the warning with the same look). Native: keep the
          // original shadow* + elevation. Under New Arch/Fabric (RN 0.81) boxShadow
          // renders a native Android shadow too, so emitting both there would DOUBLE
          // the shadow — hence the split, not a combined declaration.
          ...(Platform.OS === "web"
            ? { boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.35)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 10,
              }),
        }}
      >
        <View
          style={{
            position: "absolute",
            ...(flipTooltip ? { bottom: -7 } : { top: -7 }),
            left: arrowLeft,
            width: 14,
            height: 14,
            backgroundColor: cardColor,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <Text variant="muted" className="text-xs leading-5 mb-3">
          {description}
        </Text>
        <View style={tooltipActionsStyle}>
          <Pressable
            testID="tour-skip-all"
            accessibilityLabel={skipAllLabel}
            accessibilityRole="button"
            disabled={isPending}
            hitSlop={8}
            onPress={onDismissAll}
          >
            <Text className="text-muted-foreground text-xs">{skipAllLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={dismissLabel}
            accessibilityRole="button"
            disabled={isPending}
            hitSlop={8}
            onPress={onDismiss}
          >
            <Text className="text-primary text-xs font-semibold">{dismissLabel}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  if (Platform.OS === "web") {
    return (
      <Modal
        transparent
        animationType={reduceMotionEnabled ? "none" : "fade"}
        visible
        statusBarTranslucent
      >
        <View style={{ flex: 1 }}>{overlayContent}</View>
      </Modal>
    );
  }
  return (
    <Portal name="button-tour">
      <View style={StyleSheet.absoluteFill}>{overlayContent}</View>
    </Portal>
  );
}

function getSpotlightStyle(
  top: number,
  left: number,
  width: number,
  height: number,
  radius: number,
): ViewStyle {
  return {
    position: "absolute",
    top,
    left,
    width,
    height,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: HIGHLIGHT_BORDER_COLOR,
  };
}

function getOverlayStyle(style: ViewStyle): ViewStyle {
  return {
    position: "absolute",
    backgroundColor: OVERLAY_COLOR,
    ...style,
  };
}

function getWebHighlightStyle(
  top: number,
  left: number,
  width: number,
  height: number,
  radius: number,
): ViewStyle & { boxShadow: string } {
  return {
    ...getSpotlightStyle(top, left, width, height, radius),
    boxShadow: `0 0 0 9999px ${OVERLAY_COLOR}`,
  };
}

function NativeHighlight({
  spotTop,
  spotLeft,
  spotWidth,
  spotHeight,
  spotRadius,
}: {
  spotTop: number;
  spotLeft: number;
  spotWidth: number;
  spotHeight: number;
  spotRadius: number;
}) {
  return (
    <>
      <View style={getOverlayStyle({ top: 0, left: 0, right: 0, height: Math.max(0, spotTop) })} />
      <View
        style={getOverlayStyle({
          top: spotTop,
          left: 0,
          width: Math.max(0, spotLeft),
          height: spotHeight,
        })}
      />
      <View
        style={getOverlayStyle({
          top: spotTop,
          left: spotLeft + spotWidth,
          right: 0,
          height: spotHeight,
        })}
      />
      <View
        style={getOverlayStyle({
          top: spotTop + spotHeight,
          left: 0,
          right: 0,
          bottom: 0,
        })}
      />
      <View style={getSpotlightStyle(spotTop, spotLeft, spotWidth, spotHeight, spotRadius)} />
    </>
  );
}
