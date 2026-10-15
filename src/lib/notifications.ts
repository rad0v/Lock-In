import { type Reminder } from "../domain/reminders";
export const notificationsSupported = false;
export async function notificationPermission(
  _request = false,
): Promise<boolean> {
  return false;
}
export async function syncReminders(_plan: Reminder[]): Promise<void> {}
export async function testReminder(): Promise<void> {
  throw new Error("Local reminders are available in the Android app.");
}
export async function clearReminders(): Promise<void> {}
export function listenForReminder(
  _onOpen: (attemptId: string, date: string) => void,
): () => void {
  return () => {};
}
