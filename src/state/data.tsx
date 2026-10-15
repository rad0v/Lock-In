import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { feedback } from "../lib/feedback";
import { useSession } from "./session";
import { cloudRepository, localRepository } from "../data/repository";
import {
  emptySnapshot,
  type Snapshot,
  type Commitment,
  type Draft,
} from "../domain/commitments";

type Context = {
  snapshot: Snapshot;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  now: Date;
  refresh: () => Promise<void>;
  create: (draft: Draft, id: string) => Promise<Commitment>;
  log: (c: Commitment, date: string, count: number) => Promise<void>;
  pause: (c: Commitment) => Promise<void>;
  resume: (c: Commitment) => Promise<void>;
  fail: (c: Commitment, date: string) => Promise<void>;
  restart: (
    c: Commitment,
    id: string,
    reason: string,
    note: string,
  ) => Promise<Commitment>;
};
const DataContext = createContext<Context | null>(null);
export function DataProvider({ children }: React.PropsWithChildren) {
  const { identity } = useSession();
  const repository = useMemo(
    () => (identity?.mode === "cloud" ? cloudRepository() : localRepository()),
    [identity?.key, identity?.mode],
  );
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const alive = useRef(true);
  const revision = useRef(0);
  const previous = useRef<Snapshot | null>(null);
  const cacheKey = `lockin.cache.${identity?.key}`;
  const load = useCallback(async () => {
    const current = ++revision.current;
    setRefreshing(true);
    try {
      const data = await repository.load();
      if (alive.current && current === revision.current) {
        setSnapshot(data);
        if (
          previous.current &&
          data.commitments.some(
            (c) =>
              c.status === "completed" &&
              previous.current!.commitments.some(
                (old) =>
                  old.attemptId === c.attemptId && old.status !== "completed",
              ),
          )
        )
          feedback("success");
        previous.current = data;
        setError(null);
        setNow(new Date());
        if (identity?.mode === "cloud")
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(
            () => {},
          );
      }
    } catch {
      if (alive.current && current === revision.current)
        setError(
          "Could not refresh your commitments. Your last saved data is shown.",
        );
    } finally {
      if (alive.current && current === revision.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [repository, cacheKey, identity?.mode]);
  useEffect(() => {
    alive.current = true;
    const init = async () => {
      if (identity?.mode === "cloud") {
        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw && alive.current && revision.current === 0)
            setSnapshot(JSON.parse(raw));
        } catch {
          /* Network load can still recover. */
        }
      }
      await load();
    };
    void init();
    const timer = setInterval(() => {
      if (AppState.currentState === "active" || AppState.currentState == null)
        void load();
    }, 30000);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      foreground.remove();
    };
  }, [load, cacheKey, identity?.mode]);
  const create = async (draft: Draft, id: string) => {
    const result = await repository.create(draft, id);
    feedback("success");
    if (alive.current)
      setSnapshot((data) => ({
        ...data,
        commitments: data.commitments.some((c) => c.id === result.id)
          ? data.commitments
          : [result, ...data.commitments],
      }));
    await load();
    return result;
  };
  const log = async (c: Commitment, date: string, count: number) => {
    try {
      await repository.log(c, date, count);
    } catch (e) {
      await load();
      throw e;
    }
    if (count >= (c.pace.kind === "daily" ? c.pace.count : 1))
      feedback("success");
    if (alive.current)
      setSnapshot((data) => ({
        ...data,
        checkIns: [
          ...data.checkIns.filter(
            (l) => l.attemptId !== c.attemptId || l.date !== date,
          ),
          {
            attemptId: c.attemptId,
            date,
            count,
            updatedAt: new Date().toISOString(),
          },
        ],
      }));
    await load();
  };
  const transition = async (
    action: () => Promise<void>,
    kind: "selection" | "warning" = "selection",
  ) => {
    try {
      await action();
      feedback(kind);
    } finally {
      await load();
    }
  };
  return (
    <DataContext.Provider
      value={{
        snapshot,
        loading,
        refreshing,
        error,
        now,
        refresh: load,
        create,
        log,
        pause: (c) => transition(() => repository.pause(c)),
        resume: (c) => transition(() => repository.resume(c)),
        fail: (c, date) =>
          transition(() => repository.fail(c, date), "warning"),
        restart: async (c, id, reason, note) => {
          try {
            const next = await repository.restart(c, id, reason, note);
            feedback("success");
            return next;
          } finally {
            await load();
          }
        },
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
export function useData() {
  const c = useContext(DataContext);
  if (!c) throw new Error("Missing DataProvider");
  return c;
}
