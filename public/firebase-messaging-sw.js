self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.notification?.title || payload.data?.title || "MORE Energy ERP";
  const options = {
    body: payload.notification?.body || payload.data?.body || "لديك إشعار جديد",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const relatedId = event.notification.data?.relatedEntityId;
  const url = relatedId ? `/marketer/orders/${relatedId}` : "/notifications";
  event.waitUntil(clients.openWindow(url));
});
