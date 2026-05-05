import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import i18n from "@/src/i18n";

const REMINDER_KEY = "selftend:cbt-reminder-id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

async function getStoredReminderId() {
  return SecureStore.getItemAsync(REMINDER_KEY);
}

async function setStoredReminderId(notificationId: string | null) {
  if (!notificationId) {
    await SecureStore.deleteItemAsync(REMINDER_KEY);
    return;
  }

  await SecureStore.setItemAsync(REMINDER_KEY, notificationId);
}

export async function ensureReminderPermission() {
  if (Platform.OS === "web") {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelCbtReminder() {
  if (Platform.OS === "web") {
    return;
  }

  const existingId = await getStoredReminderId();
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  }
  await setStoredReminderId(null);
}

export async function scheduleCbtReminder(hour: number, minute: number) {
  if (Platform.OS === "web") {
    return false;
  }

  const granted = await ensureReminderPermission();
  if (!granted) {
    return false;
  }

  await cancelCbtReminder();

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("cbt:notifications.title"),
      body: i18n.t("cbt:notifications.body"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await setStoredReminderId(notificationId);
  return true;
}
