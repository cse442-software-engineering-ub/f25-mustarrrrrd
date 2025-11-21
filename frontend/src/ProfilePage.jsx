// src/ProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import notify from './notify';

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

// DiceBear URL helper — adventurer-neutral + cache buster
const diceUrl = (seed) =>
  `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${encodeURIComponent(
    seed
  )}&v=${Date.now()}`;

const YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Masters Student",
  "PhD Student",
  "Faculty",
];
const PRONOUNS = [
  "he/him",
  "she/her",
  "they/them",
  "he/they",
  "she/they",
  "ze/zir",
  "prefer not to say",
];

/* ---------------------- Push Notification Helpers ---------------------- */

const VAPID_PUBLIC_KEY =
  "BNct9u_rYLt-VDZs4cLNG65RzzAhferGHWWZLA_eRKfGY8TSgDQNRtLkYS7M10j7oUHiBozSPv4A0NIVuL8h6-I";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    notify("This browser does not support notifications.", 'error');
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notify("Notifications were blocked. Enable them in browser settings.", 'error');
    return false;
  }
  return true;
}

async function subscribeToPush() {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  const reg = await navigator.serviceWorker.register(swUrl);

  const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

  const existingSub = await reg.pushManager.getSubscription();
  const sub =
    existingSub ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    }));

  await fetch(`${API_ROOT}push_subscribe.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  console.log("🔥 Push subscription saved!");
}

/* ------------------------------- COMPONENT ------------------------------- */

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // NEW state for toggle
  const [pushNotif, setPushNotif] = useState(false);

  // Responsive detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load profile via cookie session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}profile_get.php`, {
          credentials: "include",
        });
        if (!res.ok) {
          setProfile(null);
          return;
        }
        const data = await res.json();
        if (data?.ok) {
          setProfile(data.profile);
          setDraft(data.profile);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Randomize avatar — PREVIEW ONLY, no DB calls
  function regenerateAvatar() {
    const newSeed = crypto.randomUUID().replace(/-/g, "");
    setDraft((d) => ({ ...d, avatar_seed: newSeed }));
  }

  // Display name
  const displayName = useMemo(() => {
    if (!profile) return "";
    const nameParts = (profile.name || "").trim().split(/\s+/);
    const lastName = nameParts.slice(1).join(" ");

    if (profile.preferred_name) {
      return `${profile.preferred_name} ${lastName}`.trim();
    }
    return profile.name || "";
  }, [profile]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!profile || !draft) return false;
    const keys = [
      "name",
      "preferred_name",
      "pronouns",
      "academic_year",
      "major",
      "avatar_seed",
    ];
    return keys.some((k) => (draft[k] || "") !== (profile[k] || ""));
  }, [profile, draft]);

  async function save() {
    setMsg("");
    try {
      const res = await fetch(`${API_ROOT}profile_update.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await res.json();

      if (data?.ok) {
        setProfile(data.profile);
        setDraft(data.profile);
        setEditing(false);
        setMsg("Saved.");
        setTimeout(() => setMsg(""), 2000);
      } else {
        setMsg(data?.message || "Save failed.");
      }
    } catch {
      setMsg("Server error.");
    }
  }

  async function signOut() {
    try {
      await fetch(`${API_ROOT}logout.php`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    window.location.href = new URL("", ABS_BASE).pathname;
  }

  if (loading)
    return (
      <div
        style={{
          color: "var(--text-primary)",
          padding: 24,
          background: "var(--bg-primary)",
          minHeight: "100vh",
        }}
      >
        Loading…
      </div>
    );

  if (!profile) {
    return (
      <div
        style={{
          color: "var(--text-primary)",
          padding: 24,
          background: "var(--bg-primary)",
          minHeight: "100vh",
        }}
      >
        <h1>Profile</h1>
        <p>You're not signed in.</p>
        <Link to="/" style={{ color: "var(--link-color)" }}>
          Go to Login
        </Link>
      </div>
    );
  }

  const [firstName, lastName] = (() => {
    const parts = (draft?.name || "").trim().split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" ") || ""];
  })();

  /** === Layout constants === */
  const HEADER_H = isMobile ? 96 : 64;

  const page = {
    minHeight: "100vh",
    width: "100%",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    fontFamily: "system-ui, sans-serif",
    overflowX: "hidden",
  };

  const topBar = {
    position: "fixed",
    left: 0,
    right: 0,
    top: 0,
    height: HEADER_H,
    zIndex: 3000,
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid var(--border-color)",
    background: "var(--card-bg)",
    backdropFilter: "blur(2px)",
  };

  const container = {
    width: "100%",
    maxWidth: "1600px",
    margin: "0 auto",
    padding: isMobile ? "0 16px" : "0 24px",
    boxSizing: "border-box",
  };

  const contentWrap = {
    ...container,
    paddingTop: isMobile ? (editing ? 825 : 500) : 160,
    paddingBottom: 64,
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(340px, 460px) 1fr",
    gap: isMobile ? 24 : 32,
    alignItems: "start",
    width: "100%",
  };

  const card = {
    background: "var(--card-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: 16,
  };

  const sectionHeader = {
    padding: 24,
    borderBottom: "1px solid var(--border-color)",
  };
  const sectionBody = {
    padding: 24,
  };

  const inputBase = {
    padding: 12,
    borderRadius: 10,
    border: "1px solid var(--border-color)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 16,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const selectBase = { ...inputBase, appearance: "none" };

  const twoCol = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(300px,1fr) minmax(300px,1fr)",
    gap: 20,
    alignItems: "start",
  };

  const field = (label, value, onChange, props = {}) => (
    <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputBase}
        {...props}
      />
    </label>
  );

  function startEditing() {
    setEditing(true);
  }

  return (
    <div style={page}>
      {/* Fixed header */}
      <div style={topBar}>
        <div
          style={{
            ...container,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              to="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                padding: "8px 12px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M15 8a.75.75 0 0 1-.75.75H3.56l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4.75-4.75a.75.75 0 0 1 0-1.06l4.75-4.75a.75.75 0 1 1 1.06 1.06L3.56 7.25h10.69A.75.75 0 0 1 15 8z"
                />
              </svg>
            </Link>
            <h1 style={{ margin: 0, fontSize: 22, whiteSpace: "nowrap" }}>
              Profile
            </h1>
          </div>

          <div
            style={{
              minHeight: 42,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: isMobile ? "wrap" : "nowrap",
            }}
          >
            {!editing ? (
              <button
                onClick={startEditing}
                style={{
                  background: "#1f6feb",
                  border: 0,
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setDraft(profile);
                    setEditing(false);
                    setMsg("");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: 15,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!isDirty}
                  style={{
                    background: "#1f6feb",
                    border: 0,
                    color: "#fff",
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    opacity: isDirty ? 1 : 0.6,
                    cursor: isDirty ? "pointer" : "not-allowed",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={contentWrap}>
        <div style={grid}>
          {/* LEFT SIDEBAR */}
          <aside style={{ ...card, padding: isMobile ? 20 : 24 }}>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 18,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              {/* Avatar + Randomize */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <img
                  src={diceUrl(
                    draft?.avatar_seed || profile.avatar_seed || "default"
                  )}
                  alt="Avatar"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--border-color)",
                    background: "var(--bg-tertiary)",
                  }}
                />

                {editing && (
                  <button
                    onClick={regenerateAvatar}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      padding: "6px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 14,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.5 0h-11A1.5 1.5 0 0 0 1 1.5v11A1.5 1.5 0 0 0 2.5 14h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 0zM4 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                    </svg>
                    Randomize
                  </button>
                )}
              </div>

              <div style={{ textAlign: isMobile ? "center" : "left" }}>
                <div style={{ fontSize: 28, lineHeight: 1.2 }}>
                  {displayName}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                fontSize: 16,
                textAlign: isMobile ? "center" : "left",
              }}
            >
              {profile.pronouns && (
                <div style={{ color: "var(--text-secondary)" }}>
                  Pronouns:{" "}
                  <span style={{ color: "var(--text-primary)" }}>
                    {profile.pronouns}
                  </span>
                </div>
              )}
              <div style={{ color: "var(--text-secondary)" }}>
                Year:{" "}
                <span style={{ color: "var(--text-primary)" }}>
                  {profile.academic_year || "—"}
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Major:{" "}
                <span style={{ color: "var(--text-primary)" }}>
                  {profile.major || "—"}
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Email:{" "}
                <span style={{ color: "var(--link-color)" }}>
                  {profile.email}
                </span>
              </div>
            </div>
          </aside>

          {/* RIGHT SIDE */}
          <main style={{ display: "grid", gap: 28, width: "100%" }}>
            {/* IDENTITY */}
            <section style={card}>
              <div style={sectionHeader}>
                <h3 style={{ margin: 0, fontSize: 20 }}>Identity</h3>
              </div>
              {!editing ? (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <Labeled label="Name" value={displayName} />
                  <Labeled
                    label="Preferred Name"
                    value={profile.preferred_name || "—"}
                  />
                  <Labeled label="Pronouns" value={profile.pronouns || "—"} />
                </div>
              ) : (
                <div style={{ ...sectionBody, display: "grid", gap: 20 }}>
                  <div style={twoCol}>
                    {field("First Name", firstName, (v) =>
                      setDraft((d) => ({
                        ...d,
                        name: `${v} ${lastName}`.trim(),
                      }))
                    )}
                    {field("Last Name", lastName, (v) =>
                      setDraft((d) => ({
                        ...d,
                        name: `${firstName} ${v}`.trim(),
                      }))
                    )}

                    {field(
                      "Preferred Name",
                      draft?.preferred_name || "",
                      (v) =>
                        setDraft((d) => ({ ...d, preferred_name: v }))
                    )}

                    <label style={{ display: "grid", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Email
                      </span>
                      <input
                        value={profile.email}
                        disabled
                        style={{
                          ...inputBase,
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Pronouns
                      </span>
                      <select
                        value={draft?.pronouns || ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            pronouns: e.target.value,
                          }))
                        }
                        style={selectBase}
                      >
                        <option value="">Select</option>
                        {PRONOUNS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </section>

            {/* ACADEMIC */}
            <section style={card}>
              <div style={sectionHeader}>
                <h3 style={{ margin: 0, fontSize: 20 }}>
                  Academic Information
                </h3>
              </div>
              {!editing ? (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <Labeled
                    label="Academic Year"
                    value={profile.academic_year || "—"}
                  />
                  <Labeled label="Major" value={profile.major || "—"} />
                </div>
              ) : (
                <div style={{ ...sectionBody, ...twoCol }}>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Academic Year
                    </span>
                    <select
                      value={draft?.academic_year || ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          academic_year: e.target.value,
                        }))
                      }
                      style={selectBase}
                    >
                      <option value="">(select)</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>

                  {field("Major", draft?.major || "", (v) =>
                    setDraft((d) => ({ ...d, major: v }))
                  )}
                </div>
              )}
            </section>

            {/* NOTIFICATIONS (INSERTED ABOVE SIGN OUT) */}
            <section
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 16, fontSize: 20 }}>
                Notifications
              </h3>

              <ToggleRow
                title="Push notifications"
                description="Get alerts before your office hours or when it’s your turn."
                checked={pushNotif}
                onChange={async (v) => {
                  setPushNotif(v);
                  if (v) await subscribeToPush();
                }}
              />
            </section>

            {/* SIGN OUT */}
            <div
              style={{
                display: "flex",
                justifyContent: isMobile ? "center" : "flex-end",
                width: "100%",
              }}
            >
              <button
                onClick={signOut}
                style={{
                  background: "#b3261e",
                  border: 0,
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 16,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                Sign Out
              </button>
            </div>

            {msg && (
              <div style={{ color: "var(--link-color)", fontSize: 14 }}>
                {msg}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- SUPPORTING COMPONENTS --------------------------- */

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
        <div style={{ fontWeight: 500 }}>{title}</div>
        {description && (
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {description}
          </div>
        )}
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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

function Labeled({ label, value }) {
  return (
    <div>
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
