import { Platform } from "react-native";
import Constants from "expo-constants";

import { deleteDevicePushToken, upsertDevicePushToken } from "@/src/features/settings/repository";

type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null = null;

function getNativeNotifications(): NotificationsModule | null {
  if (Platform.OS === "web") return null;
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsModule;
  }
  return notificationsModule;
}

function getProjectId(): string | null {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
}

function getTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

type PushTokenFailureReason =
  | "missing-user"
  | "unsupported"
  | "permission-denied"
  | "missing-project-id"
  | "registration-failed";

type PushTokenResult = { enabled: true } | { enabled: false; reason: PushTokenFailureReason };

async function ensurePermission(Notifications: NotificationsModule): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function getExpoToken(): Promise<string | null> {
  const Notifications = getNativeNotifications();
  const projectId = getProjectId();
  if (!Notifications || !projectId) return null;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data ?? null;
  } catch {
    return null;
  }
}

export async function ensureDevicePushToken(userId: string | null): Promise<PushTokenResult> {
  if (!userId) return { enabled: false, reason: "missing-user" };
  const Notifications = getNativeNotifications();
  if (!Notifications) return { enabled: false, reason: "unsupported" };
  if (!getProjectId()) return { enabled: false, reason: "missing-project-id" };

  const granted = await ensurePermission(Notifications);
  if (!granted) return { enabled: false, reason: "permission-denied" };

  const token = await getExpoToken();
  if (!token) return { enabled: false, reason: "registration-failed" };

  await upsertDevicePushToken(userId, {
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
    timeZone: getTimeZone(),
  });
  return { enabled: true };
}

export async function disableDevicePushToken(userId: string | null): Promise<void> {
  if (!userId || Platform.OS === "web") return;
  const token = await getExpoToken();
  if (token) await deleteDevicePushToken(userId, token);
}
