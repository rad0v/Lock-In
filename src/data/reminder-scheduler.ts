import { type Reminder } from "../domain/reminders";
export type ReminderBackend = {
  list: () => Promise<{ id: string; key?: string }[]>;
  cancel: (id: string) => Promise<void>;
  schedule: (reminder: Reminder) => Promise<void>;
};
// Preserve existing requests; retry safely after a partial cancellation or schedule failure.
export function createReminderScheduler(backend: ReminderBackend) {
  let queue: Promise<unknown> = Promise.resolve();
  return (plan: Reminder[]) => {
    const task = queue.then(async () => {
      const existing = await backend.list();
      const wanted = new Map(plan.map((r) => [r.key, r]));
      const retained = new Set<string>();
      for (const item of existing) {
        if (!item.key?.startsWith("lockin:")) continue;
        if (!wanted.has(item.key) || retained.has(item.key))
          await backend.cancel(item.id);
        else retained.add(item.key);
      }
      for (const r of plan) if (!retained.has(r.key)) await backend.schedule(r);
    });
    queue = task.catch(() => {});
    return task;
  };
}
