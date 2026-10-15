import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button, Label, Screen } from "../../src/components/ui";
import { supabase } from "../../src/lib/supabase";
WebBrowser.maybeCompleteAuthSession();
export default function Callback() {
  const { code, recovery } = useLocalSearchParams<{
    code?: string;
    recovery?: string;
  }>();
  const [error, setError] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const finish = async () => {
      if (!code || !supabase) return setError(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setError(true);
      else
        router.replace(recovery === "1" ? "/reset-password?recovery=1" : "/");
    };
    void finish();
  }, [code, recovery]);
  return (
    <Screen contentStyle={{ justifyContent: "center", gap: 24 }}>
      <Label>
        {error
          ? "This sign-in link could not be completed. Request a new link and try again."
          : "Finishing sign-in…"}
      </Label>
      {error && (
        <Button
          title="BACK TO SIGN IN"
          onPress={() => router.replace("/sign-in")}
        />
      )}
    </Screen>
  );
}
