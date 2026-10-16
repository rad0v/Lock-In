import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = Boolean(url && key);

function projectUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:")
    throw new Error("Supabase project URL must use HTTPS.");
  return parsed.origin;
}

export type ClerkTokenGetter = () => Promise<string | null>;

export function createSupabaseClient(getToken: ClerkTokenGetter) {
  if (!url || !key) throw new Error("Cloud connection is not configured.");
  return createClient(projectUrl(url), key, {
    accessToken: getToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
