import { useState } from "react";

const MAX = 191;

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

  async function handleLogin() {
    setMessage("");
    try {
      const res = await fetch(`${API_ROOT}verify.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      setMessage(data.message || (data.match ? `Welcome ${name}` : "No match"));
    } catch {
      setMessage("server error");
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

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
