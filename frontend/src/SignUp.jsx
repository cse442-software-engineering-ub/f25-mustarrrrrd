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
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasSpecialChar: false
  });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validatePasswordRequirements = (password) => {
    return {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Update password requirements when password field changes
    if (name === "password") {
      setPasswordRequirements(validatePasswordRequirements(value));
    }
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
      setErrorMessage("Please fill out all fields.");
      setShowErrorModal(true);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setShowErrorModal(true);
      return;
    }

    // Validate password requirements
    const requirements = validatePasswordRequirements(form.password);
    const missingRequirements = [];

    if (!requirements.minLength) {
      missingRequirements.push("12 characters");
    }
    if (!requirements.hasUppercase) {
      missingRequirements.push("one uppercase letter");
    }
    if (!requirements.hasSpecialChar) {
      missingRequirements.push("one special symbol");
    }

    if (missingRequirements.length > 0) {
      setErrorMessage(`Make sure your password has a minimum of ${missingRequirements.join(", ")}.`);
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);
    try {
      let { res, data } = await trySignup(API_ROOT);

      if (!res.ok || !data?.ok) {
        const msg = data?.message || `Signup failed (HTTP ${res.status}).`;
        setErrorMessage(msg);
        setShowErrorModal(true);
        console.error("Signup error:", data);
      } else {
        setErrorMessage("Account created successfully!");
        setShowErrorModal(true);
        console.log("Created user:", data.user);
        // Navigate after a short delay to show success message
        setTimeout(() => {
          if (data?.user?.role === "professor") {
            navigate("/professorview");
          } else {
            navigate("/dashboard");
          }
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Is the PHP endpoint reachable?");
      setShowErrorModal(true);
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
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
            }}
          />

          {/* Password Requirements Checklist */}
          <div style={{
            padding: "12px",
            borderRadius: 8,
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            fontSize: "0.95rem"
          }}>
            <div style={{ marginBottom: "8px", fontWeight: "500" }}>Password Requirements:</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                color: passwordRequirements.minLength ? "#4ade80" : "#ef4444",
                fontWeight: "bold"
              }}>
                {passwordRequirements.minLength ? "✓" : "✗"}
              </span>
              <span style={{ color: passwordRequirements.minLength ? "#4ade80" : "var(--text-primary)" }}>
                At least 12 characters
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                color: passwordRequirements.hasUppercase ? "#4ade80" : "#ef4444",
                fontWeight: "bold"
              }}>
                {passwordRequirements.hasUppercase ? "✓" : "✗"}
              </span>
              <span style={{ color: passwordRequirements.hasUppercase ? "#4ade80" : "var(--text-primary)" }}>
                At least one uppercase letter
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                color: passwordRequirements.hasSpecialChar ? "#4ade80" : "#ef4444",
                fontWeight: "bold"
              }}>
                {passwordRequirements.hasSpecialChar ? "✓" : "✗"}
              </span>
              <span style={{ color: passwordRequirements.hasSpecialChar ? "#4ade80" : "var(--text-primary)" }}>
                At least one special symbol (!@#$%^&*...)
              </span>
            </div>
          </div>

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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
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
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)"
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
              background: "var(--button-bg)",
              color: "var(--button-text)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => !submitting && (e.target.style.background = "var(--button-hover)")}
            onMouseLeave={(e) => !submitting && (e.target.style.background = "var(--button-bg)")}
          >
            {submitting ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: "1.1rem" }}>
          Already have an account?{" "}
          <a href="#/" style={{ color: "var(--link-color)" }}>
            Log in
          </a>
        </p>
      </div>

      {/* Custom Error/Success Modal */}
      {showErrorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowErrorModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: 12,
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px var(--card-shadow)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              {errorMessage.includes("successfully") ? "Success" : "Error"}
            </h3>
            <p style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem'
            }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowErrorModal(false)}
                style={{
                  background: errorMessage.includes("successfully") ? '#16a34a' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.625rem 1.25rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = errorMessage.includes("successfully") ? '#15803d' : '#b91c1c';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = errorMessage.includes("successfully") ? '#16a34a' : '#dc2626';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
