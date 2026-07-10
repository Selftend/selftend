import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ViewProps,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector, PointerType } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  announceMessage,
  COMPACT_CONTROL_HIT_SLOP,
  politeLiveRegionProps,
  useReduceMotionEnabled,
} from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

import { resolveDragCommit, wrappedSlideOffset, wrapSlideIndex } from "./preview-carousel-math";

// Screenshots are 402x874 (mobile viewport) captures; the aspect ratio keeps
// the frame matching the image exactly, so "contain" never letterboxes.
const SCREENSHOT_ASPECT_RATIO = 402 / 874;

// Horizontal finger travel before the pan claims the gesture; smaller vertical
// travel fails it instead, so page scrolling wins cleanly on touch screens.
const DRAG_ACTIVATION_OFFSET = 10;
const AUTO_ADVANCE_MS = 7000;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 20;

const SLIDE_TIMING = { duration: 320, easing: Easing.out(Easing.cubic) };
const SETTLE_TIMING = { duration: 200, easing: Easing.out(Easing.cubic) };
const DOT_TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };
// The crossfade IS the reduced-motion transition (opacity, not motion), so it
// must not be shortcut by reanimated's own system reduce-motion handling.
const CROSSFADE_TIMING = { duration: 120, reduceMotion: ReduceMotion.Never };

const PREVIEW_IMAGES = [
  {
    source: require("../../../../assets/landing/preview-dashboard.png"),
    altKey: "landingPage.previewAlt1",
  },
  {
    source: require("../../../../assets/landing/preview-thought-record.png"),
    altKey: "landingPage.previewAlt2",
  },
  {
    source: require("../../../../assets/landing/preview-checkin.png"),
    altKey: "landingPage.previewAlt3",
  },
] as const;

type NavigationSource = "user" | "auto";

interface WebArrowKeyEvent {
  key: string;
  preventDefault: () => void;
}

/**
 * "App preview" landing section: a calm, looping carousel showing one real
 * screenshot at a time in a plain rounded frame, with previous/next chevrons,
 * tappable dot indicators, touch drag, and arrow-key support. On web it
 * auto-advances every 7s while visible - until the visitor interacts, hovers,
 * or focuses it - and never on native or under reduced motion.
 */
