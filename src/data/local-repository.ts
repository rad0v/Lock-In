import {
  emptySnapshot,
  validateCheckIn,
  validateDraft,
  zone,
  type Draft,
  type Snapshot,
  type Commitment,
} from "../domain/commitments";
import {
  event,
  reconcile,
  pause,
  resume,
  fail,
  restart,
} from "../domain/lifecycle";

export type Repository = {
  load: () => Promise<Snapshot>;
  create: (draft: Draft, requestId: string) => Promise<Commitment>;
  log: (commitment: Commitment, date: string, count: number) => Promise<void>;
  pause: (c: Commitment) => Promise<void>;
  resume: (c: Commitment) => Promise<void>;
  fail: (c: Commitment, date: string) => Promise<void>;
  restart: (
    c: Commitment,
    requestId: string,
    reason: string,
    note: string,
  ) => Promise<Commitment>;
};
export type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
const localKey = "lockin.device-data.v1";

export function createLocalRepository(
  storage: Storage,
  now = () => new Date(),
): Repository {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<Snapshot> => {
    const raw = await storage.getItem(localKey);
    return raw ? JSON.parse(raw) : structuredCopy(emptySnapshot);
  };
  const change = <T>(fn: (data: Snapshot) => T): Promise<T> => {
    const operation = queue.then(async () => {
      const data = await read();
      // Expiry must persist even when the requested action is now invalid.
      if (reconcile(data, now()))
        await storage.setItem(localKey, JSON.stringify(data));
      const before = JSON.stringify(data);
      const result = fn(data);
      reconcile(data, now());
      const after = JSON.stringify(data);
      if (after !== before) await storage.setItem(localKey, after);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  };
  const actual = (data: Snapshot, c: Commitment) => {
    const found = data.commitments.find((x) => x.attemptId === c.attemptId);
    if (!found) throw new Error("This commitment is no longer available.");
    return found;
  };
  return {
    load: () => change((data) => data),
    pause: (c) => change((data) => pause(actual(data, c), now())),
    resume: (c) => change((data) => resume(actual(data, c), now())),
    fail: (c, date) =>
      change((data) => fail(data, actual(data, c), date, now())),
    restart: (c, id, reason, note) =>
      change((data) => restart(data, actual(data, c), id, reason, note, now())),
    create: (draft, requestId) =>
      change((data) => {
        const existing = data.commitments.find((c) => c.id === requestId);
        if (existing) return existing;
        const problem = validateDraft(draft, now());
        if (problem) throw new Error(problem);
        const c: Commitment = {
          ...draft,
          path: draft.path!,
          name: draft.name.trim(),
          description: draft.description.trim(),
          reward: draft.reward.trim(),
          id: requestId,
          attemptId: requestId,
          status: "active",
          timeZone: zone(),
          createdAt: now().toISOString(),
        };
        event(c, "locked", now(), c.startDate);
        data.commitments.unshift(c);
        return c;
      }),
    log: (c, date, count) =>
      change((data) => {
        const actual = data.commitments.find(
          (x) => x.attemptId === c.attemptId,
        );
        if (!actual) throw new Error("This commitment is no longer available.");
        validateCheckIn(actual, date, count, now());
        const next = {
          attemptId: c.attemptId,
          date,
          count,
          outcome:
            count >= (actual.pace.kind === "daily" ? actual.pace.count : 1)
              ? ("success" as const)
              : ("partial" as const),
          updatedAt: now().toISOString(),
        };
        const i = data.checkIns.findIndex(
          (l) => l.attemptId === c.attemptId && l.date === date,
        );
        if (i < 0) data.checkIns.push(next);
        else data.checkIns[i] = next;
      }),
  };
}
function structuredCopy<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}
