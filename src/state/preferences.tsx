import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureHaptics } from "../lib/feedback";

type Preferences = {
  haptics: boolean;
  motion: "system" | "reduced";
  reminders: boolean;
  reminderTime: string;
};
const defaults: Preferences = {
  haptics: true,
  motion: "system",
  reminders: false,
  reminderTime: "20:00",
};
const Context = createContext<{
  preferences: Preferences;
  ready: boolean;
  reduced: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
} | null>(null);
export function PreferencesProvider({ children }: React.PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [systemReduced, setSystemReduced] = useState(true);
  const value = useRef(defaults);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setSystemReduced(v);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduced,
    );
    void AsyncStorage.getItem("lockin.preferences.v1")
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {};
        const next = { ...defaults, ...saved };
        if (alive) {
          value.current = next;
          setPreferences(next);
          configureHaptics(next.haptics);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
      listener.remove();
    };
  }, []);
  const update = (patch: Partial<Preferences>) => {
    const operation = queue.current.then(async () => {
      const next = { ...value.current, ...patch };
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.reminderTime))
        throw new Error("Use a time like 20:00 (24-hour clock).");
      await AsyncStorage.setItem("lockin.preferences.v1", JSON.stringify(next));
      value.current = next;
      setPreferences(next);
      configureHaptics(next.haptics);
    });
    queue.current = operation.catch(() => {});
    return operation;
  };
  return (
    <Context.Provider
      value={{
        preferences,
        ready,
        reduced: systemReduced || preferences.motion === "reduced",
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing PreferencesProvider");
  return value;
}
