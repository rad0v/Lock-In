import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Label, Screen } from "../src/components/ui";
import { useSession } from "../src/state/session";

export default function SSOCallback() {
  const { identity, loading } = useSession();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!loading && identity?.mode === "cloud") router.replace("/");
  }, [identity?.mode, loading]);

  useEffect(() => {
    const timeout = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Screen contentStyle={{ justifyContent: "center", gap: 24 }}>
      <Label>Finishing Google sign-in…</Label>
      {showRetry && !loading && !identity && (
        <Button
          title="BACK TO SIGN IN"
          onPress={() => router.replace("/sign-in")}
        />
      )}
    </Screen>
  );
}
