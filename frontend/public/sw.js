// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "Office Hour Reminder";
  const body = data.body || "Your office hour starts soon!";
  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/queue"));
});