import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Legacy Supabase Auth preparation is disabled. Next integration uses Clerk JWTs.
// Do not enable this client with auth.uid() policies for Clerk string subjects.
export const cloudConfigured = false;
export const supabase =
  cloudConfigured && url && key
    ? createClient(url, key, {
        auth: {
          storage:
            Platform.OS === "web"
              ? AsyncStorage
              : {
                  getItem: SecureStore.getItemAsync,
                  setItem: SecureStore.setItemAsync,
                  removeItem: SecureStore.deleteItemAsync,
                },
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
