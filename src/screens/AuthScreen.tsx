import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { isClerkAPIResponseError, useSignIn, useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import Svg, { Path } from "react-native-svg";
import {
  Brand,
  Button,
  Divider,
  ErrorNote,
  Field,
  Label,
  ModalCard,
  Screen,
  Title,
} from "../components/ui";
import { color } from "../theme";
import { cloudConfigured } from "../lib/supabase";
import { useSession } from "../state/session";

WebBrowser.maybeCompleteAuthSession();

function clerkMessage(error: unknown, fallback: string) {
  if (isClerkAPIResponseError(error))
    return error.errors[0]?.longMessage || error.errors[0]?.message || fallback;
  if (error && typeof error === "object" && "message" in error)
    return String(error.message);
  return fallback;
}
function GoogleMark() {
  return (
    <Svg width={19} height={19} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.9 6-14.9Z"
      />
      <Path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5c-1.9 1.2-4.2 2-6.8 2-5.3 0-9.7-3.5-11.3-8.2H5.8v5.2C9.2 39.5 16.1 44 24 44Z"
      />
      <Path
        fill="#FBBC05"
        d="M12.7 27.9a12 12 0 0 1 0-7.8v-5.2H5.8a20 20 0 0 0 0 18.2l6.9-5.2Z"
      />
      <Path
        fill="#EA4335"
        d="M24 11.9c3 0 5.6 1 7.7 3l5.8-5.8A19.3 19.3 0 0 0 24 4C16.1 4 9.2 8.5 5.8 14.9l6.9 5.2A12 12 0 0 1 24 11.9Z"
      />
    </Svg>
  );
}
export default function AuthScreen({ signup = false }: { signup?: boolean }) {
  const { enterDevice, error: sessionError } = useSession();
  const signInFlow = useSignIn();
  const signUpFlow = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState(false);
  const submit = async () => {
    setError("");
    setMessage("");
    if (awaitingCode) {
      if (!/^\d{6}$/.test(code.trim()))
        return setError("Enter the 6-digit code from your email.");
      setBusy(true);
      try {
        const result = await signUpFlow.signUp.verifications.verifyEmailCode({
          code: code.trim(),
        });
        if (result.error) throw result.error;
        await signUpFlow.signUp.finalize();
      } catch (cause) {
        setError(
          clerkMessage(cause, "That code could not be verified. Try again."),
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("Enter a valid email address.");
    if (password.length < 8)
      return setError("Use a password with at least 8 characters.");
    if (signup && password !== confirm)
      return setError("Your passwords do not match.");
    setBusy(true);
    try {
      if (signup) {
        const result = await signUpFlow.signUp.password({
          emailAddress: email.trim(),
          password,
        });
        if (result.error) throw result.error;
        const sent = await signUpFlow.signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
        setAwaitingCode(true);
        setMessage("We sent a 6-digit verification code to your email.");
      } else {
        const result = await signInFlow.signIn.password({
          emailAddress: email.trim(),
          password,
        });
        if (result.error) throw result.error;
        const finalized = await signInFlow.signIn.finalize();
        if (finalized.error) throw finalized.error;
      }
    } catch (cause) {
      setError(
        clerkMessage(
          cause,
          signup
            ? "Could not create your account. Check your details and try again."
            : "Could not sign in. Check your email and password, then retry.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: makeRedirectUri({
          scheme: "lockin",
          path: "sso-callback",
        }),
      });
      if (
        !result.createdSessionId &&
        result.authSessionResult?.type !== "cancel"
      )
        throw new Error("Google sign-in is incomplete.");
    } catch (cause) {
      setError(
        clerkMessage(
          cause,
          "Google sign-in could not finish. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen setup contentStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
        }}
      >
        <Brand />
        <Pressable
          accessibilityRole="button"
          onPress={() => setLanguage(true)}
          style={{
            backgroundColor: color.surface.panel,
            borderRadius: 30,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Label size={12}>◎ English⌄</Label>
        </Pressable>
      </View>
      <View
        style={{
          flex: 1,
          minHeight: signup ? 80 : 170,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 44,
          paddingHorizontal: 20,
        }}
      >
        <Title style={{ textAlign: "center" }}>
          {signup ? "Start a new promise." : "Ready to Lock In?"}
        </Title>
        <Label
          style={{
            textAlign: "center",
            marginTop: 12,
            color: color.ink.secondary,
          }}
        >
          {signup
            ? "Build your focus. Keep a promise to yourself."
            : "Authenticate your credentials to access your parameters, lock focus, and secure your active streaks."}
        </Label>
      </View>
      <View
        style={{
          backgroundColor: color.surface.panel,
          borderRadius: 36,
          padding: 24,
          borderBottomWidth: 1,
          borderLeftWidth: 0.5,
          borderColor: "#9D9994",
          gap: 16,
        }}
      >
        {awaitingCode ? (
          <Field
            pill
            placeholder="6-digit verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
        ) : (
          <>
            <Field
              pill
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              pill
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={signup ? "new-password" : "current-password"}
            />
            {signup && (
              <Field
                pill
                placeholder="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            )}
          </>
        )}
        {(error || sessionError) && (
          <ErrorNote message={error || sessionError!} />
        )}
        {!!message && (
          <Label size={13} style={{ color: color.success.foreground }}>
            {message}
          </Label>
        )}
        <View style={{ marginTop: 8 }}>
          <Button
            title={
              awaitingCode
                ? "VERIFY EMAIL"
                : signup
                  ? "START MY PROMISE"
                  : "ENTER FOCUS MODE"
            }
            onPress={() => void submit()}
            loading={busy}
          />
        </View>
        {!awaitingCode && (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace(signup ? "/sign-in" : "/sign-up")}
          >
            <Label size={12} style={{ textAlign: "center" }}>
              {signup ? "Already have an account? " : "New here? "}
              <Label size={12} style={{ textDecorationLine: "underline" }}>
                {signup ? "Sign in." : "Start a new promise."}
              </Label>
            </Label>
          </Pressable>
        )}
        {!signup && cloudConfigured && (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/reset-password")}
          >
            <Label
              size={12}
              style={{ textAlign: "center", textDecorationLine: "underline" }}
            >
              Forgot password?
            </Label>
          </Pressable>
        )}
        {!awaitingCode && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
            <View
              style={{
                height: 1,
                flex: 1,
                backgroundColor: color.surface.card,
              }}
            />
            <Label size={11} muted>
              OR
            </Label>
            <View
              style={{
                height: 1,
                flex: 1,
                backgroundColor: color.surface.card,
              }}
            />
          </View>
        )}
        {!awaitingCode && (
          <Pressable
            onPress={() => void google()}
            disabled={busy}
            accessibilityRole="button"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 40,
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0px 4px 3px rgba(37,31,26,0.25)",
            }}
          >
            <GoogleMark />
            <Label size={13} bold>
              Continue with Google
            </Label>
          </Pressable>
        )}
        {!awaitingCode && (
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={() => {
              setBusy(true);
              void enterDevice().catch(() => {
                setError("Could not open local storage. Please try again.");
                setBusy(false);
              });
            }}
            style={{ paddingTop: 4, paddingBottom: 4 }}
          >
            <Label
              size={12}
              style={{ textAlign: "center", textDecorationLine: "underline" }}
            >
              Continue on this device
            </Label>
          </Pressable>
        )}
        {!awaitingCode && (
          <Label size={11} muted style={{ textAlign: "center" }}>
            Your commitments stay on this device.
          </Label>
        )}
      </View>
      <ModalCard
        title="Language"
        visible={language}
        onClose={() => setLanguage(false)}
      >
        <Button title="English ✓" onPress={() => setLanguage(false)} light />
      </ModalCard>
    </Screen>
  );
}
