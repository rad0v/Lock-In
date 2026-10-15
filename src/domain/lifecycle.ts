import {
  activeDates,
  addDays,
  canLog,
  canPause,
  dateInZone,
  deadline,
  endDate,
  getLog,
  isScheduled,
  midnight,
  progress,
  targetForDate,
  type Commitment,
  type Snapshot,
} from "./commitments";

export function event(
  c: Commitment,
  type: NonNullable<Commitment["events"]>[number]["type"],
  now: Date,
  date = dateInZone(now, c.timeZone),
) {
  (c.events ||= []).push({ type, at: now.toISOString(), date });
}
function breakAttempt(
  c: Commitment,
  date: string,
  reason: Commitment["failureReason"],
  now: Date,
) {
  c.status = "broken";
  c.failureDate = date;
  c.failureReason = reason;
  event(c, "broken", now, date);
}
// Pure deterministic reconciliation: caller persists the entire snapshot atomically.
export function reconcile(data: Snapshot, now: Date): boolean {
  let changed = false;
  for (const c of data.commitments) {
    if (c.status !== "active" && c.status !== "paused") continue;
    const dates = activeDates(c);
    let satisfied = true;
    if (c.pace.kind === "weekly") {
      for (let i = 0; i < dates.length; i += 7) {
        const part = dates.slice(i, i + 7);
        const full = part.length === Math.min(7, c.duration - i);
        const done = progress(c, data.checkIns, part[0]).done;
        if (!full || !done) satisfied = false;
        if (full && !done && now.getTime() >= deadline(c, part.at(-1)!)) {
          breakAttempt(c, part.at(-1)!, "quota", now);
          changed = true;
          break;
        }
      }
    } else {
      for (const date of dates.filter((d) => isScheduled(c, d))) {
        const done =
          (getLog(data.checkIns, c, date)?.count || 0) >= targetForDate(c);
        if (!done) satisfied = false;
        if (!done && now.getTime() >= deadline(c, date)) {
          breakAttempt(c, date, "missed", now);
          changed = true;
          break;
        }
      }
    }
    if (
      c.status === "active" &&
      dates.length === c.duration &&
      satisfied &&
      now.getTime() >= midnight(addDays(endDate(c), 1), c.timeZone)
    ) {
      c.status = "completed";
      c.completedAt = now.toISOString();
      event(c, "completed", now, endDate(c));
      changed = true;
    }
  }
  return changed;
}
export function pause(c: Commitment, now: Date) {
  if (!canPause(c, now))
    throw new Error(
      "Only a started commitment with days remaining can be paused.",
    );
  c.status = "paused";
  (c.pauses ||= []).push({ start: addDays(dateInZone(now, c.timeZone), 1) });
  event(c, "paused", now);
}
export function resume(c: Commitment, now: Date) {
  if (c.status !== "paused")
    throw new Error(
      "This commitment can no longer be resumed. Refresh to see its status.",
    );
  const interval = c.pauses?.find((p) => !p.end);
  if (!interval) throw new Error("The saved pause could not be found.");
  const today = dateInZone(now, c.timeZone);
  interval.end = today < interval.start ? interval.start : today;
  c.status = "active";
  event(c, "resumed", now);
}
export function fail(data: Snapshot, c: Commitment, date: string, now: Date) {
  if (!canLog(c, date, now))
    throw new Error("This date is outside its check-in window.");
  const old = data.checkIns.findIndex(
    (l) => l.attemptId === c.attemptId && l.date === date,
  );
  const log = {
    attemptId: c.attemptId,
    date,
    count: 0,
    outcome: "missed" as const,
    updatedAt: now.toISOString(),
  };
  if (old < 0) data.checkIns.push(log);
  else data.checkIns[old] = log;
  if (c.pace.kind !== "weekly") breakAttempt(c, date, "explicit", now);
}
export function restart(
  data: Snapshot,
  c: Commitment,
  requestId: string,
  reason: string,
  note: string,
  now: Date,
) {
  if (c.restartedBy)
    return data.commitments.find((x) => x.attemptId === c.restartedBy)!;
  if (c.status !== "broken")
    throw new Error("Only a broken commitment can be restarted.");
  if (reason.length > 80 || note.length > 500)
    throw new Error("Keep your reflection within 500 characters.");
  if (data.commitments.some((x) => x.id === requestId))
    throw new Error(
      "This request was already used. Reopen this screen and retry.",
    );
  const today = dateInZone(now, c.timeZone);
  const next: Commitment = {
    id: requestId,
    attemptId: requestId,
    commitmentId: c.commitmentId || c.id,
    previousAttemptId: c.attemptId,
    name: c.name,
    description: c.description,
    path: c.path,
    duration: c.duration,
    pace: JSON.parse(JSON.stringify(c.pace)),
    reward: c.reward,
    timeZone: c.timeZone,
    startDate: today,
    status: "active",
    createdAt: now.toISOString(),
    events: [],
    pauses: [],
  };
  c.reflection = {
    reason: reason.trim(),
    note: note.trim(),
    savedAt: now.toISOString(),
  };
  c.restartedBy = requestId;
  event(c, "restarted", now);
  event(next, "locked", now);
  data.commitments.unshift(next);
  return next;
}
