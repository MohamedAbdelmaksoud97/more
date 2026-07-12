self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.notification?.title || payload.data?.title || "MORE Energy ERP";
  const options = {
    body: payload.notification?.body || payload.data?.body || "لديك إشعار جديد",
    icon: "/more-power-more-energy.png",
    badge: "/favicon.ico",
    dir: "rtl",
    lang: "ar",
    requireInteraction: payload.data?.requiresAction === "true",
    renotify: true,
    tag: payload.data?.notificationId || payload.data?.type || "more-energy-notification",
    data: {
      ...(payload.data || {}),
      clickUrl: payload.data?.clickUrl || payload.fcmOptions?.link || "/notifications",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.clickUrl || "/notifications", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
