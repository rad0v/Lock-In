import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { clearReminders } from "../lib/notifications";

type Identity = {
  key: string;
  mode: "device" | "cloud";
  name: string;
  email?: string;
};
type Context = {
  identity: Identity | null;
  loading: boolean;
  error: string | null;
  enterDevice: () => Promise<void>;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<Context | null>(null);
const localSessionKey = "lockin.device-session.v1";
function cloudIdentity(session: Session): Identity {
  return {
    key: session.user.id,
    mode: "cloud",
    name:
      session.user.user_metadata?.full_name ||
      session.user.email?.split("@")[0] ||
      "",
    email: session.user.email,
  };
}

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      try {
        const local = await AsyncStorage.getItem(localSessionKey);
        const result = supabase ? await supabase.auth.getSession() : null;
        if (result?.error) throw result.error;
        if (alive)
          setIdentity(
            result?.data.session
              ? cloudIdentity(result.data.session)
              : local
                ? { key: "device", mode: "device", name: "" }
                : null,
          );
      } catch {
        if (alive)
          setError("Your session could not be restored. Please sign in again.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void initialize();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (session) {
        setIdentity(cloudIdentity(session));
        void AsyncStorage.removeItem(localSessionKey);
      } else
        setIdentity((current) => (current?.mode === "device" ? current : null));
    });
    return () => {
      alive = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  const enterDevice = async () => {
    await AsyncStorage.setItem(localSessionKey, "1");
    setError(null);
    setIdentity({ key: "device", mode: "device", name: "" });
  };
  const signOut = async () => {
    await clearReminders();
    if (identity?.mode === "cloud" && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error("Could not sign out. Please try again.");
      await AsyncStorage.multiRemove([
        `lockin.cache.${identity.key}`,
        `lockin.draft.${identity.key}`,
      ]);
    }
    await AsyncStorage.removeItem(localSessionKey);
    setIdentity(null);
  };
  return (
    <SessionContext.Provider
      value={{ identity, loading, error, enterDevice, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Missing SessionProvider");
  return value;
}
