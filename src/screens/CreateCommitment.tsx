import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { usePreferences } from "../state/preferences";
import {
  Button,
  Calendar,
  Choice,
  Counter,
  Divider,
  ErrorNote,
  Field,
  Header,
  Label,
  ModalCard,
  Panel,
  Screen,
  StepProgress,
  Title,
} from "../components/ui";
import {
  addDays,
  dateInZone,
  dayDifference,
  endDate,
  formatDate,
  freshDraft,
  paceLabel,
  validateDraft,
  validDate,
  weekdays,
  type Draft,
  type Pace,
} from "../domain/commitments";
import { useSession } from "../state/session";
import { useData } from "../state/data";
import { color } from "../theme";

const titles = [
  "Choose your\nPath",
  "Define your\ncommitment",
  "Lock in the\ntimeline",
  "How often will you\nexecute?",
  "Secure your\nmotivation",
  "Review your\ncommitment",
];
const actions = [
  "SET COMMITMENT →",
  "SET TIMELINE →",
  "SET EXECUTION PACE →",
  "SET REWARD →",
  "LOCK IN COMMITMENT →",
  "CONFIRM & LOCK",
];
const rewards = [
  "A Good Coffee",
  "Favorite Meal",
  "Watch a movie",
  "Take a Nap",
];
export default function CreateCommitment() {
  const { identity } = useSession();
  const { create } = useData();
  const { reduced: reduce } = usePreferences();
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<{
    draft: Draft;
    step: number;
    requestId: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [editor, setEditor] = useState<"pace" | "days" | "dates" | null>(null);
  const [tempPace, setTempPace] = useState<Pace>({ kind: "weekly", count: 3 });
  const [start, setStart] = useState(draft.startDate);
  const [end, setEnd] = useState(endDate(draft));
  const [dateField, setDateField] = useState<"start" | "end">("start");
  const [editorError, setEditorError] = useState("");
  const key = `lockin.draft.${identity!.key}`;
  const requestId = useRef(Crypto.randomUUID());
  const writes = useRef(Promise.resolve());
  const finished = useRef(false);
  const submitLock = useRef(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            const value = JSON.parse(raw);
            if (
              value.draft &&
              value.step >= 1 &&
              value.step <= 6 &&
              value.requestId
            )
              setSaved(value);
          } catch {
            setError(
              "Your previous draft could not be restored. You can start a new one.",
            );
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (alive) {
          setError(
            "Draft storage is unavailable. Your changes may not survive closing the app.",
          );
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [key]);
  useEffect(() => {
    if (!ready || saved || finished.current) return;
    const raw = JSON.stringify({ draft, step, requestId: requestId.current });
    writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, raw))
      .catch(() => setError("Your draft could not be saved on this device."));
  }, [draft, step, ready, saved, key]);
  const update = (changes: Partial<Draft>) => {
    requestId.current = Crypto.randomUUID();
    setError("");
    setDraft((d) => ({ ...d, ...changes }));
  };
  const back = useCallback(() => {
    if (busy) return;
    setEditor(null);
    if (step > 1) {
      setError("");
      setDirection(-1);
      setStep(step - 1);
    } else if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [step, busy]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if ((editor && editor !== "dates") || confirm || saved) return false;
        if (step > 1 || busy) {
          back();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [back, step, busy, editor, confirm, saved]),
  );
  const next = () => {
    setError("");
    if (step === 3 && editor === "dates") {
      applyDates();
      return;
    }
    if (step === 1 && !draft.path)
      return setError("Choose Build or Quit to continue.");
    if (
      step === 2 &&
      (!draft.name.trim() ||
        draft.name.trim().length > 80 ||
        draft.description.length > 300)
    )
      return setError(
        "Enter a target up to 80 characters and a description up to 300.",
      );
    if (
      step === 3 &&
      (!validDate(draft.startDate) ||
        draft.startDate < dateInZone() ||
        draft.duration < 1 ||
        draft.duration > 365)
    )
      return setError("Choose today or later, with a duration of 1–365 days.");
    if (step === 4) {
      const problem = validateDraft({
        ...draft,
        reward: draft.reward || "Reward",
      });
      if (problem) return setError(problem);
    }
    if (step === 5 && !draft.reward.trim())
      return setError("Choose or enter your reward.");
    if (step === 6) {
      const problem = validateDraft(draft);
      if (problem) return setError(problem);
      setConfirm(true);
    } else {
      setDirection(1);
      setStep(step + 1);
    }
  };
  const lock = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const c = await create(draft, requestId.current);
      finished.current = true;
      await writes.current;
      await AsyncStorage.removeItem(key).catch(() => {});
      router.replace({
        pathname: "/commitment/[id]",
        params: { id: c.id, locked: "1" },
      });
    } catch (e) {
      setConfirm(false);
      setError(
        e instanceof Error
          ? e.message
          : "Your commitment was not saved. Please retry.",
      );
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  };
  const openPace = (mode: "pace" | "days") => {
    setEditorError("");
    setTempPace(
      mode === "days"
        ? draft.pace.kind === "custom"
          ? draft.pace
          : { kind: "custom", days: [0] }
        : draft.pace.kind !== "custom" &&
            (draft.pace.kind === "weekly" || draft.pace.count > 1)
          ? draft.pace
          : { kind: "weekly", count: 3 },
    );
    setEditor(mode);
  };
  const applyDates = () => {
    if (
      !validDate(start) ||
      !validDate(end) ||
      start < dateInZone() ||
      end < start ||
      dayDifference(start, end) >= 365
    )
      return setEditorError(
        "Select a valid range of 1–365 days starting today or later.",
      );
    update({ startDate: start, duration: dayDifference(start, end) + 1 });
    setEditor(null);
    setStep(4);
  };
  return (
    <Screen
      setup
      header={<Header back onBack={back} />}
      contentStyle={{ paddingTop: 48 }}
      footer={
        <View style={{ flexDirection: "row", gap: 20 }}>
          {step > 1 && (
            <Button
              light
              icon="arrow-left"
              title=""
              accessibilityLabel="Previous step"
              onPress={back}
              disabled={busy}
              style={{ width: 56 }}
            />
          )}
          <Button
            title={actions[step - 1]}
            onPress={next}
            disabled={!ready || busy || !!saved}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Panel>
        <StepProgress step={step} />
        <Animated.View
          key={step}
          entering={
            reduce
              ? FadeIn.duration(80)
              : (direction > 0 ? FadeInRight : FadeInLeft)
                  .duration(220)
                  .withInitialValues({
                    transform: [{ translateX: direction * 16 }],
                  })
          }
          exiting={
            reduce
              ? FadeOut.duration(80)
              : (direction > 0 ? FadeOutLeft : FadeOutRight).duration(160)
          }
          style={{ minHeight: 480 }}
        >
          <Title style={{ marginTop: 44, marginBottom: 40 }}>
            {step === 3 && editor === "dates"
              ? "Select custom duration"
              : titles[step - 1]}
          </Title>
          {step === 1 && (
            <View style={{ gap: 44, paddingBottom: 24 }}>
              <Choice
                title="Build"
                description="Establish a new positive ritual."
                icon="plus-circle"
                selected={draft.path === "build"}
                onPress={() => update({ path: "build" })}
              />
              <Choice
                title="Quit"
                description="Break away from a negative cycle."
                icon="minus-circle"
                selected={draft.path === "quit"}
                onPress={() =>
                  update({
                    path: "quit",
                    pace:
                      draft.pace.kind === "daily"
                        ? { kind: "daily", count: 1 }
                        : draft.pace,
                  })
                }
              />
            </View>
          )}
          {step === 2 && (
            <View style={{ gap: 28, paddingBottom: 24 }}>
              <Field
                label="What is your target?"
                placeholder="e.g., Daily Yoga Practice"
                value={draft.name}
                onChangeText={(name) => update({ name })}
                maxLength={80}
              />
              <Field
                label="Description (Optional)"
                placeholder="Any specific details..."
                value={draft.description}
                onChangeText={(description) => update({ description })}
                multiline
                maxLength={300}
              />
            </View>
          )}
          {step === 3 && editor !== "dates" && (
            <View style={{ gap: 20, paddingBottom: 24 }}>
              <Label bold>Challenge Duration</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                {[7, 30, 45, 90].map((duration) => (
                  <Button
                    key={duration}
                    light
                    title={`${duration} days`}
                    selected={
                      draft.duration === duration &&
                      draft.startDate === dateInZone()
                    }
                    onPress={() =>
                      update({ duration, startDate: dateInZone() })
                    }
                    style={{ width: "46%" }}
                  />
                ))}
              </View>
              <Button
                light
                icon="calendar"
                title="Custom Duration"
                onPress={() => {
                  setStart(draft.startDate);
                  setEnd(endDate(draft));
                  setDateField("start");
                  setEditorError("");
                  setEditor("dates");
                }}
              />
              <Label size={12} muted>
                {formatDate(draft.startDate)} – {formatDate(endDate(draft))}
              </Label>
            </View>
          )}
          {step === 3 && editor === "dates" && (
            <View style={{ gap: 20, paddingBottom: 24 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  light
                  title={formatDate(start, { month: "short", day: "numeric" })}
                  selected={dateField === "start"}
                  onPress={() => setDateField("start")}
                  style={{ flex: 1 }}
                />
                <Button
                  light
                  title={formatDate(end, { month: "short", day: "numeric" })}
                  selected={dateField === "end"}
                  onPress={() => setDateField("end")}
                  style={{ flex: 1 }}
                />
              </View>
              <Label size={12} muted>
                Select {dateField === "start" ? "start" : "end"} date
              </Label>
              <Calendar
                selected={dateField === "start" ? start : end}
                rangeStart={start}
                rangeEnd={end}
                onSelect={(date) => {
                  if (dateField === "start") {
                    setStart(date);
                    if (date > end) setEnd(date);
                    setDateField("end");
                  } else setEnd(date);
                  setEditorError("");
                }}
              />
              {!!editorError && <ErrorNote message={editorError} />}
            </View>
          )}
          {step === 4 && (
            <View style={{ gap: 18, paddingBottom: 24 }}>
              <Choice
                compact
                title="Everyday"
                description="No days off. Build relentless momentum."
                icon="calendar"
                selected={draft.pace.kind === "daily" && draft.pace.count === 1}
                onPress={() => update({ pace: { kind: "daily", count: 1 } })}
              />
              <Choice
                compact
                title="Flexible Pace"
                description="Set a target, e.g., 3 times a week."
                icon="sliders"
                selected={
                  draft.pace.kind === "weekly" ||
                  (draft.pace.kind === "daily" && draft.pace.count > 1)
                }
                onPress={() => openPace("pace")}
              />
              <Choice
                compact
                title="Custom Days"
                description="Pick specific days of the week."
                icon="check-square"
                selected={draft.pace.kind === "custom"}
                onPress={() => openPace("days")}
              />
              <Label size={12} muted>
                {paceLabel(draft.pace)}
              </Label>
            </View>
          )}
          {step === 5 && (
            <View style={{ gap: 30, paddingBottom: 24 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                {rewards.map((reward) => (
                  <Button
                    key={reward}
                    light
                    title={reward}
                    selected={draft.reward === reward}
                    onPress={() => update({ reward })}
                    style={{ width: "46%" }}
                  />
                ))}
              </View>
              <Field
                accessibilityLabel="Custom reward"
                placeholder="Or type a custom reward..."
                value={rewards.includes(draft.reward) ? "" : draft.reward}
                onChangeText={(reward) => update({ reward })}
                maxLength={120}
              />
            </View>
          )}
          {step === 6 && (
            <View style={{ paddingBottom: 16 }}>
              {[
                ["COMMITMENT NAME", draft.name],
                [
                  "TOTAL DURATION",
                  `${draft.duration} Days (${formatDate(draft.startDate)} – ${formatDate(endDate(draft))})`,
                ],
                ["EXECUTION PACE", paceLabel(draft.pace)],
                ["LOCKED MOTIVATION", draft.reward],
              ].map(([label, value], i) => (
                <View key={label}>
                  <Label size={11} muted>
                    {label}
                  </Label>
                  <Label bold style={{ marginTop: 6 }}>
                    {value}
                  </Label>
                  {i < 3 && <Divider />}
                </View>
              ))}
              {draft.pace.kind === "weekly" && draft.duration % 7 !== 0 && (
                <Label size={12} muted style={{ marginTop: 16 }}>
                  Final {draft.duration % 7}-day period:{" "}
                  {Math.ceil((draft.pace.count * (draft.duration % 7)) / 7)}{" "}
                  successful days required.
                </Label>
              )}
            </View>
          )}
        </Animated.View>
      </Panel>
      {!!error && (
        <View style={{ marginTop: 16 }}>
          <ErrorNote message={error} />
        </View>
      )}
      <ModalCard
        visible={!!saved}
        title="Your promise is waiting"
        onClose={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      >
        <Label>Continue where you left off, or begin a new commitment.</Label>
        <Button
          title="CONTINUE DRAFT"
          onPress={() => {
            if (saved) {
              requestId.current = saved.requestId;
              setDraft(saved.draft);
              setStep(saved.step);
              setSaved(null);
            }
          }}
        />
        <Button
          light
          title="Start new"
          onPress={() => {
            requestId.current = Crypto.randomUUID();
            setDraft(freshDraft());
            setStep(1);
            setSaved(null);
          }}
        />
      </ModalCard>
      <ModalCard
        visible={confirm}
        title="Lock this commitment?"
        onClose={() => setConfirm(false)}
        busy={busy}
      >
        <Label muted>
          This will finalize your rules and start the timeline.
        </Label>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Button
            light
            title="GO BACK"
            onPress={() => setConfirm(false)}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <Button
            title="YES, LOCK IT"
            onPress={() => void lock()}
            loading={busy}
            style={{ flex: 1 }}
          />
        </View>
      </ModalCard>
      <ModalCard
        visible={editor === "pace" || editor === "days"}
        title={editor === "days" ? "Custom Days" : "Flexible Pace"}
        onClose={() => setEditor(null)}
      >
        {tempPace.kind === "custom" ? (
          <>
            <Button
              light
              title="Weekdays"
              onPress={() =>
                setTempPace({ kind: "custom", days: [0, 1, 2, 3, 4] })
              }
            />
            <Button
              light
              title="Weekends"
              onPress={() => setTempPace({ kind: "custom", days: [5, 6] })}
            />
            <Label size={11} muted style={{ textAlign: "center" }}>
              OR SELECT SPECIFIC DAYS
            </Label>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {weekdays.map((w, i) => (
                <Pressable
                  key={w}
                  onPress={() =>
                    setTempPace({
                      kind: "custom",
                      days: tempPace.days.includes(i)
                        ? tempPace.days.filter((d) => d !== i)
                        : [...tempPace.days, i],
                    })
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: tempPace.days.includes(i) }}
                  accessibilityLabel={w}
                  style={{
                    minWidth: 38,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: tempPace.days.includes(i)
                      ? color.ink.primary
                      : "transparent",
                  }}
                >
                  <Label
                    size={11}
                    style={{
                      color: tempPace.days.includes(i)
                        ? "#FFFFFF"
                        : color.ink.primary,
                    }}
                  >
                    {w}
                  </Label>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Label style={{ textAlign: "center" }} muted>
              Execute
            </Label>
            <Counter
              value={tempPace.count}
              min={1}
              max={
                tempPace.kind === "weekly" ? 7 : draft.path === "quit" ? 1 : 99
              }
              onChange={(count) => setTempPace({ ...tempPace, count })}
            />
            <Label style={{ textAlign: "center" }} muted>
              times a
            </Label>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {(["weekly", "daily"] as const).map((kind) => (
                <Button
                  light
                  key={kind}
                  title={kind === "weekly" ? "Week" : "Day"}
                  selected={tempPace.kind === kind}
                  style={{ flex: 1 }}
                  onPress={() =>
                    setTempPace({
                      kind,
                      count: Math.min(
                        tempPace.count,
                        kind === "weekly" ? 7 : draft.path === "quit" ? 1 : 99,
                      ),
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
        {!!editorError && <ErrorNote message={editorError} />}
        <Button
          title="Apply Target"
          onPress={() => {
            const problem = validateDraft({
              ...draft,
              name: draft.name || "Target",
              reward: draft.reward || "Reward",
              pace: tempPace,
            });
            if (problem) return setEditorError(problem);
            update({ pace: tempPace });
            setEditor(null);
          }}
        />
      </ModalCard>
    </Screen>
  );
}
