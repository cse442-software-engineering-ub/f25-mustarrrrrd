// src/Settings.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;
const VAPID_PUBLIC_KEY = "BNct9u_rYLt-VDZs4cLNG65RzzAhferGHWWZLA_eRKfGY8TSgDQNRtLkYS7M10j7oUHiBozSPv4A0NIVuL8h6-I";


/* -------------------------------------------------------------------------- */
/*                                Helper utils                                */
/* -------------------------------------------------------------------------- */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/* -------------------------------------------------------------------------- */
/*                                Main Component                              */
/* -------------------------------------------------------------------------- */
export default function Settings() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [theme, setTheme] = useState("system");
  const [pushNotif, setPushNotif] = useState(false);
  const [msg, setMsg] = useState("");

  /* ------------------------- Close dropdown on blur ------------------------ */
  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const go = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  /* ----------------------------- Sign out user ----------------------------- */
  async function handleSignOut() {
    try {
      await fetch(`${API_ROOT}logout.php`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    document.cookie = "PHPSESSID=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    navigate("/");
  }

  /* ---------------------- Notification + push handling --------------------- */
  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Notifications were blocked. Enable them in browser settings.");
      return false;
    }
    return true;
  }

  async function subscribeToPush() {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    // Register service worker (works for subfolders)
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    const reg = await navigator.serviceWorker.register(swUrl);
    console.log("✅ Service worker registered:", reg.scope);

    // Convert public VAPID key
    const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Try to subscribe (reuses old one if exists)
    const existingSub = await reg.pushManager.getSubscription();
    const sub =
      existingSub ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      }));

    // Send subscription to backend
    await fetch(`${API_ROOT}push_subscribe.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    console.log("✅ Push subscription saved to backend!");
  }

  async function saveSettings(e) {
    e?.preventDefault?.();
    setMsg("Settings saved.");
    setTimeout(() => setMsg(""), 1800);
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        position: "fixed",
        inset: 0,
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "0.75rem 1rem",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            maxWidth: "64rem",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: 0,
              color: "#111",
            }}
          >
            Settings
          </h1>

          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
              title="Menu"
            >
              <Menu size={20} />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  marginTop: 8,
                  width: 220,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <MenuItem label="Profile" onClick={() => go("/profile")} />
                <MenuItem label="Settings" onClick={() => go("/settings")} />
                <div
                  style={{
                    height: 1,
                    background: "#f1f5f9",
                    margin: "4px 0",
                  }}
                />
                <MenuItem label="Sign out" danger onClick={handleSignOut} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem" }}>
        <form onSubmit={saveSettings} style={{ display: "grid", gap: "1rem" }}>
          <Card title="Appearance">
            <div style={row}>
              <label style={label}>Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={select}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </Card>

          <Card title="Notifications">
            <ToggleRow
              title="Push notifications"
              description="Get alerts before your office hours or when it’s your turn."
              checked={pushNotif}
              onChange={async (v) => {
                setPushNotif(v);
                if (v) await subscribeToPush();
              }}
            />
          </Card>

          <Card title="Account">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" style={primaryBtn}>
                Save changes
              </button>
              <button type="button" onClick={handleSignOut} style={dangerBtn}>
                Sign out
              </button>
            </div>
            {msg && <div style={{ marginTop: 10, color: "#0f766e" }}>{msg}</div>}
          </Card>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Reusable components                            */
/* -------------------------------------------------------------------------- */
function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: 0,
        cursor: "pointer",
        fontSize: 14,
        color: danger ? "#b3261e" : "#111827",
      }}
    >
      {label}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 16,
          fontWeight: 600,
          color: "#111",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </section>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 500, color: "#111" }}>{title}</div>
        {description && (
          <div style={{ color: "#6b7280", fontSize: 14 }}>{description}</div>
        )}
      </div>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
      </label>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Inline styles                               */
/* -------------------------------------------------------------------------- */
const row = {
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  gap: 12,
  alignItems: "center",
};
const label = { color: "#374151", fontSize: 14 };
const input = {
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  fontSize: 14,
  color: "#111",
};
const select = { ...input, appearance: "none" };
const primaryBtn = {
  background: "#1f6feb",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
const dangerBtn = {
  background: "#b3261e",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
