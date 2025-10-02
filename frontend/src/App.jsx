import { useState, useEffect } from "react";

const MAX = 191;

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

export default function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const clamp = s => s.slice(0, MAX);

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
        body: JSON.stringify({ name, email })
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
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>CSE442 Login</h1>

      <label style={{ display: "block", marginBottom: 10 }}>
        Name
        <input
          type="text"
          value={name}
          maxLength={MAX}
          onChange={e => setName(clamp(e.target.value))}
          placeholder="Your name"
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
        <small>{name.length}/{MAX}</small>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Email
        <input
          type="email"
          value={email}
          maxLength={MAX}
          onChange={e => setEmail(clamp(e.target.value))}
          placeholder="you@buffalo.edu"
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        />
        <small>{email.length}/{MAX}</small>
      </label>

      <label style={{ display: "block", marginBottom: 16, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
          style={{ marginRight: 8, cursor: "pointer" }}
        />
        Remember Me
      </label>

      <button onClick={handleLogin}>Log in</button>
      <button onClick={handleLogout} style={{ marginLeft: 10 }}>Sign Out</button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
