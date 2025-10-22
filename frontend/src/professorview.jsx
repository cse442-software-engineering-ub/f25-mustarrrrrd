import React, { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfessorView() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Use correct API root for XAMPP
  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  // --- Fetch professor’s assigned courses ---
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch(`${API_ROOT}professor_courses.php`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          console.error("Failed to load professor courses:", res.status);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.ok && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
          setActiveCourse(data.courses[0].code);
        } else {
          console.warn("No courses returned:", data);
          setCourses([]);
        }
      } catch (err) {
        console.error("Error loading professor courses:", err);
      }
    }

    fetchCourses();
  }, []);

  // --- Fetch live queue for selected course ---
  useEffect(() => {
    if (!activeCourse) return;

    async function fetchQueue() {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_ROOT}queue_list.php?course_id=${encodeURIComponent(activeCourse)}`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );

        if (!res.ok) {
          console.error("Queue fetch failed:", res.status);
          setQueue([]);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.ok && Array.isArray(data.queue)) {
          setQueue(data.queue);
        } else {
          setQueue([]);
        }
      } catch (err) {
        console.error("Error fetching queue:", err);
        setQueue([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [activeCourse]);

  // --- Handle sign out ---
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

  // --- Close menu when clicking outside or pressing Esc ---
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "500",
              margin: 0,
              color: "#111",
            }}
          >
            Instructor Dashboard
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>
            Professor Mikida • Computer Science & Engineering
          </p>
        </div>

        {/* Hamburger Menu */}
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
                width: 160,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#b3261e",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "70rem", margin: "0 auto", padding: "1.5rem" }}>
        {/* Course Tabs */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {courses.length === 0 && (
            <p style={{ color: "#555" }}>
              You have no assigned courses yet. Please create one first.
            </p>
          )}

          {courses.map((course) => {
            const isActive = course.code === activeCourse;
            return (
              <button
                key={course.code}
                onClick={() => setActiveCourse(course.code)}
                style={{
                  background: isActive ? "#111" : "#fff",
                  color: isActive ? "#fff" : "#333",
                  border: isActive ? "none" : "1px solid #ddd",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  textAlign: "center",
                  boxShadow: isActive
                    ? "0 2px 6px rgba(0,0,0,0.2)"
                    : "0 1px 3px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                }}
              >
                <p style={{ fontWeight: "600", margin: 0 }}>{course.code}</p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    margin: 0,
                    opacity: 0.8,
                  }}
                >
                  {course.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Queue View */}
        {activeCourse && (
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  margin: 0,
                }}
              >
                {activeCourse} —{" "}
                {
                  courses.find((c) => c.code === activeCourse)?.title ||
                  "Course Queue"
                }
              </h2>
              <span
                style={{
                  fontSize: "0.7rem",
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                }}
              >
                Active Now
              </span>
            </div>

            {loading && <p style={{ color: "#666" }}>Loading queue...</p>}
            {!loading && queue.length === 0 && (
              <p style={{ color: "#666" }}>No students currently in queue.</p>
            )}

            {queue.map((entry, idx) => {
              const isNext = idx === 0;
              return (
                <div
                  key={idx}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <p style={{ fontWeight: "600", margin: 0 }}>
                      {entry.user_email}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#777",
                        margin: 0,
                      }}
                    >
                      Joined:{" "}
                      {new Date(entry.joined_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#444",
                      margin: 0,
                    }}
                  >
                    {entry.notes || "(no note provided)"}
                  </p>

                  {/* Present / Absent controls for the student who is up next */}
                  {isNext && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `${API_ROOT}queue_attendance.php`,
                              {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json", Accept: "application/json" },
                                body: JSON.stringify({
                                  course_id: activeCourse,
                                  user_email: entry.user_email,
                                  status: "present",
                                }),
                              }
                            );
                            if (!res.ok) throw new Error("request failed");
                            const data = await res.json().catch(() => ({}));
                            if (data.ok) {
                              // reflect change locally
                              setQueue((q) => {
                                const copy = q.slice();
                                copy[0] = { ...copy[0], attendance: "present" };
                                return copy;
                              });
                            }
                          } catch (err) {
                            console.error("Failed to mark present:", err);
                          }
                        }}
                        style={{
                          background: entry.attendance === "present" ? "#166534" : "#bbf7d0",
                          color: entry.attendance === "present" ? "#fff" : "#164e2e",
                          border: "none",
                          padding: "0.5rem 0.75rem",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Present
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `${API_ROOT}queue_attendance.php`,
                              {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json", Accept: "application/json" },
                                body: JSON.stringify({
                                  course_id: activeCourse,
                                  user_email: entry.user_email,
                                  status: "absent",
                                }),
                              }
                            );
                            if (!res.ok) throw new Error("request failed");
                            const data = await res.json().catch(() => ({}));
                            if (data.ok) {
                              setQueue((q) => {
                                const copy = q.slice();
                                copy[0] = { ...copy[0], attendance: "absent" };
                                return copy;
                              });
                            }
                          } catch (err) {
                            console.error("Failed to mark absent:", err);
                          }
                        }}
                        style={{
                          background: entry.attendance === "absent" ? "#7f1d1d" : "#fecaca",
                          color: entry.attendance === "absent" ? "#fff" : "#7f1d1d",
                          border: "none",
                          padding: "0.5rem 0.75rem",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Absent
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
