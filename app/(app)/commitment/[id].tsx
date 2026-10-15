import React, { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Calendar,
  Card,
  Divider,
  Header,
  Icon,
  Label,
  Notice,
  ModalCard,
  ErrorNote,
  Screen,
  SectionLabel,
  StatusChip,
  Timeline,
  Title,
  s,
} from "../../../src/components/ui";
import {
  LogModal,
  type LogSelection,
} from "../../../src/components/commitments";
import {
  canLog,
  canPause,
  isPausedDate,
  dateInZone,
  endDate,
  formatDate,
  getLog,
  isScheduled,
  paceLabel,
  targetForDate,
  validDate,
  streak,
} from "../../../src/domain/commitments";
import { useData } from "../../../src/state/data";
import { color } from "../../../src/theme";
import { LockSettle, StateMotion } from "../../../src/components/motion";

export default function Detail() {
  const {
    id,
    date: requestedDate,
    locked,
  } = useLocalSearchParams<{ id: string; date?: string; locked?: string }>();
  const { snapshot, loading, error, refresh, now, pause, resume } = useData();
  const c = snapshot.commitments.find((c) => c.id === id);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    requestedDate && validDate(requestedDate) ? requestedDate : null,
  );
  const [selection, setSelection] = useState<LogSelection | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const action = async (kind: "pause" | "resume") => {
    if (!c || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await (kind === "pause" ? pause(c) : resume(c));
      setConfirmPause(false);
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : "Could not save this change. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  if (!c)
    return (
      <Screen
        header={<Header back onBack={() => router.replace("/")} />}
        contentStyle={{ justifyContent: "center", gap: 20 }}
      >
        <Label>This commitment could not be found.</Label>
        <Button title="BACK TO FOCUS" onPress={() => router.replace("/")} />
      </Screen>
    );
  const today = dateInZone(now, c.timeZone);
  const date = selectedDate || today;
  const log = getLog(snapshot.checkIns, c, date);
  const writable = canLog(c, date, now);
  return (
    <Screen
      header={
        <Header
          back
          label="Back To Dashboard"
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
      }
      contentStyle={{ gap: 24, paddingTop: 16 }}
    >
      {error && <Notice message={error} onRetry={() => void refresh()} />}
      <LockSettle enabled={locked === "1"}>
        <View style={[s.spread, { alignItems: "flex-start" }]}>
          <Title style={{ fontSize: 38, lineHeight: 40, flex: 1 }}>
            {c.name}
          </Title>
          <StatusChip status={c.status} />
        </View>
        {!!c.description && (
          <Label size={13} muted style={{ marginTop: 10 }}>
            {c.description}
          </Label>
        )}
      </LockSettle>
      <View style={{ gap: 12 }}>
        <SectionLabel>Timeline</SectionLabel>
        <Card>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: color.ink.focus,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 24,
            }}
          >
            <Label size={12} style={{ color: "#FFFFFF" }}>
              {paceLabel(c.pace)}
            </Label>
          </View>
          <View style={[s.spread, { marginTop: 24, marginBottom: 28 }]}>
            <View>
              <Label size={11} muted>
                Start Date
              </Label>
              <Label size={12} style={{ marginTop: 4 }}>
                {formatDate(c.startDate)}
              </Label>
            </View>
            <View>
              <Label size={11} muted>
                {c.status === "paused" ? "Original end" : "End Date"}
              </Label>
              <Label size={12} style={{ marginTop: 4 }}>
                {formatDate(
                  c.status === "paused"
                    ? endDate({ ...c, pauses: [] })
                    : endDate(c),
                )}
              </Label>
            </View>
          </View>
          <Timeline commitment={c} now={now} />
          <Label size={11} muted style={{ marginTop: 16 }}>
            Current streak: {streak(c, snapshot.checkIns, now).count}{" "}
            {streak(c, snapshot.checkIns, now).unit}
          </Label>
          {c.status === "paused" && (
            <Label size={11} muted style={{ marginTop: 16 }}>
              Deadline extends on resume. Today’s target and earlier catch-up
              dates still count.
            </Label>
          )}
          {c.status === "active" && today > endDate(c) && (
            <Label size={12} style={{ marginTop: 16 }}>
              Awaiting final check-in. Your reward stays locked until every
              requirement is met.
            </Label>
          )}
          {c.status === "broken" && (
            <Label size={12} style={{ marginTop: 16 }}>
              {c.failureReason === "quota"
                ? "The weekly quota was not met."
                : c.failureReason === "explicit"
                  ? "You recorded a missed day."
                  : "A check-in window expired."}{" "}
              Your progress is preserved.
            </Label>
          )}
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <SectionLabel>Recent History</SectionLabel>
        <Calendar
          selected={date}
          commitment={c}
          logs={snapshot.checkIns}
          onSelect={setSelectedDate}
        />
        <Label size={11} muted>
          Green: completed · Red: missed · Outline: paused · Dark: today
        </Label>
        <View style={{ paddingHorizontal: 8, gap: 10 }}>
          <Label size={13} bold>
            {formatDate(date)}
          </Label>
          <Label size={12} muted>
            {isPausedDate(c, date)
              ? "Paused date — no check-in due."
              : c.failureDate === date || log?.outcome === "missed"
                ? "Missed outcome recorded."
                : !isScheduled(c, date)
                  ? "No check-in scheduled."
                  : log
                    ? `${log.count} / ${targetForDate(c)} recorded.`
                    : date > today
                      ? "Your promise is ahead of you."
                      : "No progress recorded."}
          </Label>
          {writable && (
            <Button
              light
              title={log ? "UPDATE CHECK-IN" : "LOG PROGRESS"}
              icon="check-square"
              onPress={() => setSelection({ commitment: c, date })}
            />
          )}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <SectionLabel>Reward</SectionLabel>
        <Card>
          <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
            <StateMotion value={c.status} settle>
              <Icon
                name={c.status === "completed" ? "award" : "gift"}
                size={64}
                tint={
                  c.status === "completed"
                    ? color.success.foreground
                    : color.ink.primary
                }
              />
            </StateMotion>
            <View style={{ flex: 1 }}>
              <Label size={10} muted>
                {c.status === "completed"
                  ? "Reward unlocked"
                  : `Unlocks after day ${c.duration}`}
              </Label>
              <Label size={17} bold style={{ marginTop: 8 }}>
                {c.reward}
              </Label>
            </View>
          </View>
          <Divider />
          <Label size={11} muted style={{ textAlign: "center" }}>
            {c.status === "completed"
              ? "You kept your promise. Enjoy the reward you chose."
              : "Every single day brings you closer to the reward."}
          </Label>
        </Card>
      </View>
      {c.reflection && (
        <Card>
          <SectionLabel>Your private reflection</SectionLabel>
          <Label style={{ marginTop: 12 }}>
            {c.reflection.reason ||
              c.reflection.note ||
              "You chose to start fresh without a note."}
          </Label>
        </Card>
      )}
      {!!c.events?.length && (
        <Card>
          <SectionLabel>Attempt history</SectionLabel>
          {c.events.map((e, i) => (
            <Label
              key={i}
              size={12}
              style={{ marginTop: 8, textTransform: "capitalize" }}
            >
              {e.type} · {formatDate(e.date)}
            </Label>
          ))}
        </Card>
      )}
      {c.previousAttemptId && (
        <Button
          light
          title="VIEW PREVIOUS ATTEMPT"
          onPress={() =>
            router.push({
              pathname: "/commitment/[id]",
              params: {
                id:
                  snapshot.commitments.find(
                    (x) => x.attemptId === c.previousAttemptId,
                  )?.id || c.previousAttemptId!,
              },
            })
          }
        />
      )}
      {c.restartedBy ? (
        <Button
          light
          title="VIEW NEW ATTEMPT"
          onPress={() =>
            router.push({
              pathname: "/commitment/[id]",
              params: { id: c.restartedBy! },
            })
          }
        />
      ) : c.status === "broken" ? (
        <Button
          light
          title="Restart Commitment"
          icon="rotate-ccw"
          onPress={() =>
            router.push({
              pathname: "/commitment/reflect",
              params: { id: c.id },
            })
          }
        />
      ) : c.status === "paused" ? (
        <Button
          light
          title="Resume Commitment"
          icon="play"
          onPress={() => void action("resume")}
          loading={busy}
        />
      ) : canPause(c, now) ? (
        <Button
          light
          title="Pause Commitment"
          icon="pause"
          onPress={() => setConfirmPause(true)}
        />
      ) : null}
      {!!actionError && !confirmPause && <ErrorNote message={actionError} />}
      <ModalCard
        visible={confirmPause}
        title="Pause your commitment?"
        onClose={() => setConfirmPause(false)}
        busy={busy}
      >
        <Label>
          Pause from tomorrow; today’s target still counts. Earlier check-ins
          keep their catch-up deadlines. Reminders stop now, and your deadline
          extends by paused days when you resume.
        </Label>
        {!!actionError && <ErrorNote message={actionError} />}
        <Button
          title="CONFIRM PAUSE"
          onPress={() => void action("pause")}
          loading={busy}
        />
        <Button
          light
          title="KEEP GOING"
          onPress={() => setConfirmPause(false)}
          disabled={busy}
        />
      </ModalCard>
      <LogModal selection={selection} onClose={() => setSelection(null)} />
    </Screen>
  );
}
