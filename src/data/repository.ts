import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient, type ClerkTokenGetter } from "../lib/supabase";
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

function cloudError(
  action: string,
  error: {
    code?: string;
    message: string;
    details?: string | null;
    hint?: string | null;
  },
) {
  if (__DEV__) {
    console.error(`LockIn cloud ${action} failed`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return new Error(
      `${action} failed${error.code ? ` [${error.code}]` : ""}: ${error.message}`,
    );
  }
  return new Error(`${action} failed. Please retry.`);
}

export function cloudRepository(getToken: ClerkTokenGetter): Repository {
  const client = createSupabaseClient(getToken);
  return {
    pause: async (c) => {
      const { error } = await client.rpc("lockin_pause", {
        p_attempt: c.attemptId,
      });
      if (error)
        throw new Error(
          "This commitment could not be paused. Refresh and retry.",
        );
    },
    resume: async (c) => {
      const { error } = await client.rpc("lockin_resume", {
        p_attempt: c.attemptId,
      });
      if (error)
        throw new Error(
          "This commitment could not be resumed. Refresh and retry.",
        );
    },
    fail: async (c, date) => {
      const { error } = await client.rpc("lockin_fail", {
        p_attempt: c.attemptId,
        p_date: date,
      });
      if (error)
        throw new Error("This outcome could not be saved. Refresh and retry.");
    },
    restart: async (c, requestId, reason, note) => {
      const { data, error } = await client.rpc("lockin_restart", {
        p_attempt: c.attemptId,
        p_request_id: requestId,
        p_reason: reason,
        p_note: note,
      });
      if (error)
        throw new Error("This restart could not be saved. Refresh and retry.");
      return data as Commitment;
    },
    load: async () => {
      const { data, error } = await client.rpc("lockin_snapshot");
      if (error) throw cloudError("Load commitments", error);
      return data as Snapshot;
    },
    create: async (draft, requestId) => {
      const problem = validateDraft(draft);
      if (problem) throw new Error(problem);
      const { data, error } = await client.rpc("lockin_create", {
        p_request_id: requestId,
        p_definition: { ...draft, timeZone: zone() },
      });
      if (error) throw cloudError("Save commitment", error);
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
