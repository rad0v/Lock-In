import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  ErrorNote,
  Field,
  Header,
  Label,
  Panel,
  Screen,
  Title,
} from "../src/components/ui";
import { supabase } from "../src/lib/supabase";
import { redirectUri } from "../src/screens/AuthScreen";
export default function ResetPassword() {
  const { recovery } = useLocalSearchParams<{ recovery?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submit = async () => {
    setError("");
    if (!supabase) return setError("Account recovery is not connected yet.");
    if (recovery === "1" && (password.length < 8 || password !== confirm))
      return setError("Use matching passwords with at least 8 characters.");
    if (recovery !== "1" && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("Enter your email address.");
    setBusy(true);
    try {
      const result =
        recovery === "1"
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.resetPasswordForEmail(email.trim(), {
              redirectTo: redirectUri() + "?recovery=1",
            });
      if (result.error) throw result.error;
      setMessage(
        recovery === "1"
          ? "Password updated. You can continue to LockIn."
          : "If an account exists, a reset link is on its way.",
      );
    } catch {
      setError("Could not finish this request. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      setup
      header={
        <Header
          back
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/sign-in")
          }
        />
      }
    >
      <Panel style={{ marginTop: 48 }}>
        <Title>
          {recovery === "1" ? "Set a new password" : "Reset your password"}
        </Title>
        <View style={{ gap: 20, marginTop: 32 }}>
          {recovery === "1" ? (
            <>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </>
          ) : (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
          {!!error && <ErrorNote message={error} />}{" "}
          {!!message && <Label>{message}</Label>}
          <Button
            title={recovery === "1" ? "UPDATE PASSWORD" : "SEND RESET LINK"}
            loading={busy}
            onPress={() => void submit()}
          />
          {recovery === "1" && message && (
            <Button
              light
              title="CONTINUE"
              onPress={() => router.replace("/")}
            />
          )}
        </View>
      </Panel>
    </Screen>
  );
}
