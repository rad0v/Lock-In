import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, useUser } from "@clerk/expo";
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
  getToken: () => Promise<string | null>;
  enterDevice: () => Promise<void>;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<Context | null>(null);
const localSessionKey = "lockin.device-session.v1";

export function SessionProvider({ children }: React.PropsWithChildren) {
  const auth = useAuth();
  const { user } = useUser();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      if (!auth.isLoaded) return;
      try {
        const local = await AsyncStorage.getItem(localSessionKey);
        if (!alive) return;
        if (auth.isSignedIn && auth.userId) {
          setIdentity({
            key: auth.userId,
            mode: "cloud",
            name: user?.fullName || user?.firstName || "",
            email: user?.primaryEmailAddress?.emailAddress,
          });
          await AsyncStorage.removeItem(localSessionKey);
        } else
          setIdentity(
            local ? { key: "device", mode: "device", name: "" } : null,
          );
        setError(null);
      } catch {
        if (alive)
          setError("Your session could not be restored. Please sign in again.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void initialize();
    return () => {
      alive = false;
    };
  }, [auth.isLoaded, auth.isSignedIn, auth.userId, user]);
  const enterDevice = async () => {
    await AsyncStorage.setItem(localSessionKey, "1");
    setError(null);
    setIdentity({ key: "device", mode: "device", name: "" });
  };
  const getToken = useCallback(() => auth.getToken(), [auth.getToken]);
  const signOut = async () => {
    await clearReminders();
    if (identity?.mode === "cloud") {
      await auth.signOut();
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
      value={{
        identity,
        loading: loading || !auth.isLoaded,
        error,
        getToken,
        enterDevice,
        signOut,
      }}
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
