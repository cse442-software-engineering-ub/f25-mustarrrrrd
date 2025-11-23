// ===================================================================
// FINAL SERVICE WORKER (PRODUCTION) — Auto Office Hours
// ===================================================================

// Version tag for debugging - increment this when you make changes
const SW_VERSION = "AOH-v4";
console.log(`🔥 Service Worker Loaded: ${SW_VERSION}`);



self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (err) {
    console.error("❌ Failed to parse push JSON:", err);
    // Show a generic notification even if parsing fails
    data = { title: "New Notification", body: "You have a new notification" };
  }

  console.log("📨 PUSH RECEIVED:", data);

  const title = data.title || "Auto Office Hours";

  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || undefined, // Group notifications with same tag
    requireInteraction: data.requireInteraction || false, // Keep notification visible
    vibrate: data.vibrate || [200, 100, 200], // Vibration pattern for mobile
    timestamp: Date.now(),

    // This is critical: the URL to open on click
    data: {
      url: data.url || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error("❌ Failed to show notification:", err);
    })
  );
});


// -------------------------------------------------------------------
// URL Validation - Security measure to prevent malicious redirects
// -------------------------------------------------------------------
function isValidUrl(url) {
  try {
    const urlObj = new URL(url, self.location.origin);
    // Only allow same-origin URLs or your specific domains
    return urlObj.origin === self.location.origin;
  } catch (err) {
    console.error("❌ Invalid URL:", err);
    return false;
  }
}

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

  // Security check: validate URL before opening
  if (!isValidUrl(url)) {
    console.error("🚫 Security: Blocked invalid URL:", url);
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
// Install & Activate - Ensures updates take effect immediately
// -------------------------------------------------------------------
self.addEventListener("install", () => {
  console.log(`📦 Installing ${SW_VERSION}`);
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log(`✅ Activating ${SW_VERSION}`);
  // Take control of all pages immediately (don't wait for reload)
  event.waitUntil(clients.claim());
});
