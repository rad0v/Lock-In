import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import {
  validateCheckIn,
  validateDraft,
  zone,
  type Commitment,
  type Snapshot,
} from "../domain/commitments";
import { createLocalRepository, type Repository } from "./local-repository";
export type { Repository } from "./local-repository";
export const localRepository = () => createLocalRepository(AsyncStorage);

export function cloudRepository(): Repository {
  const client = supabase;
  if (!client) throw new Error("Cloud connection is not configured.");
  return {
    pause: async () => {
      throw new Error("Cloud lifecycle connection is pending.");
    },
    resume: async () => {
      throw new Error("Cloud lifecycle connection is pending.");
    },
    fail: async () => {
      throw new Error("Cloud lifecycle connection is pending.");
    },
    restart: async () => {
      throw new Error("Cloud lifecycle connection is pending.");
    },
    load: async () => {
      const { data, error } = await client.rpc("lockin_snapshot");
      if (error)
        throw new Error(
          "Could not load your commitments. Reconnect and try again.",
        );
      return data as Snapshot;
    },
    create: async (draft, requestId) => {
      const problem = validateDraft(draft);
      if (problem) throw new Error(problem);
      const { data, error } = await client.rpc("lockin_create", {
        p_request_id: requestId,
        p_definition: { ...draft, timeZone: zone() },
      });
      if (error)
        throw new Error(
          "Your commitment was not saved. Check your connection and retry.",
        );
      return data as Commitment;
    },
    log: async (c, date, count) => {
      validateCheckIn(c, date, count);
      const { error } = await client.rpc("lockin_log", {
        p_attempt: c.attemptId,
        p_date: date,
        p_count: count,
      });
      if (error)
        throw new Error(
          "This check-in was not saved. Refresh and retry while its window is open.",
        );
    },
  };
}
