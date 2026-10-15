import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";
import { usePreferences } from "./preferences";
import { useData } from "./data";
import { reminderPlan } from "../domain/reminders";
import { validDate } from "../domain/commitments";
import {
  listenForReminder,
  notificationPermission,
  notificationsSupported,
  syncReminders,
} from "../lib/notifications";
const Context = createContext({ status: "", retry: () => {} });
export function ReminderProvider({ children }: React.PropsWithChildren) {
  const { preferences, ready } = usePreferences();
  const { snapshot, now, loading } = useData();
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const [status, setStatus] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (loading) return;
    return listenForReminder((attemptId, date) => {
      const c = latest.current.commitments.find(
        (c) => c.attemptId === attemptId,
      );
      if (c && validDate(date))
        router.push({
          pathname: "/commitment/[id]",
          params: { id: c.id, date },
        });
    });
  }, [loading]);
  useEffect(() => {
    if (!ready || loading || !notificationsSupported) return;
    let alive = true;
    void (async () => {
      const allowed = await notificationPermission();
      if (!alive) return;
      const plan =
        preferences.reminders && allowed
          ? reminderPlan(snapshot, preferences.reminderTime, now)
          : [];
      await syncReminders(plan);
      if (alive)
        setStatus(
          !preferences.reminders
            ? "Reminders are off."
            : !allowed
              ? "Notifications are blocked. Allow them in device settings."
              : plan.length
                ? `${plan.length} upcoming reminders scheduled.`
                : "No reminders are due. They’ll update when you check in or resume.",
        );
    })().catch(() => {
      if (alive)
        setStatus(
          "Reminders could not be updated. Retry to sync your schedule.",
        );
    });
    return () => {
      alive = false;
    };
  }, [snapshot, now, preferences, ready, loading, revision]);
  return (
    <Context.Provider
      value={{ status, retry: () => setRevision((v) => v + 1) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useReminders = () => useContext(Context);
