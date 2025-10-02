import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import SignUp from "./SignUp"; // ✅ SignUp stays untouched

const MAX = 191;

// Build an absolute base like "http://localhost/.../app/"
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const clamp = (s) => s.slice(0, MAX);

  async function handleLogin() {
    setMessage("");
    try {
      const res = await fetch(`${API_ROOT}verify.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      setMessage(data.message || (data.match ? `Welcome ${name}` : "No match"));
    } catch {
      setMessage("server error");
    }
  }

  async function handleLogout() {
    setMessage("");
    try {
      await fetch(`${API_ROOT}logout.php`, {
        method: "POST",
        credentials: "include" // important to send the session cookie
      });

      // Clear frontend state
      setName("");
      setEmail("");
      setRememberMe(false);

      setMessage("You have been logged out.");
    } catch {
      setMessage("Logout failed (server error).");
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
        backgroundColor: "#000000", // ✅ FULL solid background (change to "#1f1f1f" if you want gray)
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 24,
          color: "#fff",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: 24 }}>
          CSE442 Login
        </h1>

        <label style={{ display: "block", marginBottom: 16 }}>
          Name
          <input
            type="text"
            value={name}
            maxLength={MAX}
            onChange={(e) => setName(clamp(e.target.value))}
            placeholder="Your name"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: 6,
              borderRadius: 6,
              border: "1px solid #444",
              backgroundColor: "#2a2a2a",
              color: "#fff",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
          <small>{name.length}/{MAX}</small>
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          Email
          <input
            type="email"
            value={email}
            maxLength={MAX}
            onChange={(e) => setEmail(clamp(e.target.value))}
            placeholder="you@buffalo.edu"
            style={{
              width: "100%",
              padding: "12px",
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

        <label style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Remember Me
        </label>
      <button onClick={handleLogin}>Log in</button>
      <button onClick={handleLogout} style={{ marginLeft: 10 }}>Sign Out</button>


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

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </Router>
  );
}
