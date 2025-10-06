// src/Dashboard.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Menu } from "lucide-react";
import { CourseCardDashboard } from "./CourseCardDashboard";

// Build absolute base from Vite base (ends with /), safe in subfolders
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export function Dashboard() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Close the menu on outside click / Esc
  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      const b = btnRef.current;
      const m = menuRef.current;
      if (b && b.contains(e.target)) return;
      if (m && m.contains(e.target)) return;
      setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    try {
      await fetch(`${API_ROOT}logout.php`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    document.cookie = "PHPSESSID=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    navigate("/");
  }

  const go = (to) => {
    setMenuOpen(false);
    navigate(to);
  };

  const courses = [
    {
      id: "1",
      code: "CSE116",
      name: "Intro to Computer Science II",
      professor: "Professor Dickson",
      time: "Mon, Wed, Fri 2:00-4:00 PM",
      location: "Davis Hall 338",
      studentsInQueue: 0,
    },
    {
      id: "2",
      code: "CSE250",
      name: "Data Structures",
      professor: "Professor Mikida",
      time: "Tue, Thu 1:00-3:00 PM",
      location: "Davis Hall 101",
      studentsInQueue: 0,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        margin: 0,
        padding: 0,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "0.75rem 1rem",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            maxWidth: "64rem",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: 0,
              color: "#111",
            }}
          >
            Office Hours
          </h1>

          {/* Hamburger */}
          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
              title="Menu"
            >
              <Menu size={20} />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  marginTop: 8,
                  width: 220,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <MenuItem label="Courses" onClick={() => go("/mycourses")} />
                <MenuItem label="Profile" onClick={() => go("/profile")} />
                <MenuItem label="Settings" onClick={() => go("/settings")} />
                <div
                  style={{
                    height: 1,
                    background: "#f1f5f9",
                    margin: "4px 0",
                  }}
                />
                <MenuItem label="Sign out" danger onClick={handleSignOut} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem" }}>
        {/* Favorites Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <Star size={20} color="#eab308" fill="#eab308" />
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              margin: 0,
              color: "#111",
            }}
          >
            Favorites
          </h2>
        </div>

        {/* Course Tags */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          <button style={{
            padding: '0.375rem 0.75rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            Available
          </button>
          <button style={{
            padding: '0.375rem 0.75rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            Upcoming
          </button>
        </div>

        {/* Course Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {courses.map((course) => (
            <CourseCardDashboard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: 0,
        cursor: "pointer",
        fontSize: 14,
        color: danger ? "#b3261e" : "#111827",
      }}
    >
      {label}
    </button>
  );
}
