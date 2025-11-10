import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ added import

export default function SignUp() {
  const navigate = useNavigate(); // ✅ added this line

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" // "student" or "professor"
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Build API root relative to /f25-mustarrrrrd/app/
  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  async function trySignup(apiRoot) {
    const res = await fetch(`${apiRoot}signup.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
      }),
    });
    let data = {};
    try { data = await res.json(); } catch {}
    return { res, data };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword || !form.role) {
      alert("Please fill out all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      let { res, data } = await trySignup(API_ROOT);

      if (!res.ok || !data?.ok) {
        const msg = data?.message || `Signup failed (HTTP ${res.status}).`;
        alert(msg);
        console.error("Signup error:", data);
      } else {
        alert("Account created successfully!");
        console.log("Created user:", data.user);
        if (data?.user?.role === "professor") {
          navigate("/professorview");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Is the PHP endpoint reachable?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "black",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 500, padding: 24 }}>
        <h1 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 24 }}>
          Sign Up
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          />

          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            style={{
              padding: "12px",
              fontSize: "1.1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#222",
              color: "white"
            }}
          >
            <option value="">Select your role</option>
            <option value="student">Student</option>
            <option value="professor">Professor</option>
            <option value="ta">TA</option>
          </select>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "14px",
              fontSize: "1.2rem",
              fontWeight: "bold",
              background: "#444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: "1.1rem" }}>
          Already have an account?{" "}
          <a href="#/" style={{ color: "#4ea1ff" }}>
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
