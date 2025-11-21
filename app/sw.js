// ===================================================================
// FINAL SERVICE WORKER (PRODUCTION) — Auto Office Hours
// ===================================================================

// Version tag for debugging
console.log("🔥 Service Worker Loaded: AOH-v3 (FINAL)");



self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (err) {
    console.error("❌ Failed to parse push JSON:", err);
  }

  console.log("📨 PUSH RECEIVED:", data);

  const title = data.title || "Notification";

  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",

    // This is critical: the URL to open on click
    data: {
      url: data.url || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// -------------------------------------------------------------------
// NOTIFICATION CLICK EVENT — opens the right page on click
// -------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  console.log("🔥 NOTIFICATION CLICKED:", event.notification.data);

  event.notification.close();

  const url = event.notification.data?.url;

  if (!url) {
    console.warn("⚠️ No URL in notification payload — nothing to open");
    return;
  }

  // Focus window if already open, otherwise open a new window/tab
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If a tab already matches the target URL → focus it
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(url);
    })
  );
});


// -------------------------------------------------------------------
// (Optional) Activate Immediately if You Want Faster Updates
// Uncomment if needed
// -------------------------------------------------------------------
// self.addEventListener("install", () => {
//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   event.waitUntil(clients.claim());
// });
