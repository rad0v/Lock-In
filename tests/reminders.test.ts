import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reminderInstant,
  reminderPlan,
  type Reminder,
} from "../src/domain/reminders";
import { createReminderScheduler } from "../src/data/reminder-scheduler";
import { type Commitment, type Snapshot } from "../src/domain/commitments";
const c: Commitment = {
  id: "one",
  attemptId: "one",
  name: "Private target",
  description: "",
  path: "build",
  reward: "Coffee",
  pace: { kind: "daily", count: 1 },
  startDate: "2026-06-04",
  duration: 7,
  timeZone: "Asia/Kolkata",
  status: "active",
  createdAt: "2026-06-04T00:00:00Z",
};
const now = new Date("2026-06-04T06:00:00Z");
const data: Snapshot = { commitments: [c], checkIns: [] };
test("reminders use attempt timezone, stop at unresolved expiry, and deduplicate same-time nudges", () => {
  const plan = reminderPlan(data, "20:00", now);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].at, Date.parse("2026-06-04T14:30:00Z"));
  assert.equal(plan[1].at, Date.parse("2026-06-05T14:30:00Z"));
  assert.equal(plan[1].date, "2026-06-04");
});
test("saving progress cancels obsolete nudges and opens the next schedule", () => {
  const done = {
    ...data,
    checkIns: [
      {
        attemptId: "one",
        date: "2026-06-04",
        count: 1,
        updatedAt: now.toISOString(),
      },
    ],
  };
  const plan = reminderPlan(done, "20:00", now);
  assert.equal(
    plan.some((r) => r.date === "2026-06-04"),
    false,
  );
  assert.equal(plan[0].date, "2026-06-05");
});
test("paused and terminal attempts schedule nothing; rest dates are skipped", () => {
  for (const status of ["paused", "broken", "completed"] as const)
    assert.deepEqual(
      reminderPlan({ ...data, commitments: [{ ...c, status }] }, "20:00", now),
      [],
    );
  const plan = reminderPlan(
    { ...data, commitments: [{ ...c, pace: { kind: "custom", days: [0] } }] },
    "20:00",
    now,
  );
  assert.equal(plan[0].date, "2026-06-08");
});
test("weekly reminders skip successful dates and stop after quota is met", () => {
  const weekly: Commitment = { ...c, pace: { kind: "weekly", count: 1 } };
  assert.deepEqual(
    reminderPlan(
      {
        commitments: [weekly],
        checkIns: [
          {
            attemptId: "one",
            date: "2026-06-04",
            count: 1,
            updatedAt: now.toISOString(),
          },
        ],
      },
      "20:00",
      now,
    ),
    [],
  );
});
test("wall-clock reminder time survives DST and nonexistent time is skipped", () => {
  assert.equal(
    reminderInstant("2026-03-08", "20:00", "America/New_York"),
    Date.parse("2026-03-09T00:00:00Z"),
  );
  assert.equal(
    reminderInstant("2026-11-01", "20:00", "America/New_York"),
    Date.parse("2026-11-02T01:00:00Z"),
  );
  assert.equal(
    Number.isNaN(reminderInstant("2026-03-08", "02:30", "America/New_York")),
    true,
  );
});
test("scheduler retains matching requests, cancels stale ones, and clears only its own requests", async () => {
  const pending = new Map([
    ["unrelated", "other"],
    ["old", "lockin:old"],
  ]);
  let scheduled = 0;
  const sync = createReminderScheduler({
    list: async () => [...pending].map(([id, key]) => ({ id, key })),
    cancel: async (id) => {
      pending.delete(id);
    },
    schedule: async (r) => {
      scheduled++;
      pending.set(r.key, r.key);
    },
  });
  const plan = reminderPlan(data, "20:00", now);
  await Promise.all([sync(plan), sync(plan)]);
  assert.equal(scheduled, plan.length);
  assert.equal(pending.has("old"), false);
  await sync([]);
  assert.deepEqual([...pending], [["unrelated", "other"]]);
});
test("scheduler recovers after partial scheduling failure without duplicates", async () => {
  const pending = new Map<string, string>();
  let failOnce = true;
  const sync = createReminderScheduler({
    list: async () => [...pending].map(([id, key]) => ({ id, key })),
    cancel: async (id) => {
      pending.delete(id);
    },
    schedule: async (r) => {
      if (pending.size === 1 && failOnce) {
        failOnce = false;
        throw new Error("native error");
      }
      pending.set(r.key, r.key);
    },
  });
  const plan = reminderPlan(data, "20:00", now);
  await assert.rejects(sync(plan));
  await sync(plan);
  assert.equal(pending.size, plan.length);
});
