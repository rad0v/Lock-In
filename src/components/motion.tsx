import React, { useEffect, useRef } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { usePreferences } from "../state/preferences";

export function MotionView({
  children,
  style,
  layout = false,
}: React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  layout?: boolean;
}>) {
  const { reduced } = usePreferences();
  return (
    <Animated.View
      entering={FadeIn.duration(reduced ? 80 : 200)}
      exiting={FadeOut.duration(reduced ? 80 : 160)}
      layout={layout && !reduced ? LinearTransition.duration(220) : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
// Retarget instead of queueing animations when a value changes repeatedly.
export function StateMotion({
  children,
  value,
  style,
  settle = false,
}: React.PropsWithChildren<{
  value: string | number | boolean;
  style?: StyleProp<ViewStyle>;
  settle?: boolean;
}>) {
  const { reduced } = usePreferences();
  const phase = useSharedValue(1);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    phase.value = 0;
    phase.value = withTiming(1, {
      duration: reduced ? 80 : settle ? 300 : 180,
    });
  }, [value, reduced, settle, phase]);
  const animated = useAnimatedStyle(() => ({
    opacity: 0.5 + phase.value * 0.5,
    transform: [{ scale: reduced || !settle ? 1 : 0.97 + phase.value * 0.03 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
export function LockSettle({
  children,
  enabled,
}: React.PropsWithChildren<{ enabled: boolean }>) {
  const { reduced } = usePreferences();
  const phase = useSharedValue(enabled ? 0 : 1);
  useEffect(() => {
    phase.value = withTiming(1, { duration: reduced ? 80 : 280 });
  }, [reduced, phase]);
  const animated = useAnimatedStyle(() => ({
    opacity: 0.5 + phase.value * 0.5,
    transform: [{ scale: reduced ? 1 : 0.97 + phase.value * 0.03 }],
  }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}
