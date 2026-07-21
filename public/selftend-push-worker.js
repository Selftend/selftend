const FALLBACK_PATH = "/modules/cbt";

/**
 * Resolves a notification's `data.url` to a same-origin href. An absolute or protocol-relative
 * URL would otherwise let `new URL(raw, origin)` ignore the base origin and drive
 * `client.navigate()` / `openWindow()` off-origin. Anything not on this origin falls back to the
 * app home route.
 */
function safeTargetUrl(rawUrl) {
  const origin = self.location.origin;
  try {
    const parsed = new URL(rawUrl || FALLBACK_PATH, origin);
    if (parsed.origin !== origin) {
      return new URL(FALLBACK_PATH, origin).href;
    }
    return parsed.href;
  } catch {
    return new URL(FALLBACK_PATH, origin).href;
  }
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Selftend";
  const options = {
    body: payload.body,
    data: {
      url: payload.url || "/modules/cbt",
    },
    icon: "/favicon.png",
    tag: payload.tag || "selftend-cbt-reminder",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = safeTargetUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
