import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { SessionProvider, useSession } from "../src/state/session";
import { color } from "../src/theme";
import { PreferencesProvider, usePreferences } from "../src/state/preferences";

void SplashScreen.preventAutoHideAsync();
function Routes() {
  const { identity, loading } = useSession();
  const { reduced } = usePreferences();
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.canvas.setup,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={color.ink.primary} />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.canvas.focus },
        animation: reduced ? "none" : "slide_from_right",
        animationDuration: 220,
      }}
    >
      <Stack.Protected guard={!!identity}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!identity}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="sso-callback" />
    </Stack>
  );
}
export default function Root() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded && !error) return null;
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey)
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.");
  return (
    <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PreferencesProvider>
          <SessionProvider>
            <Routes />
          </SessionProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
