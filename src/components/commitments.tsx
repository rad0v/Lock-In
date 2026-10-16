import React, { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Counter,
  ErrorNote,
  Icon,
  Label,
  ModalCard,
  ProgressBar,
  StatusChip,
  Timeline,
  Card,
  s,
} from "./ui";
import {
  canLog,
  formatDate,
  getLog,
  paceLabel,
  progress,
  targetForDate,
  weeklyPeriod,
  type Commitment,
} from "../domain/commitments";
import { useData } from "../state/data";
import { color } from "../theme";
import { MotionView, StateMotion } from "./motion";

export type LogSelection = { commitment: Commitment; date: string };
export function CommitmentCard({ commitment }: { commitment: Commitment }) {
  const { now } = useData();
  return (
    <MotionView layout>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${commitment.name}`}
        onPress={() =>
          router.push({
            pathname: "/commitment/[id]",
            params: { id: commitment.id },
          })
        }
      >
        <Card>
          <View style={[s.spread, { alignItems: "flex-start" }]}>
            <Label size={19} bold style={{ flex: 1 }}>
              {commitment.name}
            </Label>
            <StatusChip status={commitment.status} />
          </View>
          {!!commitment.description && (
            <Label size={12} muted numberOfLines={2} style={{ marginTop: 4 }}>
              {commitment.description}
            </Label>
          )}
          <View style={{ marginTop: 24 }}>
            <Timeline commitment={commitment} now={now} />
          </View>
          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Icon name="gift" size={12} />
            <Label size={11} numberOfLines={1} style={{ flex: 1 }}>
              Reward Preview: {commitment.reward}
            </Label>
          </View>
        </Card>
      </Pressable>
    </MotionView>
  );
}
export function TrackingRow({
  commitment,
  date,
  onPress,
  catchUp = false,
}: {
  commitment: Commitment;
  date: string;
  onPress: () => void;
  catchUp?: boolean;
}) {
  const { snapshot } = useData();
  const p = progress(commitment, snapshot.checkIns, date);
  return (
    <MotionView
      layout
      style={{
        backgroundColor: color.ink.primary,
        marginBottom: 3,
        marginRight: 2,
        transform: [{ translateX: 2 }, { translateY: 3 }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${commitment.name}, ${p.count} of ${p.target}${catchUp ? ", catch up for " + formatDate(date) : ""}`}
        onPress={onPress}
        style={{
          backgroundColor: color.surface.tracking,
          borderWidth: 1,
          borderColor: color.ink.primary,
          paddingHorizontal: 20,
          paddingVertical: 16,
          transform: [{ translateX: -2 }, { translateY: -3 }],
          minHeight: 84,
        }}
      >
        <View style={s.spread}>
          <View style={{ flex: 1 }}>
            <Label size={15} bold>
              {commitment.name}
            </Label>
            <Label size={11} muted>
              {catchUp
                ? `Catch up · ${formatDate(date, { month: "short", day: "numeric" })}`
                : paceLabel(commitment.pace)}
            </Label>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <View style={{ width: "77%" }}>
                <ProgressBar value={p.count / p.target} />
              </View>
              <Label size={10}>
                {p.count}/{p.target}
                {commitment.pace.kind === "weekly" ? " wk" : ""}
              </Label>
            </View>
          </View>
          <StateMotion
            value={p.done}
            settle
            style={{
              width: 15,
              height: 15,
              borderWidth: 1,
              borderColor: p.done ? color.success.foreground : "#9D9994",
              backgroundColor: p.done ? color.success.foreground : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {p.done && <Icon name="check" size={12} tint="#FFFFFF" />}
          </StateMotion>
        </View>
      </Pressable>
    </MotionView>
  );
}
export function LogModal({
  selection,
  onClose,
}: {
  selection: LogSelection | null;
  onClose: () => void;
}) {
  const { snapshot, log, fail, now } = useData();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmFailure, setConfirmFailure] = useState(false);
  const saving = useRef(false);
  const lastSelection = useRef(selection);
  if (selection) lastSelection.current = selection;
  useEffect(() => {
    if (!selection) return;
    setCount(
      selection
        ? getLog(snapshot.checkIns, selection.commitment, selection.date)
            ?.count || 0
        : 0,
    );
    setError("");
    setConfirmFailure(false);
    // Refreshing saved data must not overwrite an in-progress counter edit.
  }, [selection]);
  const displayed = selection || lastSelection.current;
  if (!displayed) return null;
  const c =
    snapshot.commitments.find(
      (c) => c.attemptId === displayed.commitment.attemptId,
    ) || displayed.commitment;
  const enabled = !!selection && canLog(c, displayed.date, now);
  const numeric = c.pace.kind === "daily" && c.pace.count > 1;
  const save = async (value: number) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await log(c, displayed.date, value);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your check-in was not saved. Please retry.",
      );
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };
  const period =
    c.pace.kind === "weekly" ? weeklyPeriod(c, displayed.date) : null;
  const recordFailure = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await fail(c, displayed.date);
      onClose();
      if (c.pace.kind !== "weekly")
        router.push({ pathname: "/commitment/reflect", params: { id: c.id } });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your outcome was not saved. Please retry.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <ModalCard
      visible={!!selection}
      title="Daily Log Progress"
      onClose={onClose}
      busy={busy}
    >
      <Label size={24} bold style={{ textAlign: "center" }}>
        {c.name}
      </Label>
      <Label muted style={{ textAlign: "center" }}>
        {formatDate(displayed.date)}
        {period
          ? `\n${period.required} successful days · ${formatDate(period.start, { month: "short", day: "numeric" })} – ${formatDate(period.end, { month: "short", day: "numeric" })}`
          : "\nEvery single day brings you closer to your reward."}
      </Label>
      {confirmFailure ? (
        <>
          <Label>
            {c.pace.kind === "weekly"
              ? "Record this date as missed? Your weekly commitment continues until its quota deadline."
              : "This will end this attempt now. Your history stays saved, and you can reflect and start again."}
          </Label>
          <Button
            title={
              c.pace.kind === "weekly"
                ? "CONFIRM MISSED DAY"
                : "CONFIRM & END ATTEMPT"
            }
            onPress={() => void recordFailure()}
            loading={busy}
            disabled={!enabled}
          />
          <Button
            light
            title="KEEP GOING"
            onPress={() => setConfirmFailure(false)}
            disabled={busy}
          />
        </>
      ) : (
        <>
          {numeric ? (
            <>
              <Counter
                value={count}
                max={targetForDate(c)}
                onChange={setCount}
              />
              <Label size={12} muted style={{ textAlign: "center" }}>
                of {targetForDate(c)} today
              </Label>
              <Button
                title="Apply Changes"
                onPress={() => void save(count)}
                loading={busy}
                disabled={!enabled}
              />
            </>
          ) : (
            <Button
              light
              title={c.path === "quit" ? "Stayed Consistent" : "Done!"}
              icon="check"
              onPress={() => void save(1)}
              loading={busy}
              disabled={!enabled}
            />
          )}
          <Button
            light
            title={
              c.pace.kind === "weekly"
                ? c.path === "quit"
                  ? "Didn't stay consistent"
                  : "Not today"
                : c.path === "quit"
                  ? "Broke my Commitment"
                  : "Missed"
            }
            icon="x"
            onPress={() => setConfirmFailure(true)}
            disabled={!enabled || busy}
          />
        </>
      )}
      {!!error && <ErrorNote message={error} />}
      {!enabled && (
        <Label size={12} muted>
          This date is outside its check-in window.
        </Label>
      )}
      <Label size={11} muted style={{ textAlign: "center" }}>
        Check-ins can be updated for 24 hours after the day ends.
      </Label>
    </ModalCard>
  );
}