export function PreviewSection() {
  const { t } = useTranslation("auth");
  const reduceMotion = useReduceMotionEnabled();
  const count = PREVIEW_IMAGES.length;

  const [index, setIndex] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [interacted, setInteracted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  const wrapperRef = useRef<View>(null);

  // UI-thread copies of the carousel position: the active index and the
  // track's translation relative to it. A finished transition updates both in
  // the same worklet frame, so the slides never flash between the translate
  // reset and the React state commit.
  const activeIndexSv = useSharedValue(0);
  const translate = useSharedValue(0);
  const animating = useSharedValue(false);

  const markInteracted = useCallback(() => setInteracted(true), []);

  const commitNavigation = useCallback(
    (target: number, source: NavigationSource) => {
      setIndex(target);
      if (source === "user") {
        const message = t("landingPage.previewAnnounce", {
          n: target + 1,
          total: count,
          alt: t(PREVIEW_IMAGES[target].altKey),
        });
        // The hidden live region below covers web; announceMessage covers native.
        setAnnouncement(message);
        announceMessage(message);
      }
    },
    [count, t],
  );

  const navigateTo = useCallback(
    (target: number, source: NavigationSource) => {
      if (source === "user") {
        markInteracted();
      }
      const wrapped = wrapSlideIndex(target, count);
      if (wrapped === index || animating.value) {
        return;
      }
      if (reduceMotion || frameWidth <= 0) {
        activeIndexSv.value = wrapped;
        translate.value = 0;
        commitNavigation(wrapped, source);
        return;
      }
      animating.value = true;
      const step = wrappedSlideOffset(wrapped, index, count);
      translate.value = withTiming(-step * frameWidth, SLIDE_TIMING, (finished) => {
        "worklet";
        if (finished) {
          activeIndexSv.value = wrapped;
          runOnJS(commitNavigation)(wrapped, source);
        }
        translate.value = 0;
        animating.value = false;
      });
    },
    [
      activeIndexSv,
      animating,
      commitNavigation,
      count,
      frameWidth,
      index,
      markInteracted,
      reduceMotion,
      translate,
    ],
  );

  // Touch drag: the track follows the finger 1:1 (clamped to one slide) and
  // commits past 25% displacement or a 500 px/s fling. Mouse drags are ignored
  // entirely - on desktop web the arrows, dots, and keyboard suffice.
  // Memoized so the gesture is not rebuilt (and re-attached) on every render.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-DRAG_ACTIVATION_OFFSET, DRAG_ACTIVATION_OFFSET])
        .failOffsetY([-DRAG_ACTIVATION_OFFSET, DRAG_ACTIVATION_OFFSET])
        .onStart((event) => {
          if (event.pointerType === PointerType.MOUSE) {
            return;
          }
          runOnJS(markInteracted)();
        })
        .onUpdate((event) => {
          if (event.pointerType === PointerType.MOUSE) {
            return;
          }
          if (animating.value || reduceMotion || frameWidth <= 0) {
            return;
          }
          translate.value = Math.max(-frameWidth, Math.min(frameWidth, event.translationX));
        })
        .onEnd((event) => {
          if (event.pointerType === PointerType.MOUSE || animating.value) {
            return;
          }
          const step = resolveDragCommit(event.translationX, event.velocityX, frameWidth);
          if (step === 0) {
            if (!reduceMotion) {
              translate.value = withTiming(0, SETTLE_TIMING);
            }
            return;
          }
          const target = wrapSlideIndex(activeIndexSv.value + step, count);
          if (reduceMotion) {
            activeIndexSv.value = target;
            runOnJS(commitNavigation)(target, "user");
            return;
          }
          animating.value = true;
          translate.value = withTiming(-step * frameWidth, SLIDE_TIMING, (finished) => {
            if (finished) {
              activeIndexSv.value = target;
              runOnJS(commitNavigation)(target, "user");
            }
            translate.value = 0;
            animating.value = false;
          });
        }),
    [
      activeIndexSv,
      animating,
      commitNavigation,
      count,
      frameWidth,
      markInteracted,
      reduceMotion,
      translate,
    ],
  );

  // Auto-advance: web only, only while at least half the carousel is visible,
  // paused while hovered or focused, and stopped for good after the first
  // interaction. Recreating the interval whenever `index` changes also resets
  // the 7s window after each auto slide.
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    if (
      reduceMotion ||
      interacted ||
      hovered ||
      focusWithin ||
      !visible ||
      !pageVisible ||
      frameWidth <= 0
    ) {
      return;
    }
    const timer = setInterval(() => {
      navigateTo(index + 1, "auto");
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [
    reduceMotion,
    interacted,
    hovered,
    focusWithin,
    visible,
    pageVisible,
    frameWidth,
    index,
    navigateTo,
  ]);

  // Backgrounded tabs keep their IntersectionObserver state, so gate on the
  // page's own visibility too - a hidden tab must not keep sliding.
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const doc = globalThis.document;
    if (!doc || typeof doc.addEventListener !== "function") {
      return;
    }
    const handleVisibilityChange = () => setPageVisible(doc.visibilityState !== "hidden");
    handleVisibilityChange();
    doc.addEventListener("visibilitychange", handleVisibilityChange);
    return () => doc.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Visibility gate for auto-advance. The react-native-web View ref is the
  // underlying DOM element, so it can be observed directly.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const node = wrapperRef.current as unknown as Element | null;
    if (!node || typeof node.getBoundingClientRect !== "function") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        setVisible(entry ? entry.isIntersecting : false);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Focus tracking for auto-advance. Focus arriving inside the region counts
  // as an interaction (stops auto-advance for good) and holds it paused while
  // focus stays inside.
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const node = wrapperRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }
    const handleFocusIn = () => {
      setInteracted(true);
      setFocusWithin(true);
    };
    const handleFocusOut = (event: FocusEvent) => {
      const related = event.relatedTarget as Node | null;
      if (related && node.contains(related)) {
        return;
      }
      setFocusWithin(false);
    };
    node.addEventListener("focusin", handleFocusIn);
    node.addEventListener("focusout", handleFocusOut);
    return () => {
      node.removeEventListener("focusin", handleFocusIn);
      node.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const handleKeyDown = (event: WebArrowKeyEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    // Only arrows are claimed; every other key keeps its default behavior.
    event.preventDefault();
    navigateTo(index + (event.key === "ArrowRight" ? 1 : -1), "user");
  };

  const webCarouselProps =
    Platform.OS === "web"
      ? ({
          "aria-roledescription": "carousel",
          onKeyDown: handleKeyDown,
          onPointerEnter: () => setHovered(true),
          onPointerLeave: () => setHovered(false),
        } as ViewProps)
      : undefined;

  return (
    <View className="gap-6 sm:gap-8">
      <Text variant="h2" className="text-center text-2xl sm:text-3xl">
        {t("landingPage.previewTitle")}
      </Text>

      <View
        ref={wrapperRef}
        accessibilityLabel={t("landingPage.previewTitle")}
        className="gap-6 sm:gap-8"
        role="group"
        {...webCarouselProps}
      >
        <View className="flex-row items-center justify-center gap-2 sm:gap-4">
          <Button
            accessibilityLabel={t("landingPage.previewPrev")}
            hitSlop={COMPACT_CONTROL_HIT_SLOP}
            onPress={() => navigateTo(index - 1, "user")}
            size="icon"
            variant="ghost"
          >
            <Icon className="size-6 text-muted-foreground" name="chevron-left" />
          </Button>

          {/* The aspect ratio lives on the frame, and each slide fills it: the
              frame owns the height, so nothing shifts during transitions. */}
          <GestureDetector gesture={panGesture} touchAction="pan-y">
            <View
              className="max-w-[280px] flex-1 overflow-hidden rounded-2xl border border-border bg-card"
              onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
              style={{ aspectRatio: SCREENSHOT_ASPECT_RATIO }}
              testID="preview-carousel-frame"
            >
              {frameWidth > 0 ? (
                PREVIEW_IMAGES.map((image, slideIndex) => (
                  <CarouselSlide
                    key={image.altKey}
                    active={slideIndex === index}
                    activeIndexSv={activeIndexSv}
                    alt={t(image.altKey)}
                    frameWidth={frameWidth}
                    reduceMotion={reduceMotion}
                    slideIndex={slideIndex}
                    source={image.source}
                    translate={translate}
                  />
                ))
              ) : (
                // Until the frame is measured there is no track - just the
                // first slide, so nothing flashes or jumps on first paint.
                <Image
                  accessibilityLabel={t(PREVIEW_IMAGES[0].altKey)}
                  accessibilityRole="image"
                  resizeMode="contain"
                  source={PREVIEW_IMAGES[0].source}
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </View>
          </GestureDetector>

          <Button
            accessibilityLabel={t("landingPage.previewNext")}
            hitSlop={COMPACT_CONTROL_HIT_SLOP}
            onPress={() => navigateTo(index + 1, "user")}
            size="icon"
            variant="ghost"
          >
            <Icon className="size-6 text-muted-foreground" name="chevron-right" />
          </Button>
        </View>

        <View className="flex-row items-center justify-center gap-2">
          {PREVIEW_IMAGES.map((image, dotIndex) => (
            <CarouselDot
              key={image.altKey}
              active={dotIndex === index}
              label={t("landingPage.previewGoTo", { n: dotIndex + 1, total: count })}
              onPress={() => navigateTo(dotIndex, "user")}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>

        {Platform.OS === "web" ? (
          <Text className="sr-only" {...politeLiveRegionProps()}>
            {announcement}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface CarouselSlideProps {
  active: boolean;
  activeIndexSv: SharedValue<number>;
  alt: string;
  frameWidth: number;
  reduceMotion: boolean;
  slideIndex: number;
  source: ImageSourcePropType;
  translate: SharedValue<number>;
}

/**
 * One slide of the track: absolutely positioned over the frame and translated
 * to its wrapped offset in {-1, 0, +1} x frameWidth from the active slide,
 * plus the shared track translation. Under reduced motion the slides stack in
 * place and swap with a short crossfade instead of translating.
 */
function CarouselSlide({
  active,
  activeIndexSv,
  alt,
  frameWidth,
  reduceMotion,
  slideIndex,
  source,
  translate,
}: CarouselSlideProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: withTiming(activeIndexSv.value === slideIndex ? 1 : 0, CROSSFADE_TIMING),
        transform: [{ translateX: 0 }],
      };
    }
    return {
      opacity: 1,
      transform: [
        {
          translateX:
            wrappedSlideOffset(slideIndex, activeIndexSv.value, PREVIEW_IMAGES.length) *
              frameWidth +
            translate.value,
        },
      ],
    };
  }, [frameWidth, reduceMotion, slideIndex]);

  return (
    <Animated.View
      aria-hidden={!active}
      style={[StyleSheet.absoluteFill, animatedStyle]}
      testID={`preview-slide-${slideIndex + 1}`}
    >
      <Image
        accessibilityLabel={alt}
        accessibilityRole="image"
        resizeMode="contain"
        source={source}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
}

interface CarouselDotProps {
  active: boolean;
  label: string;
  onPress: () => void;
  reduceMotion: boolean;
}

/** A dot indicator; the active one stretches into a 20x8 pill. */
function CarouselDot({ active, label, onPress, reduceMotion }: CarouselDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const width = active ? DOT_ACTIVE_WIDTH : DOT_SIZE;
    if (reduceMotion) {
      return { width };
    }
    return { width: withTiming(width, DOT_TIMING) };
  }, [active, reduceMotion]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      // Dots indicate the CURRENT slide, not a toggle state - aria-current is
      // the valid ARIA for that on a button role.
      aria-current={active ? "true" : undefined}
      hitSlop={COMPACT_CONTROL_HIT_SLOP}
      onPress={onPress}
    >
      <Animated.View style={animatedStyle}>
        <View
          className={cn(
            "h-2 w-full rounded-full",
            active ? "bg-primary" : "bg-muted-foreground/30",
          )}
        />
      </Animated.View>
    </Pressable>
  );
}
