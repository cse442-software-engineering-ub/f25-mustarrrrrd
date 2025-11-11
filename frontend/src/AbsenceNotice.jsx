// src/AbsenceNotice.jsx
import { useEffect, useRef, useState } from "react";

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

/**
 * Shows a red banner if there's an unseen "absent_removed" notification
 * for the logged-in student (from table `user_notifications`).
 * Dismiss marks the notification as seen in the DB.
 */
export function AbsenceNotice() {
  const [notif, setNotif] = useState(null);
  const did = useRef(false);

  async function fetchAbsent() {
    try {
      const res = await fetch(`${API_ROOT}user_notifications.php?type=absent_removed`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.notifications) && data.notifications.length > 0) {
        // just show the latest unseen absent notification
        setNotif(data.notifications[0]);
      }
    } catch {}
  }

  useEffect(() => {
    if (did.current) return;
    did.current = true;
    fetchAbsent();

    // In case dashboard renders before session cookies settle, refetch once
    const t = setTimeout(fetchAbsent, 1500);
    // Also refetch when tab regains focus
    const onFocus = () => fetchAbsent();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function dismiss() {
    if (!notif) return;
    try {
      await fetch(`${API_ROOT}user_notifications.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: notif.id }),
      });
    } catch {}
    setNotif(null);
  }

  if (!notif) return null;

  return (
    <div
      role="alert"
      style={{
        border: "1px solid #ef4444",
        background: "#fff5f5",
        color: "#991b1b",
        padding: "12px 14px",
        borderRadius: 8,
        margin: "12px auto 0",
        maxWidth: "64rem",
        position: "relative",
      }}
    >
      <div style={{ paddingRight: 28 }}>
        <strong>You were marked absent.</strong>{" "}
        Please remember to either leave the queue if you can’t make it, or wait until your turn.
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          right: 10,
          top: 8,
          border: 0,
          background: "transparent",
          fontSize: 18,
          cursor: "pointer",
          color: "#991b1b",
        }}
      >
        ×
      </button>
    </div>
  );
}
