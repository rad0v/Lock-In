import {
  activeDates,
  addDays,
  dateInZone,
  deadline,
  getLog,
  isScheduled,
  midnight,
  progress,
  targetForDate,
  type Snapshot,
} from "./commitments";

export type Reminder = {
  key: string;
  attemptId: string;
  date: string;
  at: number;
};
// Wall-clock resolution keeps 20:00 at 20:00 through DST and travel.
export function reminderInstant(date: string, time: string, timeZone: string) {
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.parse(`${date}T${time}:00Z`);
  let guess = midnight(date, timeZone) + (hour * 60 + minute) * 60000;
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
    const get = (key: string) => parts.find((p) => p.type === key)!.value;
    const local = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    if (local === target) return guess;
    guess += target - local;
  }
  // A nonexistent spring-forward wall time is skipped rather than moved to another date.
  return NaN;
}
export function reminderPlan(
  snapshot: Snapshot,
  time: string,
  now: Date,
): Reminder[] {
  const plan: Reminder[] = [];
  for (const c of snapshot.commitments) {
    if (c.status !== "active" || c.restartedBy) continue;
    const today = dateInZone(now, c.timeZone);
    const dates = activeDates(c);
    let cutoff = Infinity;
    if (c.pace.kind === "weekly") {
      for (let i = 0; i < dates.length; i += 7) {
        const part = dates.slice(i, i + 7);
        if (!progress(c, snapshot.checkIns, part[0]).done) {
          cutoff = deadline(c, part.at(-1)!);
          break;
        }
      }
    } else {
      const first = dates.find(
        (d) =>
          isScheduled(c, d) &&
          (getLog(snapshot.checkIns, c, d)?.count || 0) < targetForDate(c),
      );
      if (first) cutoff = deadline(c, first);
    }
    for (const date of dates) {
      if (
        !isScheduled(c, date) ||
        (getLog(snapshot.checkIns, c, date)?.count || 0) >= targetForDate(c) ||
        progress(c, snapshot.checkIns, date).done ||
        date < addDays(today, -2) ||
        date > addDays(today, 30)
      )
        continue;
      // Daily reminder plus one catch-up reminder, both bound by unresolved expiry.
      for (const onDate of [date, addDays(date, 1)]) {
        const at = reminderInstant(onDate, time, c.timeZone);
        if (
          at <= now.getTime() ||
          at >= deadline(c, date) ||
          at >= cutoff ||
          !Number.isFinite(at)
        )
          continue;
        plan.push({
          key: `lockin:${c.attemptId}:${date}:${onDate}:${time}`,
          attemptId: c.attemptId,
          date,
          at,
        });
      }
    }
  }
  const seen = new Set<string>();
  return plan
    .sort(
      (a, b) =>
        a.at - b.at ||
        a.date.localeCompare(b.date) ||
        a.key.localeCompare(b.key),
    )
    .filter((r) => {
      const key = `${r.attemptId}:${r.at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 60);
}
