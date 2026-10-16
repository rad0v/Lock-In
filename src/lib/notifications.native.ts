import Constants from "expo-constants";
import { Platform } from "react-native";
import { createReminderScheduler } from "../data/reminder-scheduler";
type NotificationApi = typeof import("expo-notifications");
// Expo Go can have an older native notifications binary than this project's
// installed JS package. Loading the package there crashes route evaluation.
export const notificationsSupported = Constants.appOwnership !== "expo";
const channelId = "lockin-reminders";
let loaded: NotificationApi | null = null;
function notifications(): NotificationApi {
  if (!notificationsSupported)
    throw new Error("Reminders require a LockIn development build on Android.");
  if (!loaded) {
    loaded = require("expo-notifications") as NotificationApi;
    loaded.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return loaded;
}
async function channel() {
  if (Platform.OS === "android")
    await notifications().setNotificationChannelAsync(channelId, {
      name: "Commitment reminders",
      importance: notifications().AndroidImportance.DEFAULT,
      enableVibrate: false,
      sound: null,
      lockscreenVisibility: notifications().AndroidNotificationVisibility.PRIVATE,
    });
}
export async function notificationPermission(
  request = false,
): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (request) await channel();
  let permission = await notifications().getPermissionsAsync();
  if (!permission.granted && request && permission.canAskAgain)
    permission = await notifications().requestPermissionsAsync();
  return permission.granted;
}
export const syncReminders = createReminderScheduler({
  list: async () =>
    (await notifications().getAllScheduledNotificationsAsync()).map((n) => ({
      id: n.identifier,
      key: n.content.data?.lockinKey as string | undefined,
    })),
  cancel: (id) => notifications().cancelScheduledNotificationAsync(id),
  schedule: async (r) => {
    await channel();
    await notifications().scheduleNotificationAsync({
      identifier: r.key,
      content: {
        title: "A moment to LockIn",
        body: "Your commitment is waiting. Open LockIn to check in.",
        data: { lockinKey: r.key, attemptId: r.attemptId, date: r.date },
      },
      trigger: {
        type: notifications().SchedulableTriggerInputTypes.DATE,
        date: new Date(r.at),
        channelId,
      },
    });
  },
});
export async function clearReminders() {
  if (!notificationsSupported) return;
  await syncReminders([]);
  await notifications().dismissAllNotificationsAsync();
  await notifications().clearLastNotificationResponseAsync();
}
export async function testReminder() {
  if (!notificationsSupported)
    throw new Error("Reminders require a LockIn development build on Android.");
  if (!(await notificationPermission(true)))
    throw new Error(
      "Allow notifications in your device settings to receive reminders.",
    );
  await notifications().scheduleNotificationAsync({
    identifier: "lockin:test",
    content: {
      title: "Your LockIn reminder",
      body: "You’re ready. Future reminders will look like this.",
      data: { lockinKey: "lockin:test" },
    },
    trigger: {
      type: notifications().SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId,
    },
  });
}
export function listenForReminder(
  onOpen: (attemptId: string, date: string) => void,
) {
  if (!notificationsSupported) return () => {};
  let alive = true;
  let handled = "";
  const api = notifications();
  const open = (response: import("expo-notifications").NotificationResponse | null) => {
    if (!alive || !response) return;
    const request = response.notification.request;
    if (handled === request.identifier) return;
    handled = request.identifier;
    const data = request.content.data;
    if (typeof data?.attemptId === "string" && typeof data?.date === "string")
      onOpen(data.attemptId, data.date);
    void api.clearLastNotificationResponseAsync().catch(() => {});
  };
  void api.getLastNotificationResponseAsync()
    .then(open)
    .catch(() => {});
  const listener = api.addNotificationResponseReceivedListener(open);
  return () => {
    alive = false;
    listener.remove();
  };
}
