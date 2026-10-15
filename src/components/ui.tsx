import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { router } from "expo-router";
import { color, fonts } from "../theme";
import { usePreferences } from "../state/preferences";
import { feedback } from "../lib/feedback";
import { StateMotion } from "./motion";
import {
  addDays,
  dateInZone,
  dayDifference,
  dayOrdinal,
  isPausedDate,
  dayOfWeek,
  endDate,
  formatDate,
  getLog,
  isScheduled,
  weekdays,
  type Commitment,
  type CheckIn,
} from "../domain/commitments";

export type IconName = React.ComponentProps<typeof Feather>["name"];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Icon({
  name,
  size = 22,
  tint = color.ink.primary,
}: {
  name: IconName;
  size?: number;
  tint?: string;
}) {
  return <Feather name={name} size={size} color={tint} />;
}
export function Label({
  children,
  size = 15,
  bold = false,
  muted = false,
  style,
  ...props
}: React.ComponentProps<typeof Text> & {
  size?: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: bold ? fonts.bold : fonts.regular,
          fontSize: size,
          lineHeight: size * 1.45,
          color: muted ? color.ink.muted : color.ink.primary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Title({
  children,
  style,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Label {...props} size={30} bold style={[{ lineHeight: 38 }, style]}>
      {children}
    </Label>
  );
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label
      size={12}
      bold
      style={{ letterSpacing: 1.8, textTransform: "uppercase" }}
    >
      {children}
    </Label>
  );
}
export function Brand() {
  return (
    <View style={s.brand}>
      <Icon name="lock" size={19} />
      <Label size={24} bold>
        LockIn
      </Label>
    </View>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={s.iconButton}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Header({
  back = false,
  label,
  onBack,
}: {
  back?: boolean;
  label?: string;
  onBack?: () => void;
}) {
  return (
    <View style={s.header}>
      {back ? (
        <View style={s.brand}>
          <IconButton
            name="arrow-left"
            label="Go back"
            onPress={
              onBack ||
              (() => (router.canGoBack() ? router.back() : router.replace("/")))
            }
          />
          {label ? (
            <Label bold>{label}</Label>
          ) : (
            <Label size={22} bold>
              LockIn
            </Label>
          )}
        </View>
      ) : (
        <Brand />
      )}
      {!back && (
        <IconButton
          name="user"
          label="Open account"
          onPress={() => router.push("/settings")}
        />
      )}
    </View>
  );
}

export function Screen({
  children,
  header,
  footer,
  setup = false,
  scroll = true,
  contentStyle,
}: React.PropsWithChildren<{
  header?: React.ReactNode;
  footer?: React.ReactNode;
  setup?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[s.screenContent, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.screenContent, { flex: 1 }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        s.screen,
        { backgroundColor: setup ? color.canvas.setup : color.canvas.focus },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={s.column}>
          {header}
          {body}
          {footer && (
            <View
              style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  light = false,
  selected = false,
  disabled = false,
  loading = false,
  style,
  icon,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  light?: boolean;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const press = useSharedValue(0);
  const { reduced: reduce } = usePreferences();
  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: (light ? -3 : 0) + press.value * 2 },
      { translateY: (light ? -4 : 0) + press.value * 2 },
    ],
  }));
  const dark = !light || selected;
  const ink = dark ? "#FFFFFF" : color.ink.primary;
  return (
    <View
      style={[light && s.raisedBacking, disabled && { opacity: 0.45 }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading, selected }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(reduce ? 0 : 1, {
            duration: reduce ? 0 : 80,
          });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: reduce ? 0 : 120 });
        }}
      >
        <Animated.View
          style={[
            s.button,
            {
              backgroundColor: dark
                ? color.action.primary
                : color.surface.input,
              borderColor: color.border.strong,
            },
            animated,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={ink} />
          ) : (
            <>
              {icon && <Icon name={icon} tint={ink} size={18} />}
              <Label
                size={12}
                bold
                style={{
                  color: ink,
                  letterSpacing: light ? 0 : 0.7,
                  textAlign: "center",
                }}
              >
                {title}
              </Label>
            </>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}
export function Choice({
  title,
  description,
  icon,
  selected,
  onPress,
  compact = false,
}: {
  title: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { reduced } = usePreferences();
  const phase = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    phase.value = withTiming(selected ? 1 : 0, { duration: reduced ? 0 : 140 });
  }, [selected, reduced, phase]);
  const background = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      phase.value,
      [0, 1],
      [color.surface.input, color.action.selected],
    ),
  }));
  return (
    <View style={s.raisedBacking}>
      <AnimatedPressable
        onPress={() => {
          feedback();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={title}
        style={[s.choice, { minHeight: compact ? 84 : 120 }, background]}
      >
        <View
          style={[
            s.choiceIcon,
            { backgroundColor: selected ? "transparent" : "#F4F3F1" },
          ]}
        >
          <Icon name={icon} tint={selected ? "#FFFFFF" : color.ink.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Label bold style={selected && { color: "#FFFFFF" }}>
            {title}
          </Label>
          <Label
            size={compact ? 12 : 15}
            muted
            style={selected && { color: "#E6E1DA" }}
          >
            {description}
          </Label>
        </View>
      </AnimatedPressable>
    </View>
  );
}
export function Field({
  label,
  error,
  pill = false,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string; pill?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Label size={13} bold style={{ letterSpacing: 0.4 }}>
          {label}
        </Label>
      )}
      <View style={pill ? s.pillField : s.fieldBacking}>
        <TextInput
          placeholderTextColor="#9D9994"
          accessibilityLabel={label || String(props.placeholder || "")}
          {...props}
          style={[
            s.field,
            pill && s.fieldPill,
            error && { borderColor: color.danger.foreground },
            props.multiline && { minHeight: 112, textAlignVertical: "top" },
            style,
          ]}
        />
      </View>
      {error && <ErrorNote message={error} />}
    </View>
  );
}
export function ErrorNote({ message }: { message: string }) {
  return (
    <Label
      accessibilityRole="alert"
      size={13}
      style={{ color: color.danger.foreground }}
    >
      {message}
    </Label>
  );
}
export function Notice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={s.notice}>
      <Label size={13} style={{ flex: 1 }}>
        {message}
      </Label>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={{ padding: 8 }}
        >
          <Label size={13} bold>
            Retry
          </Label>
        </Pressable>
      )}
    </View>
  );
}
export function Panel({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[s.panelBacking, style]}>
      <View style={s.panel}>{children}</View>
    </View>
  );
}
export function Card({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: color.border.subtle,
        marginVertical: 16,
      }}
    />
  );
}
export function ProgressBar({ value }: { value: number }) {
  const amount = useSharedValue(Math.min(1, Math.max(0, value)));
  const { reduced } = usePreferences();
  useEffect(() => {
    amount.value = withTiming(Math.min(1, Math.max(0, value)), {
      duration: reduced ? 0 : 240,
    });
  }, [value, reduced, amount]);
  const a = useAnimatedStyle(() => ({ width: `${amount.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={s.progressTrack}
    >
      <Animated.View style={[s.progressFill, a]} />
    </View>
  );
}
export function StatusChip({ status }: { status: Commitment["status"] }) {
  const positive = status === "active" || status === "completed";
  return (
    <StateMotion
      value={status}
      style={[
        s.chip,
        {
          backgroundColor: positive
            ? color.success.background
            : status === "broken"
              ? color.danger.background
              : color.surface.panel,
        },
      ]}
    >
      <Icon
        name={
          status === "paused"
            ? "pause-circle"
            : status === "broken"
              ? "x-circle"
              : status === "completed"
                ? "check-circle"
                : "circle"
        }
        size={11}
        tint={
          positive
            ? color.success.foreground
            : status === "broken"
              ? color.danger.foreground
              : color.ink.secondary
        }
      />
      <Label
        size={11}
        style={{
          color: positive
            ? color.success.foreground
            : status === "broken"
              ? color.danger.foreground
              : color.ink.secondary,
          textTransform: "capitalize",
        }}
      >
        {status}
      </Label>
    </StateMotion>
  );
}
export function StepProgress({ step }: { step: number }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 2, height: 6 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <StateMotion
            value={n <= step}
            key={n}
            style={{
              flex: 1,
              backgroundColor:
                n <= step ? color.ink.primary : color.surface.card,
              borderRadius: n === 1 || n === 6 ? 4 : 0,
            }}
          >
            {n === step && (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -4,
                  backgroundColor: color.ink.primary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: color.surface.panel,
                }}
              >
                <Icon name="check" size={12} tint="#FFFFFF" />
              </View>
            )}
          </StateMotion>
        ))}
      </View>
      <Label size={11}>STEP {step} OF 6</Label>
    </View>
  );
}
export function ModalCard({
  visible,
  title,
  children,
  onClose,
  busy = false,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const { reduced } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const phase = useSharedValue(0);
  useEffect(() => {
    if (visible) setMounted(true);
    phase.value = withTiming(visible ? 1 : 0, {
      duration: reduced ? 80 : visible ? 200 : 150,
    });
    if (!visible) {
      const timer = setTimeout(() => setMounted(false), reduced ? 80 : 150);
      return () => clearTimeout(timer);
    }
  }, [visible, reduced, phase]);
  const panelMotion = useAnimatedStyle(() => ({
    opacity: phase.value,
    transform: [{ scale: reduced ? 1 : 0.97 + phase.value * 0.03 }],
  }));
  const backdropMotion = useAnimatedStyle(() => ({ opacity: phase.value }));
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => !busy && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[s.modalRoot, { backgroundColor: "transparent" }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(37,31,26,0.3)" },
            backdropMotion,
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss dialog"
          onPress={() => !busy && onClose()}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[s.modalPanel, panelMotion]}
        >
          <View style={s.modalHeader}>
            <Label size={20} bold style={{ flex: 1 }}>
              {title}
            </Label>
            <Pressable
              onPress={onClose}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              style={s.close}
            >
              <Icon name="x" size={22} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 20 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Counter({
  value,
  onChange,
  max = 99,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
}) {
  return (
    <View style={s.counter}>
      <IconButton
        name="minus"
        label="Decrease count"
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <StateMotion value={value} settle style={s.countBox}>
        <Label size={38} bold>
          {value}
        </Label>
      </StateMotion>
      <IconButton
        name="plus"
        label="Increase count"
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}

export function Calendar({
  selected,
  onSelect,
  rangeStart,
  rangeEnd,
  commitment,
  logs = [],
}: {
  selected?: string;
  onSelect?: (date: string) => void;
  rangeStart?: string;
  rangeEnd?: string;
  commitment?: Commitment;
  logs?: CheckIn[];
}) {
  const today = dateInZone(new Date(), commitment?.timeZone);
  const [month, setMonth] = useState((selected || today).slice(0, 7) + "-01");
  useEffect(() => {
    if (selected) setMonth(selected.slice(0, 7) + "-01");
  }, [selected]);
  const offset = dayOfWeek(month);
  const nextMonth = addDays(month, 32).slice(0, 7) + "-01";
  const length = dayDifference(month, nextMonth);
  return (
    <View style={s.calendar}>
      <View style={s.calendarHeader}>
        <IconButton
          name="chevron-left"
          label="Previous month"
          onPress={() => setMonth(addDays(month, -1).slice(0, 7) + "-01")}
        />
        <Label size={14} bold>
          {formatDate(month, { month: "long", year: "numeric" })}
        </Label>
        <IconButton
          name="chevron-right"
          label="Next month"
          onPress={() => setMonth(nextMonth)}
        />
      </View>
      <View style={s.calendarGrid}>
        {weekdays.map((w) => (
          <View key={w} style={s.day}>
            <Label size={10} muted>
              {w.slice(0, 1)}
            </Label>
          </View>
        ))}
        {Array.from({ length: offset + length }, (_, i) => {
          if (i < offset) return <View key={"blank" + i} style={s.day} />;
          const date = addDays(month, i - offset),
            count = commitment ? getLog(logs, commitment, date)?.count || 0 : 0;
          const done = commitment
            ? count >=
              (commitment.pace.kind === "daily" ? commitment.pace.count : 1)
            : false;
          const active = date === selected,
            current = date === today;
          const missed =
            commitment &&
            (commitment.failureDate === date ||
              getLog(logs, commitment, date)?.outcome === "missed");
          const paused = commitment && isPausedDate(commitment, date);
          const inRange =
            rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;
          return (
            <Pressable
              key={date}
              onPress={() => onSelect?.(date)}
              accessibilityRole={onSelect ? "button" : undefined}
              accessibilityLabel={`${formatDate(date)}${done ? ", completed" : ""}${missed ? ", missed" : ""}${paused ? ", paused" : ""}${active ? ", selected" : ""}`}
              accessibilityState={{ selected: active }}
              style={[
                s.day,
                inRange && { backgroundColor: color.surface.card },
                done && { backgroundColor: color.calendar.success },
                missed && { backgroundColor: color.danger.background },
                paused && {
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: color.ink.muted,
                },
                active && {
                  borderWidth: 1,
                  borderColor: color.success.foreground,
                },
                current && {
                  backgroundColor: color.ink.primary,
                  borderRadius: 24,
                },
              ]}
            >
              <Label
                size={12}
                bold={current}
                style={{
                  color: current
                    ? "#FFFFFF"
                    : commitment && !isScheduled(commitment, date)
                      ? color.ink.muted
                      : color.ink.primary,
                }}
              >
                {i - offset + 1}
              </Label>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function Timeline({
  commitment,
  now = new Date(),
}: {
  commitment: Commitment;
  now?: Date;
}) {
  const today = dateInZone(now, commitment.timeZone);
  const day = dayOrdinal(commitment, today);
  const fraction = day / commitment.duration;
  return (
    <View style={{ gap: 18 }}>
      <View style={s.spread}>
        <Label size={13} bold>
          Day {day} / {commitment.duration}
        </Label>
        <Label size={11}>
          {commitment.status === "broken"
            ? `Ended ${formatDate(commitment.failureDate || today, { month: "short", day: "numeric" })}`
            : commitment.status === "completed"
              ? "Promise kept"
              : commitment.status === "paused"
                ? `Paused since ${formatDate(commitment.events?.findLast((e) => e.type === "paused")?.date || today, { month: "short", day: "numeric" })}`
                : day === 0
                  ? `Starts ${formatDate(commitment.startDate, { month: "short", day: "numeric" })}`
                  : today > endDate(commitment)
                    ? "Timeline ended"
                    : `${commitment.duration - day} Days Remaining`}
        </Label>
      </View>
      <View style={s.timeline}>
        <View
          style={{
            height: 1,
            backgroundColor: color.ink.primary,
            width: `${fraction * 100}%`,
          }}
        />
        <View
          style={[s.timelineDot, { left: `${Math.min(97, fraction * 100)}%` }]}
        >
          <Icon
            name={
              commitment.status === "broken"
                ? "x"
                : commitment.status === "paused"
                  ? "pause"
                  : "check"
            }
            size={9}
            tint="#FFFFFF"
          />
        </View>
        <View style={s.timelineEnd} />
      </View>
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  screenContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    height: 48,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingHorizontal: 16, paddingTop: 16 },
  raisedBacking: {
    backgroundColor: color.ink.primary,
    marginRight: 3,
    marginBottom: 4,
    transform: [{ translateX: 3 }, { translateY: 4 }],
  },
  button: {
    minHeight: 56,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    transform: [{ translateX: -3 }, { translateY: -4 }],
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 92,
    padding: 18,
    borderWidth: 1,
    borderColor: color.ink.primary,
    backgroundColor: color.surface.input,
    transform: [{ translateX: -3 }, { translateY: -4 }],
  },
  choiceIcon: {
    height: 42,
    width: 42,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBacking: {
    backgroundColor: color.ink.primary,
    marginRight: 3,
    marginBottom: 4,
    transform: [{ translateX: 3 }, { translateY: 4 }],
  },
  field: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#8F8B86",
    padding: 16,
    backgroundColor: color.surface.input,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: color.ink.primary,
    transform: [{ translateX: -3 }, { translateY: -4 }],
  },
  pillField: { borderRadius: 40, boxShadow: "0px 4px 3px rgba(37,31,26,0.25)" },
  fieldPill: { borderWidth: 0, borderRadius: 40, transform: [] },
  panelBacking: {
    backgroundColor: color.ink.primary,
    borderRadius: 36,
    marginRight: 2,
    marginBottom: 4,
    transform: [{ translateX: 2 }, { translateY: 4 }],
  },
  panel: {
    backgroundColor: color.surface.panel,
    borderWidth: 1,
    borderColor: color.ink.primary,
    borderRadius: 36,
    padding: 24,
    transform: [{ translateX: -2 }, { translateY: -4 }],
  },
  card: {
    backgroundColor: color.surface.card,
    padding: 20,
    borderRadius: 28,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#9D9994",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  notice: {
    padding: 14,
    backgroundColor: color.surface.card,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  progressTrack: {
    height: 3,
    backgroundColor: color.surface.input,
    borderWidth: 0.5,
    borderColor: color.ink.primary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: color.success.foreground },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: color.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalPanel: {
    backgroundColor: color.canvas.focus,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: color.ink.primary,
    borderBottomWidth: 4,
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderColor: color.ink.primary,
  },
  close: {
    borderWidth: 1,
    borderColor: color.ink.primary,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countBox: {
    borderWidth: 1,
    borderColor: color.ink.primary,
    minWidth: 76,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#F0E1DB",
  },
  calendar: {
    backgroundColor: color.surface.panel,
    padding: 12,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.285714%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timeline: {
    height: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    marginVertical: 8,
  },
  timelineDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: color.ink.primary,
    justifyContent: "center",
    alignItems: "center",
    top: -6,
  },
  timelineEnd: {
    position: "absolute",
    right: 0,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.ink.primary,
    backgroundColor: color.surface.card,
  },
});
