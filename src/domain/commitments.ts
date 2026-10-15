export type Path = "build" | "quit";
export type Status = "active" | "paused" | "broken" | "completed";
export type Pace =
  | { kind: "daily"; count: number }
  | { kind: "weekly"; count: number }
  | { kind: "custom"; days: number[] };
export type Draft = {
  path: Path | null;
  name: string;
  description: string;
  startDate: string;
  duration: number;
  pace: Pace;
  reward: string;
};
export type Commitment = {
  id: string;
  attemptId: string;
  path: Path;
  name: string;
  description: string;
  startDate: string;
  duration: number;
  pace: Pace;
  reward: string;
  timeZone: string;
  status: Status;
  createdAt: string;
  commitmentId?: string;
  previousAttemptId?: string;
  restartedBy?: string;
  pauses?: { start: string; end?: string }[];
  failureDate?: string;
  failureReason?: "missed" | "explicit" | "quota";
  completedAt?: string;
  reflection?: { reason: string; note: string; savedAt: string };
  events?: {
    type:
      "locked" | "paused" | "resumed" | "broken" | "completed" | "restarted";
    at: string;
    date: string;
  }[];
};
export type CheckIn = {
  attemptId: string;
  date: string;
  count: number;
  updatedAt: string;
  outcome?: "success" | "missed" | "partial";
};
export type Snapshot = { commitments: Commitment[]; checkIns: CheckIn[] };
export const emptySnapshot: Snapshot = { commitments: [], checkIns: [] };
export const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function zone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
export function dateInZone(now = new Date(), timeZone = zone()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((k) => p.find((x) => x.type === k)!.value)
    .join("-");
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function dayDifference(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    addDays(date, 0) === date
  );
}
export function dayOfWeek(date: string) {
  return (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
}
export function endDate(
  c: Pick<Commitment, "startDate" | "duration" | "pauses">,
) {
  const frozen = (c.pauses || []).reduce(
    (n, p) => n + (p.end ? Math.max(0, dayDifference(p.start, p.end)) : 0),
    0,
  );
  return addDays(c.startDate, c.duration - 1 + frozen);
}
export function isPausedDate(c: Commitment, date: string) {
  return (c.pauses || []).some(
    (p) => date >= p.start && (!p.end || date < p.end),
  );
}
export function activeDates(c: Commitment): string[] {
  const result: string[] = [];
  const end = endDate(c);
  for (let date = c.startDate; date <= end; date = addDays(date, 1)) {
    if (!isPausedDate(c, date)) result.push(date);
    if (c.pauses?.some((p) => !p.end && date >= p.start)) break;
  }
  return result;
}
export function dayOrdinal(c: Commitment, date: string) {
  const cutoff = c.failureDate && c.failureDate < date ? c.failureDate : date;
  return activeDates(c).filter((d) => d <= cutoff).length;
}
export function canPause(c: Commitment, now = new Date()) {
  const today = dateInZone(now, c.timeZone);
  return c.status === "active" && today >= c.startDate && today < endDate(c);
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
}

// Resolve midnight in an IANA zone without treating a local date as a UTC date.
export function midnight(date: string, timeZone: string): number {
  const target = Date.parse(date + "T00:00:00Z");
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const get = (k: string) => parts.find((p) => p.type === k)!.value;
    const local = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    const next = guess + target - local;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}
export function deadline(c: Pick<Commitment, "timeZone">, date: string) {
  return midnight(addDays(date, 1), c.timeZone) + 86400000;
}
export function isScheduled(c: Commitment, date: string) {
  return (
    date >= c.startDate &&
    date <= endDate(c) &&
    !isPausedDate(c, date) &&
    (c.pace.kind !== "custom" || c.pace.days.includes(dayOfWeek(date)))
  );
}
export function canLog(c: Commitment, date: string, now = new Date()) {
  return (
    (c.status === "active" || c.status === "paused") &&
    isScheduled(c, date) &&
    date <= dateInZone(now, c.timeZone) &&
    now.getTime() < deadline(c, date)
  );
}
export function targetForDate(c: Commitment) {
  return c.pace.kind === "daily" ? c.pace.count : 1;
}
export function paceLabel(pace: Pace) {
  if (pace.kind === "daily")
    return pace.count === 1 ? "Everyday" : `${pace.count} times a day`;
  if (pace.kind === "weekly") return `${pace.count} days per week`;
  return [...pace.days]
    .sort((a, b) => a - b)
    .map((d) => weekdays[d])
    .join(", ");
}
export function getLog(logs: CheckIn[], c: Commitment, date: string) {
  return logs.find((l) => l.attemptId === c.attemptId && l.date === date);
}
export function weeklyPeriod(c: Commitment, date: string) {
  // A paused period has no final deadline until enough active dates exist.
  const dates = activeDates(c);
  const ordinal = Math.max(0, dates.filter((d) => d <= date).length - 1);
  const offset = Math.floor(ordinal / 7) * 7;
  const periodDates = dates.slice(offset, offset + 7);
  const start = periodDates[0] || c.startDate;
  const end = periodDates.at(-1) || start;
  const required =
    c.pace.kind === "weekly"
      ? Math.ceil((c.pace.count * Math.min(7, c.duration - offset)) / 7)
      : 1;
  return { start, end, required };
}
export function progress(c: Commitment, logs: CheckIn[], date: string) {
  if (c.pace.kind === "weekly") {
    const period = weeklyPeriod(c, date);
    const count = new Set(
      logs
        .filter(
          (l) =>
            l.attemptId === c.attemptId &&
            l.date >= period.start &&
            l.date <= period.end &&
            isScheduled(c, l.date) &&
            l.count >= 1,
        )
        .map((l) => l.date),
    ).size;
    return { count, target: period.required, done: count >= period.required };
  }
  const count = getLog(logs, c, date)?.count || 0;
  const target = targetForDate(c);
  return { count, target, done: count >= target };
}
export function dueRows(snapshot: Snapshot, now = new Date()) {
  return snapshot.commitments
    .flatMap((c) => {
      const today = dateInZone(now, c.timeZone);
      return [addDays(today, -2), addDays(today, -1), today]
        .filter((d) => canLog(c, d, now))
        .filter((d) => d === today || !progress(c, snapshot.checkIns, d).done)
        .map((date) => ({ commitment: c, date, catchUp: date !== today }));
    })
    .sort(
      (a, b) =>
        Number(a.catchUp) - Number(b.catchUp) ||
        Number(progress(a.commitment, snapshot.checkIns, a.date).done) -
          Number(progress(b.commitment, snapshot.checkIns, b.date).done) ||
        a.commitment.createdAt.localeCompare(b.commitment.createdAt),
    );
}
export function streak(c: Commitment, logs: CheckIn[], now = new Date()) {
  const today = dateInZone(now, c.timeZone);
  const dates = activeDates(c);
  let count = 0;
  if (c.pace.kind === "weekly") {
    for (let i = 0; i < dates.length; i += 7) {
      const part = dates.slice(i, i + 7);
      if (part.length !== Math.min(7, c.duration - i) || part.at(-1)! >= today)
        break;
      count = progress(c, logs, part[0]).done ? count + 1 : 0;
    }
    return { count, unit: "quota periods" };
  }
  for (const date of dates.filter((d) => d <= today && isScheduled(c, d))) {
    if ((getLog(logs, c, date)?.count || 0) >= targetForDate(c)) count++;
    else if (
      date !== today ||
      getLog(logs, c, date)?.outcome === "missed" ||
      c.failureDate === date
    )
      count = 0;
  }
  return { count, unit: "scheduled days" };
}
export function freshDraft(now = new Date()): Draft {
  return {
    path: null,
    name: "",
    description: "",
    startDate: dateInZone(now),
    duration: 30,
    pace: { kind: "daily", count: 1 },
    reward: "",
  };
}
export function validateDraft(d: Draft, now = new Date()): string | null {
  if (!d.path) return "Choose Build or Quit to continue.";
  if (!d.name.trim() || d.name.trim().length > 80)
    return "Give your commitment a name between 1 and 80 characters.";
  if (d.description.length > 300)
    return "Keep the description within 300 characters.";
  if (!validDate(d.startDate) || d.startDate < dateInZone(now))
    return "Choose today or a future start date.";
  if (!Number.isInteger(d.duration) || d.duration < 1 || d.duration > 365)
    return "Choose a duration between 1 and 365 days.";
  if (d.pace.kind === "custom") {
    if (
      !d.pace.days.length ||
      d.pace.days.some((n) => !Number.isInteger(n) || n < 0 || n > 6) ||
      new Set(d.pace.days).size !== d.pace.days.length
    )
      return "Choose at least one valid weekday.";
    if (
      !Array.from({ length: d.duration }, (_, i) =>
        dayOfWeek(addDays(d.startDate, i)),
      ).some((n) => d.pace.kind === "custom" && d.pace.days.includes(n))
    )
      return "Choose days that occur during your challenge.";
  } else if (
    !Number.isInteger(d.pace.count) ||
    d.pace.count < 1 ||
    d.pace.count > (d.pace.kind === "weekly" ? 7 : d.path === "quit" ? 1 : 99)
  )
    return "Choose a valid execution target.";
  if (!d.reward.trim() || d.reward.trim().length > 120)
    return "Choose a reward, up to 120 characters.";
  return null;
}
export function validateCheckIn(
  c: Commitment,
  date: string,
  count: number,
  now = new Date(),
) {
  if (!canLog(c, date, now))
    throw new Error("This date is outside its check-in window.");
  if (!Number.isInteger(count) || count < 0 || count > targetForDate(c))
    throw new Error("Choose a count within your daily target.");
}
