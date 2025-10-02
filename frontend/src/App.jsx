import MyCourses from './MyCourses.jsx';
import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import SignUp from "./SignUp"; // ✅ SignUp stays untouched

const MAX = 191;

export default function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/mycourses" element={<MyCourses />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </HashRouter>
    </div>
  );
}  
  
// Cookie helper functions
const setCookie = (name, value, days) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
};

// Build an absolute base like "http://localhost/f25-mustarrrrrd/app/"
// so URL() doesn't throw. BASE_URL is your Vite base (ends with /).

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const clamp = (s) => s.slice(0, MAX);

  // Check for saved login on mount
  useEffect(() => {
    const savedName = getCookie('userName');
    const savedEmail = getCookie('userEmail');

    if (savedName && savedEmail) {
      setName(savedName);
      setEmail(savedEmail);
      setRememberMe(true);
      setMessage(`Welcome ${savedName}`);
    }
  }, []);

  async function handleLogin() {
    setMessage("");
    try {
      const res = await fetch(`${API_ROOT}verify.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (data.match) {
        setMessage(data.message || `Welcome ${name}`);

        // Save to cookies if Remember Me is checked
        if (rememberMe) {
          setCookie('userName', name, 30); // Store for 30 days
          setCookie('userEmail', email, 30);
        } else {
          // Clear cookies if Remember Me is unchecked
          deleteCookie('userName');
          deleteCookie('userEmail');
        }
      } else {
        setMessage(data.message || "No match");
      }
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

      // Clear cookies
      deleteCookie('userName');
      deleteCookie('userEmail');

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