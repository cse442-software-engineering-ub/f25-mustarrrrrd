// src/Dashboard.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Menu } from "lucide-react";
import { CourseCardDashboard } from "./CourseCardDashboard";
import { AbsenceNotice } from "./AbsenceNotice";

// Build absolute base from Vite base (ends with /), safe in subfolders
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export function Dashboard() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  // Check authentication status on mount - redirect if not logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_ROOT}check_session.php`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/");
          return;
        }

        const data = await res.json();

        if (!data.loggedIn) {
          // Not logged in - redirect to login page
          navigate("/");
          return;
        }

        // Check if user is a student (this is the student dashboard)
        if (data.role === "professor" || data.role === "ta") {
          // Wrong dashboard - redirect to professor view
          navigate("/professorview");
          return;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/");
      }
    }

    checkAuth();
  }, [navigate]);

  // Fetch favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}favorites.php`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (data.favorites) {
        // Transform API data to match expected course format
        const formattedCourses = coursesData.courses.map(course => ({
          id: course.id,
          code: course.code,
          name: course.title,
          time: course.lecture_times,
          location: course.room,
          studentsInQueue: 0,
          status: "upcoming",
        }));
        setCourses(formattedCourses);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(courseId) {
    try {
      await fetch(`${API_ROOT}favorites.php`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId }),
      });
      // Remove from local state
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  }

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

  // Calculate course counts
  const availableCount = courses.filter(c => c.status === 'available').length;
  const upcomingCount = courses.filter(c => c.status === 'upcoming').length;

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

      {/* Absent banner */}
      <AbsenceNotice />

      {/* Main Content */}
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem" }}>
        {/* Search Bar Section */}
        <div style={{ marginBottom: "2rem" }} ref={searchRef}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              margin: "0 0 0.75rem 0",
              color: "#111",
            }}
          >
            Find & Join Courses
          </h2>
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                border: "2px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                gap: "0.5rem",
              }}
            >
              <Search size={20} color="#6b7280" />
              <input
                type="text"
                placeholder="Search by course code or title... (e.g., 'CSE 442' or just '442')"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "0.875rem",
                  color: "#111",
                  background: "transparent",
                }}
              />
              {searchLoading && (
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  Searching...
                </div>
              )}
            </div>

            {/* Dropdown with search results */}
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 0.5rem)",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 50,
                }}
              >
                {searchResults.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      transition: "background 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111" }}>
                        {course.code}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.125rem" }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>
                        {course.lecture_times}
                      </div>
                    </div>
                    <button
                      onClick={() => enrollAndFavorite(course.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.5rem",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}
                      title="Join and add to favorites"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Upcoming Sessions Section */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <Calendar size={20} color="#3b82f6" />
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                margin: 0,
                color: "#111",
              }}
            >
              My Upcoming Sessions
            </h2>
          </div>

          {/* Reserved Sessions Cards or Empty State */}
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading sessions...</p>
          ) : reservedSessions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
              Reserved office hour sessions will appear here. To reserve a session, click "View Sessions" for your course below, and reserve any session that is within 24 hours of your current time.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
              }}
            >
              {reservedSessions.map((session) => (
                <ReservedSessionCard
                  key={session.sessionId}
                  session={session}
                  onCancel={cancelReservation}
                />
              ))}
            </div>
          )}
        </div>

        {/* Favorites Section */}
        <div style={{ marginBottom: "3rem" }}>
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
            Available ({availableCount})
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
            Upcoming ({upcomingCount})
          </button>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading favorites...</p>
        ) : courses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>No favorite courses yet. Add some from the My Courses page!</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {courses.map((course) => (
              <CourseCardDashboard
                key={course.id}
                course={course}
                onRemoveFavorite={removeFavorite}
              />
            ))}
          </div>
        )}
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
