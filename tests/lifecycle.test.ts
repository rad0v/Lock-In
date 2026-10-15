import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeDates,
  canLog,
  dayOrdinal,
  endDate,
  progress,
  streak,
  type Commitment,
  type Snapshot,
} from "../src/domain/commitments";
import { reconcile, pause, resume } from "../src/domain/lifecycle";
import {
  createLocalRepository,
  type Storage,
} from "../src/data/local-repository";

const base: Commitment = {
  id: "old",
  attemptId: "old",
  name: "Yoga",
  path: "build",
  description: "",
  duration: 7,
  startDate: "2026-06-04",
  pace: { kind: "daily", count: 1 },
  reward: "Coffee",
  status: "active",
  timeZone: "UTC",
  createdAt: "2026-06-04T00:00:00Z",
};
const at = (date: string) => new Date(`${date}T12:00:00Z`);
const snapshot = (c = base, days: string[] = []): Snapshot => ({
  commitments: [structuredClone(c)],
  checkIns: days.map((date) => ({
    attemptId: c.attemptId,
    date,
    count: 1,
    updatedAt: at(date).toISOString(),
  })),
});
function harness(data = snapshot()) {
  let raw = JSON.stringify(data);
  let now = at("2026-06-04");
  let failWrite = false;
  const storage: Storage = {
    getItem: async () => raw,
    setItem: async (_k, v) => {
      if (failWrite) throw new Error("disk full");
      raw = v;
    },
  };
  return {
    repo: createLocalRepository(storage, () => now),
    tick: (value: Date) => {
      now = value;
    },
    failWrite: () => {
      failWrite = true;
    },
    saved: () => JSON.parse(raw) as Snapshot,
  };
}
test("pause preserves today, freezes dates, extends deadline, and preserves log dates", () => {
  const c = structuredClone(base);
  pause(c, at("2026-06-06"));
  assert.equal(canLog(c, "2026-06-06", at("2026-06-06")), true);
  assert.equal(canLog(c, "2026-06-07", at("2026-06-07")), false);
  assert.equal(dayOrdinal(c, "2026-06-08"), 3);
  resume(c, at("2026-06-09"));
  assert.equal(endDate(c), "2026-06-12");
  assert.equal(dayOrdinal(c, "2026-06-09"), 4);
  assert.deepEqual(activeDates(c), [
    "2026-06-04",
    "2026-06-05",
    "2026-06-06",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
  ]);
});
test("same-day pause/resume adds zero days, repeated pauses add only frozen dates", () => {
  const c = structuredClone(base);
  pause(c, at("2026-06-04"));
  resume(c, at("2026-06-04"));
  assert.equal(endDate(c), "2026-06-10");
  pause(c, at("2026-06-04"));
  resume(c, at("2026-06-07"));
  pause(c, at("2026-06-08"));
  resume(c, at("2026-06-10"));
  assert.equal(endDate(c), "2026-06-13");
  assert.equal(activeDates(c).length, 7);
});
test("future and final-date attempts cannot pause", () => {
  assert.throws(() => pause(structuredClone(base), at("2026-06-03")));
  assert.throws(() => pause(structuredClone(base), at("2026-06-10")));
});
test("automatic expiry respects exact grace and remains idempotent", () => {
  const data = snapshot();
  assert.equal(reconcile(data, new Date("2026-06-05T23:59:59Z")), false);
  assert.equal(reconcile(data, new Date("2026-06-06T00:00:00Z")), true);
  assert.equal(data.commitments[0].failureDate, "2026-06-04");
  assert.equal(data.commitments[0].events?.length, 1);
  assert.equal(reconcile(data, at("2026-06-12")), false);
});
test("pause cannot erase old obligations; expired resume rejects and persists broken", async () => {
  const h = harness();
  await h.repo.pause(base);
  h.tick(at("2026-06-06"));
  await assert.rejects(h.repo.resume(base));
  assert.equal(h.saved().commitments[0].status, "broken");
  assert.equal(h.saved().commitments[0].failureDate, "2026-06-04");
});
test("explicit daily failure is immediate; restart atomically preserves notes and old logs", async () => {
  const h = harness();
  await h.repo.log(base, "2026-06-04", 1);
  await h.repo.fail(base, "2026-06-04");
  assert.equal(h.saved().commitments[0].status, "broken");
  const [a, b] = await Promise.all([
    h.repo.restart(base, "new-a", "Low Energy", ""),
    h.repo.restart(base, "new-b", "Low Energy", ""),
  ]);
  assert.equal(a.attemptId, b.attemptId);
  assert.equal(a.previousAttemptId, "old");
  assert.equal(a.timeZone, "UTC");
  assert.equal(a.status, "active");
  const data = await h.repo.load();
  assert.equal(data.commitments.length, 2);
  assert.equal(
    data.commitments.find((c) => c.id === "old")?.reflection?.reason,
    "Low Energy",
  );
  assert.equal(data.checkIns[0].outcome, "missed");
  assert.equal(data.checkIns[0].attemptId, "old");
});
test("failed restart persistence leaves reflection and replacement absent", async () => {
  const h = harness(snapshot({ ...base, status: "broken" }));
  h.failWrite();
  await assert.rejects(
    h.repo.restart(base, "new", "", "Private note"),
    /disk full/,
  );
  assert.equal(h.saved().commitments.length, 1);
  assert.equal(h.saved().commitments[0].reflection, undefined);
});
test("weekly missed date stays active; quota fails only after period catch-up", async () => {
  const c: Commitment = { ...base, pace: { kind: "weekly", count: 3 } };
  const h = harness(snapshot(c));
  await h.repo.fail(c, "2026-06-04");
  assert.equal(h.saved().commitments[0].status, "active");
  h.tick(new Date("2026-06-11T23:59:59Z"));
  assert.equal((await h.repo.load()).commitments[0].status, "active");
  h.tick(new Date("2026-06-12T00:00:00Z"));
  assert.equal((await h.repo.load()).commitments[0].failureReason, "quota");
});
test("weekly period freezes while paused and resumes its remaining active dates", () => {
  const c: Commitment = { ...base, pace: { kind: "weekly", count: 3 } };
  pause(c, at("2026-06-06"));
  const data = snapshot(c, ["2026-06-04"]);
  reconcile(data, at("2026-06-20"));
  assert.equal(data.commitments[0].status, "paused");
  resume(data.commitments[0], at("2026-06-21"));
  assert.equal(endDate(data.commitments[0]), "2026-06-24");
  assert.equal(
    progress(data.commitments[0], data.checkIns, "2026-06-22").target,
    3,
  );
  reconcile(data, new Date("2026-06-26T00:00:00Z"));
  assert.equal(data.commitments[0].failureDate, "2026-06-24");
});
test("completion waits for final midnight; catch-up success unlocks reward", async () => {
  const c = { ...base, duration: 1 };
  const h = harness(snapshot(c));
  await h.repo.log(c, "2026-06-04", 1);
  assert.equal(h.saved().commitments[0].status, "active");
  h.tick(new Date("2026-06-05T00:00:00Z"));
  assert.equal((await h.repo.load()).commitments[0].status, "completed");
  const late = harness(snapshot(c));
  late.tick(at("2026-06-05"));
  assert.equal((await late.repo.load()).commitments[0].status, "active");
  await late.repo.log(c, "2026-06-04", 1);
  assert.equal(late.saved().commitments[0].status, "completed");
});
test("partial count expires and terminal attempts reject further writes", async () => {
  const c: Commitment = { ...base, pace: { kind: "daily", count: 10 } };
  const h = harness(snapshot(c));
  await h.repo.log(c, "2026-06-04", 3);
  h.tick(at("2026-06-06"));
  await assert.rejects(h.repo.log(c, "2026-06-06", 10));
  assert.equal(h.saved().commitments[0].status, "broken");
  assert.equal(h.saved().checkIns[0].count, 3);
});
test("rest dates cannot fail and do not interrupt a custom schedule streak", () => {
  const c: Commitment = { ...base, pace: { kind: "custom", days: [3, 5] } };
  const data = snapshot(c, ["2026-06-04", "2026-06-06"]);
  reconcile(data, at("2026-06-07"));
  assert.equal(data.commitments[0].status, "active");
  assert.equal(streak(c, data.checkIns, at("2026-06-07")).count, 2);
});
test("short weekly final quota must succeed before completion", () => {
  const c: Commitment = {
    ...base,
    duration: 3,
    pace: { kind: "weekly", count: 3 },
  };
  const data = snapshot(c, ["2026-06-04"]);
  reconcile(data, at("2026-06-07"));
  assert.equal(data.commitments[0].status, "active");
  data.checkIns.push({
    attemptId: c.attemptId,
    date: "2026-06-06",
    count: 1,
    updatedAt: at("2026-06-07").toISOString(),
  });
  reconcile(data, at("2026-06-07"));
  assert.equal(data.commitments[0].status, "completed");
});
