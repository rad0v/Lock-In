import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { isClerkAPIResponseError, useSignIn } from "@clerk/expo";
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

type Step = "email" | "code" | "password" | "done";

function clerkMessage(error: unknown) {
  if (isClerkAPIResponseError(error))
    return (
      error.errors[0]?.longMessage ||
      error.errors[0]?.message ||
      "Could not finish this request. Please retry."
    );
  if (error && typeof error === "object" && "message" in error)
    return String(error.message);
  return "Could not finish this request. Please retry.";
}

export default function ResetPassword() {
  const flow = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (step === "email" && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("Enter your email address.");
    if (step === "code" && !/^\d{6}$/.test(code.trim()))
      return setError("Enter the 6-digit code from your email.");
    if (step === "password" && (password.length < 8 || password !== confirm))
      return setError("Use matching passwords with at least 8 characters.");
    setBusy(true);
    try {
      if (step === "email") {
        const created = await flow.signIn.create({
          identifier: email.trim(),
        });
        if (created.error) throw created.error;
        const sent = await flow.signIn.resetPasswordEmailCode.sendCode();
        if (sent.error) throw sent.error;
        setStep("code");
      } else if (step === "code") {
        const result = await flow.signIn.resetPasswordEmailCode.verifyCode({
          code: code.trim(),
        });
        if (result.error) throw result.error;
        setStep("password");
      } else if (step === "password") {
        const result = await flow.signIn.resetPasswordEmailCode.submitPassword({
          password,
        });
        if (result.error) throw result.error;
        const finalized = await flow.signIn.finalize();
        if (finalized.error) throw finalized.error;
        setStep("done");
      }
    } catch (cause) {
      setError(clerkMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "email"
      ? "Reset your password"
      : step === "code"
        ? "Check your email"
        : step === "password"
          ? "Set a new password"
          : "Password updated";

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
        <Title>{title}</Title>
        <View style={{ gap: 20, marginTop: 32 }}>
          {step === "email" && (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          )}
          {step === "code" && (
            <>
              <Label>Enter the 6-digit code sent to {email.trim()}.</Label>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
            </>
          )}
          {step === "password" && (
            <>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />
            </>
          )}
          {!!error && <ErrorNote message={error} />}
          {step === "done" ? (
            <Button title="CONTINUE" onPress={() => router.replace("/")} />
          ) : (
            <Button
              title={
                step === "email"
                  ? "SEND RESET CODE"
                  : step === "code"
                    ? "VERIFY CODE"
                    : "UPDATE PASSWORD"
              }
              loading={busy}
              onPress={() => void submit()}
            />
          )}
        </View>
      </Panel>
    </Screen>
  );
}
