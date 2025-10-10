import React, { useState, useEffect } from "react";

export default function ProfessorView() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Use correct API root for XAMPP
  const API_ROOT = "/f25-mustarrrrrd/api/";

  // --- Fetch professor’s assigned courses ---
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch(`${API_ROOT}professor_courses.php`, {
          method: "GET",
          credentials: "include", // include session cookie
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
            credentials: "include", // keep professor session
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
          console.log("Fetched queue:", data.queue);
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
          padding: "1rem 1.5rem",
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

            {queue.map((entry, idx) => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
