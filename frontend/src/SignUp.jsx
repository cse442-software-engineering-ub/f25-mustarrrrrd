import React, { useState } from "react";

export default function SignUp() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" // student or professor
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", form);
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
          </select>

          <button
            type="submit"
            style={{
              padding: "14px",
              fontSize: "1.2rem",
              fontWeight: "bold",
              background: "#444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Sign Up
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: "1.1rem" }}>
          Already have an account?{" "}
          <a href="/" style={{ color: "#4ea1ff" }}>
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
