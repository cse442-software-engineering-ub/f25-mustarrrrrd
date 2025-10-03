// src/Login.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // no useNavigate

const MAX = 191;

// toggles (set to false to hide either button)
const SHOW_PROFILE_LINK = true;
const SHOW_DEV_PROFILE_BUTTON = true;

// Cookie helpers
const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
};
const getCookie = (name) => {
  const nameEQ = `${name}=`;
  const parts = document.cookie.split(";").map((c) => c.trim());
  const hit = parts.find((c) => c.startsWith(nameEQ));
  return hit ? decodeURIComponent(hit.slice(nameEQ.length)) : null;
};
const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// Build absolute base from Vite base (ends with /), safe in subfolders
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const clamp = (s) => (s || "").slice(0, MAX);

  useEffect(() => {
    const savedEmail = getCookie("userEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      setMessage("Welcome back");
    }
  }, []);

  async function handleLogin() {
    if (!email || !password) {
      setMessage("Email and password required");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_ROOT}verify.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: clamp(email), password: clamp(password) }),
      });

      const data = await res.json();

      if (data?.match) {
        if (rememberMe && email) setCookie("userEmail", email, 30);
        else deleteCookie("userEmail");
        setMessage(`Welcome ${data?.name ?? ""}`.trim());
        setPassword("");
      } else {
        setMessage(data?.message || "No match");
      }
    } catch {
      setMessage("server error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setMessage("");
    try {
      await fetch(`${API_ROOT}logout.php`, { method: "POST", credentials: "include" });
      deleteCookie("userEmail");
      setEmail("");
      setPassword("");
      setRememberMe(false);
      setMessage("You have been logged out.");
    } catch {
      setMessage("Logout failed (server error).");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  }

  // DEV helper: create/login a dummy account then go to /profile
  async function goDevProfile() {
    const target = new URL("profile", ABS_BASE).pathname; // e.g. /f25-.../app/profile
    try {
      const res = await fetch(`${API_ROOT}dev_dummy_login.php`, {
        method: "POST",
        credentials: "include",
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok || !data?.ok) {
        const msg = (data && (data.message || JSON.stringify(data))) || `HTTP ${res.status}`;
        alert("Dev login failed: " + msg);
        return;
      }
      // Prefer SPA navigation; fall back to hard nav
      try {
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        window.location.href = target;
      }
    } catch {
      alert("Dev login error (see console)");
    }
  }

  // small pill styles reused for both buttons
  const pillBase = {
    padding: "8px 12px",
    borderRadius: 999,
    border: 0,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  };
  const linkPill = { ...pillBase, background: "#2a2a2a", color: "#fff", border: "1px solid #444" };
  const devPill  = { ...pillBase, background: "#1f6feb", color: "#fff", marginLeft: 8 };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#000000",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          padding: 32,
          color: "#fff",
          background: "#0f0f0f",
          border: "1px solid #222",
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        }}
      >
        {/* Header row with actions on the right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>CSE442 Login</h1>
          <div>
            {SHOW_PROFILE_LINK && (
              <Link to="/profile" style={linkPill}>
                Profile →
              </Link>
            )}
            {SHOW_DEV_PROFILE_BUTTON && (
              <button onClick={goDevProfile} style={devPill} title="Dev: open profile with dummy user">
                Dev: Profile
              </button>
            )}
          </div>
        </div>

        {/* Email */}
        <label style={{ display: "block", marginBottom: 16 }}>
          Email
          <input
            type="email"
            value={email}
            maxLength={MAX}
            onChange={(e) => setEmail(clamp(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder="you@buffalo.edu"
            autoFocus
            style={{
              width: "100%",
              padding: 12,
              marginTop: 6,
              borderRadius: 6,
              border: "1px solid #444",
              backgroundColor: "#2a2a2a",
              color: "#fff",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <small>{email.length}/{MAX}</small>
        </label>

        {/* Password */}
        <label style={{ display: "block", marginBottom: 20 }}>
          Password
          <input
            type="password"
            value={password}
            maxLength={MAX}
            onChange={(e) => setPassword(clamp(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder="Enter your password"
            style={{
              width: "100%",
              padding: 12,
              marginTop: 6,
              borderRadius: 6,
              border: "1px solid #444",
              backgroundColor: "#2a2a2a",
              color: "#fff",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <small>{password.length}/{MAX}</small>
        </label>

        <label style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Remember Me
        </label>

        <button onClick={handleLogin} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <button onClick={handleLogout} style={{ marginLeft: 10 }}>
          Sign Out
        </button>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}

        <p style={{ marginTop: 24 }}>
          Don’t have an account?{" "}
          <Link to="/signup" style={{ color: "#4da6ff" }}>
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
