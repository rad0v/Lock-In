import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createReminderScheduler } from "../data/reminder-scheduler";
export const notificationsSupported = true;
const channelId = "lockin-reminders";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
async function channel() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Commitment reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
      sound: null,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
}
export async function notificationPermission(
  request = false,
): Promise<boolean> {
  if (request) await channel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && request && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  return permission.granted;
}
export const syncReminders = createReminderScheduler({
  list: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((n) => ({
      id: n.identifier,
      key: n.content.data?.lockinKey as string | undefined,
    })),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  schedule: async (r) => {
    await channel();
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: {
        title: "A moment to LockIn",
        body: "Your commitment is waiting. Open LockIn to check in.",
        data: { lockinKey: r.key, attemptId: r.attemptId, date: r.date },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.at),
        channelId,
      },
    });
  },
});
export async function clearReminders() {
  await syncReminders([]);
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.clearLastNotificationResponseAsync();
}
export async function testReminder() {
  if (!(await notificationPermission(true)))
    throw new Error(
      "Allow notifications in your device settings to receive reminders.",
    );
  await Notifications.scheduleNotificationAsync({
    identifier: "lockin:test",
    content: {
      title: "Your LockIn reminder",
      body: "You’re ready. Future reminders will look like this.",
      data: { lockinKey: "lockin:test" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId,
    },
  });
}
export function listenForReminder(
  onOpen: (attemptId: string, date: string) => void,
) {
  let alive = true;
  let handled = "";
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!alive || !response) return;
    const request = response.notification.request;
    if (handled === request.identifier) return;
    handled = request.identifier;
    const data = request.content.data;
    if (typeof data?.attemptId === "string" && typeof data?.date === "string")
      onOpen(data.attemptId, data.date);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(open)
    .catch(() => {});
  const listener = Notifications.addNotificationResponseReceivedListener(open);
  return () => {
    alive = false;
    listener.remove();
  };
}
