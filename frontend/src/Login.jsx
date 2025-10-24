// src/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MAX = 191;

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

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const clamp = (s) => (s || "").slice(0, MAX);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_ROOT}check_session.php`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (data?.loggedIn) {
          if (data?.role === "student") navigate("/dashboard");
          else if (data?.role === "professor") navigate("/professorview");
          return;
        }
      } catch (err) {
        console.error("Session check failed:", err);
      }

      const savedEmail = getCookie("userEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
        setMessage("Welcome back");
      }
    };

    checkSession();
  }, [navigate]);

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

        if (data?.role === "student") navigate("/dashboard");
        else if (data?.role === "professor") navigate("/professorview");
      } else {
        setMessage(data?.message || "No match");
      }
    } catch {
      setMessage("server error");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  }

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
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>CSE442 Login</h1>
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

        {/* Buttons */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: "12px 24px",
            borderRadius: 6,
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#fff",
            background: loading
              ? "linear-gradient(90deg, #444, #666)"
              : "linear-gradient(90deg, #007bff, #00c3ff)",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease-in-out",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}

        {/* Signup */}
        <div style={{ marginTop: 24 }}>
          <p style={{ marginBottom: 8 }}>Don’t have an account?</p>
          <button
            onClick={() => navigate("/signup")}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid #007bff",
              background: "transparent",
              color: "#4da6ff",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#007bff33")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Sign up here
          </button>
        </div>
      </div>
    </div>
  );
}
