import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  canLog,
  dateInZone,
  deadline,
  dueRows,
  endDate,
  freshDraft,
  progress,
  validateDraft,
  weeklyPeriod,
  type Commitment,
} from "../src/domain/commitments";
import {
  createLocalRepository,
  type Storage,
} from "../src/data/local-repository";

const now = new Date("2026-06-05T06:30:00Z");
const commitment: Commitment = {
  id: "c1",
  attemptId: "a1",
  path: "build",
  name: "Yoga",
  description: "",
  startDate: "2026-06-04",
  duration: 7,
  pace: { kind: "daily", count: 1 },
  reward: "Coffee",
  timeZone: "Asia/Kolkata",
  status: "active",
  createdAt: "2026-06-04T01:00:00Z",
};
function storage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) || null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
  };
}
function validDraft() {
  return {
    ...freshDraft(now),
    path: "build" as const,
    name: "Yoga",
    startDate: "2026-06-05",
    reward: "Coffee",
  };
}
test("inclusive durations cross month boundaries correctly", () => {
  assert.equal(endDate({ ...commitment, duration: 45 }), "2026-07-18");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("logical dates follow the attempt zone rather than UTC", () => {
  assert.equal(
    dateInZone(new Date("2026-06-04T20:00:00Z"), "Asia/Kolkata"),
    "2026-06-05",
  );
});
test("catch-up belongs to yesterday and ends at an exact boundary", () => {
  assert.equal(
    deadline(commitment, "2026-06-04"),
    Date.parse("2026-06-05T18:30:00Z"),
  );
  assert.equal(canLog(commitment, "2026-06-04", now), true);
  assert.equal(
    canLog(commitment, "2026-06-04", new Date("2026-06-05T18:30:00Z")),
    false,
  );
});
test("grace remains 24 elapsed hours across daylight saving", () => {
  const c = {
    ...commitment,
    timeZone: "America/New_York",
    startDate: "2026-03-07",
  };
  assert.equal(deadline(c, "2026-03-07"), Date.parse("2026-03-09T05:00:00Z"));
});
test("future, rest, and terminal dates cannot be logged", () => {
  assert.equal(canLog(commitment, "2026-06-06", now), false);
  assert.equal(
    canLog(
      { ...commitment, pace: { kind: "custom", days: [0, 2] } },
      "2026-06-05",
      now,
    ),
    false,
  );
  assert.equal(
    canLog({ ...commitment, status: "broken" }, "2026-06-05", now),
    false,
  );
});
test("partial weekly periods round up and count distinct successful dates", () => {
  const c = {
    ...commitment,
    duration: 10,
    pace: { kind: "weekly" as const, count: 3 },
  };
  assert.deepEqual(weeklyPeriod(c, "2026-06-12"), {
    start: "2026-06-11",
    end: "2026-06-13",
    required: 2,
  });
  const entries = ["2026-06-11", "2026-06-11", "2026-06-12"].map((date) => ({
    attemptId: "a1",
    date,
    count: 1,
    updatedAt: now.toISOString(),
  }));
  assert.deepEqual(progress(c, entries, "2026-06-12"), {
    count: 2,
    target: 2,
    done: true,
  });
});
test("today plus unfinished catch-up appear without already-complete yesterday", () => {
  const rows = dueRows(
    {
      commitments: [commitment],
      checkIns: [
        {
          attemptId: "a1",
          date: "2026-06-04",
          count: 1,
          updatedAt: now.toISOString(),
        },
      ],
    },
    now,
  );
  assert.deepEqual(
    rows.map((r) => r.date),
    ["2026-06-05"],
  );
});
test("a custom schedule must contain an actual due date within the duration", () => {
  const draft = {
    ...validDraft(),
    duration: 1,
    pace: { kind: "custom" as const, days: [0] },
  };
  assert.match(validateDraft(draft, now)!, /occur/);
});
test("invalid dates, counts and oversized inputs fail before storage", () => {
  assert.match(
    validateDraft({ ...validDraft(), startDate: "2026-02-30" }, now)!,
    /start date/,
  );
  assert.match(
    validateDraft(
      { ...validDraft(), pace: { kind: "weekly", count: 8 } },
      now,
    )!,
    /target/,
  );
  assert.match(
    validateDraft({ ...validDraft(), name: "x".repeat(81) }, now)!,
    /80/,
  );
});
test("lock retries are idempotent and a new repository reloads saved data", async () => {
  const memory = storage();
  const repo = createLocalRepository(memory, () => now);
  const [a, b] = await Promise.all([
    repo.create(validDraft(), "request-1"),
    repo.create(validDraft(), "request-1"),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(
    (await createLocalRepository(memory, () => now).load()).commitments.length,
    1,
  );
});
test("concurrent check-ins serialize and retrying an absolute count gives no extra credit", async () => {
  const repo = createLocalRepository(storage(), () => now);
  const c = await repo.create(
    { ...validDraft(), pace: { kind: "daily", count: 10 } },
    "request-2",
  );
  await Promise.all([
    repo.log(c, "2026-06-05", 3),
    repo.log(c, "2026-06-05", 3),
  ]);
  const snapshot = await repo.load();
  assert.equal(snapshot.checkIns.length, 1);
  assert.equal(snapshot.checkIns[0].count, 3);
});
test("failed persistence rejects rather than claiming a successful lock", async () => {
  const memory: Storage = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error("disk unavailable");
    },
  };
  await assert.rejects(
    createLocalRepository(memory, () => now).create(validDraft(), "request-3"),
    /disk unavailable/,
  );
});
test("a failed queued write does not poison subsequent writes", async () => {
  const memory = storage();
  const repo = createLocalRepository(memory, () => now);
  await assert.rejects(repo.create({ ...validDraft(), name: "" }, "bad"));
  await repo.create(validDraft(), "good");
  assert.equal((await repo.load()).commitments.length, 1);
});
test("out-of-window and excessive counts leave saved logs unchanged", async () => {
  const repo = createLocalRepository(storage(), () => now);
  const c = await repo.create(validDraft(), "request-4");
  await assert.rejects(repo.log(c, "2026-06-05", 2));
  await assert.rejects(repo.log(c, "2026-06-06", 1));
  assert.equal((await repo.load()).checkIns.length, 0);
});
