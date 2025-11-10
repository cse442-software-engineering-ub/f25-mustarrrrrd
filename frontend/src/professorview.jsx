import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Plus, MoreVertical, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfessorView() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [queue, setQueue] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSession, setNewSession] = useState({
    day_of_week: "Monday",
    start_time: "12:00",
    end_time: "13:00",
    location: "",
  });
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: "", title: "" });
  const [professorName, setProfessorName] = useState("Professor");
  const [showJoinCourse, setShowJoinCourse] = useState(false);
  const [joinSearchTerm, setJoinSearchTerm] = useState("");
  const [joinSearchResults, setJoinSearchResults] = useState([]);
  const [joinSearchLoading, setJoinSearchLoading] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(null); // Tracks which course menu is open
  const[showAddTA, setShowAddTA] = useState(false);
  const[newTA, setNewTA] = useState({ ta_email: '' });

  // NEW: who am I (email) + banner message
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");

  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Use correct API root for XAMPP
  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  // Parse 12-hour time format "3:00 PM" to 24-hour { hours, minutes }
  function parse12HourTime(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.trim().split(" "); // ["3:00", "PM"]
    if (parts.length !== 2) return { hours: 0, minutes: 0 };

    const [timePart, period] = parts;
    const [h, m] = timePart.split(":").map((nt) => parseInt(nt, 10) || 0);

    let hours = h;
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return { hours, minutes: m };
  }

  // --- Fetch professor info from session ---
  useEffect(() => {
    async function fetchProfessorInfo() {
      try {
        const res = await fetch(`${API_ROOT}check_session.php`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          console.error("Failed to check session:", res.status);
          navigate("/");
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!data.loggedIn) {
          // Not logged in - redirect to login page
          navigate("/");
          return;
        }

        // Check if user is a professor or TA (this is the professor dashboard)
        if (data.role === "student") {
          // Wrong dashboard - redirect to student dashboard
          navigate("/dashboard");
          return;
        }

        if (data.loggedIn) {
          if (data.name) setProfessorName(data.name);
          // NEW: capture email from common keys
          const email =
            data.email ||
            data.user_email ||
            data.username ||
            data.user ||
            "";
          setCurrentUserEmail((email || "").toLowerCase());
        }
      } catch (err) {
        console.error("Error fetching professor info:", err);
        navigate("/");
      }
    }

    fetchProfessorInfo();
  }, [navigate]);

  // --- Fetch professor's assigned courses ---
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
          `${API_ROOT}queue_list.php?course_id=${encodeURIComponent(
            activeCourse
          )}`,
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
    // fetch sessions too
    fetchSessions();
    const sInterval = setInterval(fetchSessions, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(sInterval);
    };
  }, [activeCourse]);

  async function fetchSessions() {
    try {
      const res = await fetch(
        `${API_ROOT}office_hours_sessions_list.php?course_id=${encodeURIComponent(
          activeCourse
        )}`,
        { credentials: "include", headers: { Accept: "application/json" } }
      );
      if (!res.ok) {
        console.error("Failed to load sessions", res.status);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!(data && data.ok && Array.isArray(data.sessions))) {
        console.error("Invalid sessions response", data);
        return;
      }

      // normalize and sort sessions: Monday..Sunday then start_time ascending
      const dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const dayIdx = (d) => Math.max(0, dayOrder.indexOf(d));

      const sorted = data.sessions.slice().sort((a, b) => {
        const da = dayIdx(a.day_of_week);
        const db = dayIdx(b.day_of_week);
        if (da !== db) return da - db;
        // compare start_time strings 'HH:MM'
        if ((a.start_time || "") < (b.start_time || "")) return -1;
        if ((a.start_time || "") > (b.start_time || "")) return 1;
        return 0;
      });

      // avoid flicker: only update state when data actually changed
      try {
        const prev = JSON.stringify(sessions || []);
        const next = JSON.stringify(sorted || []);
        if (prev !== next) {
          setSessions(sorted);
        }
      } catch (e) {
        setSessions(sorted);
      }
    } catch (err) {
      console.error("Error fetching sessions", err);
    }
  }

  function isSessionActive(s) {
    try {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const now = new Date();
      const today = days[now.getDay()];
      if (s.day_of_week !== today) return false;
      // s.start_time like "3:00 PM"
      const { hours: sh, minutes: sm } = parse12HourTime(s.start_time);
      const { hours: eh, minutes: em } = parse12HourTime(s.end_time);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    } catch (e) {
      return false;
    }
  }

  async function createSession() {
    try {
      const res = await fetch(`${API_ROOT}create_office_hours_session.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ course_id: activeCourse, ...newSession }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setShowScheduleForm(false);
        // refresh sessions
        fetchSessions();
      }
    } catch (err) {
      console.error("Failed to create session", err);
    }
  }

  async function createCourse() {
    try {
      const res = await fetch(`${API_ROOT}professor_create_course.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code: newCourse.code, title: newCourse.title }),
      });
      if (!res.ok) throw new Error("create course failed");
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        // Add the new course to the list
        const newCourseData = data.course;
        setCourses((prev) => [...prev, newCourseData]);
        setActiveCourse(newCourseData.code);
        // Reset form
        setNewCourse({ code: "", title: "" });
        setShowCreateCourse(false);
      } else {
        alert(data?.error || "Failed to create course");
      }
    } catch (err) {
      console.error("Failed to create course", err);
      alert("Failed to create course");
    }
  }

  // Search for courses to join (only by code and title)
  useEffect(() => {
    if (!joinSearchTerm.trim()) {
      setJoinSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      performJoinSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [joinSearchTerm]);

  async function performJoinSearch() {
    if (!joinSearchTerm.trim()) return;

    setJoinSearchLoading(true);
    try {
      const res = await fetch(`${API_ROOT}search_courses.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: joinSearchTerm, filter: "None" }),
      });

      const data = await res.json();

      if (data.courses) {
        // Filter out courses already in the professor's list
        const enrolledCodes = new Set(courses.map((c) => c.code));
        const filteredResults = data.courses.filter((c) => !enrolledCodes.has(c.code));
        setJoinSearchResults(filteredResults);
      } else {
        setJoinSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching courses:", err);
      setJoinSearchResults([]);
    } finally {
      setJoinSearchLoading(false);
    }
  }

  async function joinCourse(courseId) {
    try {
      const res = await fetch(`${API_ROOT}enroll.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId, role: "professor" }),
      });

      const data = await res.json();

      if (data.success) {
        // Refetch courses to include the newly joined course
        const coursesRes = await fetch(`${API_ROOT}professor_courses.php`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          if (coursesData.ok && Array.isArray(coursesData.courses)) {
            setCourses(coursesData.courses);
            // Set the newly joined course as active
            const joinedCourse = coursesData.courses.find((c) => c.id === courseId);
            if (joinedCourse) {
              setActiveCourse(joinedCourse.code);
            }
          }
        }

        // Clear search
        setJoinSearchTerm("");
        setJoinSearchResults([]);
        setShowJoinCourse(false);
      } else {
        alert(data?.error || "Failed to join course");
      }
    } catch (err) {
      console.error("Error joining course:", err);
      alert("Failed to join course");
    }
  }

  async function addTA() {
    try{
      const res = await fetch(`${API_ROOT}add_ta.php`,{
        method: 'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ code: activeCourse, ta_email: newTA.ta_email })
      });
      if(!res.ok) throw new Error('add TA failed');
      const data = await res.json().catch(()=>null);
      if(data && data.ok){
        // Reset form
        setNewTA({ ta_email: '' });
        setShowAddTA(false);
      } else {
        alert(data?.error || 'Failed to add TA');
      }
    }catch(err){
      console.error('Failed to add TA', err);
      alert('Failed to add TA');
    }
  }

  async function handleRemoveCourse(courseId, courseCode) {
    try {
      const res = await fetch(`${API_ROOT}unenroll.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove course from local state
        setCourses((prev) => prev.filter((c) => c.id !== courseId));

        // If removed course was active, set another as active
        if (activeCourse === courseCode) {
          const remainingCourses = courses.filter((c) => c.id !== courseId);
          setActiveCourse(remainingCourses.length > 0 ? remainingCourses[0].code : null);
        }

        // Close the menu
        setCourseMenuOpen(null);
      } else {
        alert(data?.error || "Failed to remove course");
      }
    } catch (err) {
      console.error("Error removing course:", err);
      alert("Failed to remove course");
    }
  }

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

  // --- Close course menu when clicking outside or pressing Esc ---
  useEffect(() => {
    function onDocClick(e) {
      if (!courseMenuOpen) return;
      // Check if click is outside the course menu dropdown
      const target = e.target;
      const isClickInsideMenu = target.closest("[data-course-menu]");
      if (!isClickInsideMenu) {
        setCourseMenuOpen(null);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setCourseMenuOpen(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [courseMenuOpen]);

  // NEW: helper to check ownership from common keys
  function isOwnerOfSession(s) {
    const ownerEmail =
      (s.created_by ||
        s.professor_email ||
        s.instructor_email ||
        s.owner_email ||
        "")
        .toString()
        .toLowerCase();
    if (!ownerEmail || !currentUserEmail) return false;
    return ownerEmail === currentUserEmail;
  }

  // NEW: handle clicking a session
  function onSessionClick(sid, owned) {
    if (owned) {
      window.location.hash = `#/session/${sid}`;
      return;
    }
    // Show banner
    setNoticeMsg("session was not created by you");
    // Auto-hide after 4s
    window.clearTimeout(onSessionClick._t);
    onSessionClick._t = window.setTimeout(() => setNoticeMsg(""), 4000);
  }

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
          zIndex: 20,
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
            {professorName} • Computer Science & Engineering
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

      {/* NEW: top-of-screen banner for notice */}
      {noticeMsg && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 15,
            background: "#fef3c7",
            color: "#92400e",
            borderBottom: "1px solid #fcd34d",
            padding: "0.6rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ fontWeight: 600 }}>{noticeMsg}</span>
          <button
            onClick={() => setNoticeMsg("")}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#92400e",
              display: "inline-flex",
              alignItems: "center",
              padding: 4,
            }}
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
            const isMenuOpen = courseMenuOpen === course.code;
            return (
              <div
                key={course.code}
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <button
                  onClick={() => setActiveCourse(course.code)}
                  style={{
                    background: isActive ? "#111" : "#fff",
                    color: isActive ? "#fff" : "#333",
                    border: isActive ? "none" : "1px solid #ddd",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    paddingRight: "2.5rem",
                    textAlign: "left",
                    boxShadow: isActive
                      ? "0 2px 6px rgba(0,0,0,0.2)"
                      : "0 1px 3px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    width: "100%",
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

                {/* 3-dot menu button */}
                <button
                  data-course-menu
                  onClick={(e) => {
                    e.stopPropagation();
                    setCourseMenuOpen(isMenuOpen ? null : course.code);
                  }}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "0.5rem",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0.25rem",
                    color: isActive ? "#fff" : "#666",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isActive
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div
                    data-course-menu
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "0.25rem",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      zIndex: 100,
                      minWidth: "120px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCourse(course.id, course.code);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.5rem 0.75rem",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        color: "#dc2626",
                        fontWeight: "500",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Create Course Button */}
          <button
            onClick={() => setShowCreateCourse(true)}
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "2px dashed #86efac",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              minWidth: "120px",
            }}
          >
            + Create Course
          </button>

          {/* Join Course Button */}
          <button
            onClick={() => setShowJoinCourse(true)}
            style={{
              background: "#eff6ff",
              color: "#1e40af",
              border: "2px dashed #93c5fd",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              minWidth: "120px",
            }}
          >
            + Join Course
          </button>
        
        {/* Add TA Button */}
          <button
            onClick={() => setShowAddTA(true)}
            style={{
              background: "#f3e8ff",
              color: "#7e22ce",
              border: "2px dashed #c084fc",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              minWidth: "120px",
            }}
          >
            + Add TA
          </button>
        </div>

        {/* Create Course Form */}
        {showCreateCourse && (
          <div
            style={{
              background: "white",
              border: "2px solid #86efac",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
                color: "#166534",
              }}
            >
              Create New Course
            </h3>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Course Code (max 6 chars)"
                value={newCourse.code}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (val.length <= 6) {
                    setNewCourse((prev) => ({ ...prev, code: val }));
                  }
                }}
                maxLength={6}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  width: "180px",
                }}
              />
              <input
                type="text"
                placeholder="Course Title"
                value={newCourse.title}
                onChange={(e) =>
                  setNewCourse((prev) => ({ ...prev, title: e.target.value }))
                }
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  flex: 1,
                  minWidth: "200px",
                }}
              />
              <button
                onClick={createCourse}
                disabled={
                  newCourse.code.length !== 6 || newCourse.title.trim() === ""
                }
                style={{
                  background:
                    newCourse.code.length === 6 &&
                    newCourse.title.trim() !== ""
                      ? "#16a34a"
                      : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor:
                    newCourse.code.length === 6 &&
                    newCourse.title.trim() !== ""
                      ? "pointer"
                      : "not-allowed",
                  fontWeight: "600",
                  fontSize: "1.2rem",
                }}
                title="Create Course"
              >
                +
              </button>
              <button
                onClick={() => {
                  setShowCreateCourse(false);
                  setNewCourse({ code: "", title: "" });
                }}
                style={{
                  background: "#fff",
                  color: "#666",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              Course code must be exactly 6 characters. Title is required.
            </p>
          </div>
        )}

        {/* Join Course Form */}
        {showJoinCourse && (
          <div
            style={{
              background: "white",
              border: "2px solid #93c5fd",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
                color: "#1e40af",
              }}
            >
              Join Existing Course
            </h3>

            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "0.5rem" }}>
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
                  placeholder="Search by course code, title... (e.g., 'CSE 442' or just '442')"
                  value={joinSearchTerm}
                  onChange={(e) => setJoinSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: "0.875rem",
                    color: "#111",
                    background: "transparent",
                  }}
                />
                {joinSearchLoading && (
                  <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                    Searching...
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {joinSearchResults.length > 0 && (
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
                  {joinSearchResults.map((course) => (
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
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f9fafb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "white")
                      }
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "#111",
                          }}
                        >
                          {course.code}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            marginTop: "0.125rem",
                          }}
                        >
                          {course.title}
                        </div>
                        {course.professor && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                              marginTop: "0.125rem",
                            }}
                          >
                            {course.professor}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => joinCourse(course.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.5rem",
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#2563eb")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#3b82f6")
                        }
                        title="Join this course"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowJoinCourse(false);
                  setJoinSearchTerm("");
                  setJoinSearchResults([]);
                }}
                style={{
                  background: "#fff",
                  color: "#666",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              Search for existing courses by code or title to join as an instructor.
            </p>
          </div>
        )}

        {/* Add TA Form */}
        {showAddTA && (
          <div
            style={{
              background: "white",
              border: "2px solid #c084fc",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
                color: "#7e22ce",
              }}
            >
              Add TA
            </h3>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Enter TA email (e.g., 'newTA@email.com')"
                value={newTA.ta_email}
                onChange={(e) =>
                  setNewTA((prev) => ({ ...prev, ta_email: e.target.value }))
                }
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  flex: 1,
                  minWidth: "200px",
                }}
              />
              <button
                onClick={addTA}
                disabled={newTA.ta_email.trim() === ''}
                style={{
                  background:
                    newTA.ta_email.trim() !== ''
                      ? "#16a34a"
                      : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor:
                    newTA.ta_email.trim() !== ''
                      ? "pointer"
                      : "not-allowed",
                  fontWeight: "600",
                  fontSize: "1.2rem",
                }}
                title="Add TA"
              >
                +
              </button>
              <button
                onClick={() => {
                  setShowAddTA(false);
                  setNewTA({ ta_email: '' });
                }}
                style={{
                  background: "#fff",
                  color: "#666",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              This will immediately enroll the TA into the course.
            </p>
          </div>
        )}

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
                {courses.find((c) => c.code === activeCourse)?.title ||
                  "Course Queue"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setShowScheduleForm((v) => !v)}
                  style={{
                    background: "#eef2ff",
                    color: "#3730a3",
                    border: "1px solid #e0e7ff",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  Schedule session
                </button>
              </div>
            </div>

            {loading && <p style={{ color: "#666" }}>Loading queue...</p>}

            {/* Sessions list for this course */}
            {sessions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {sessions.map((s) => {
                  const active = isSessionActive(s);

                  // NEW: ownership check (support multiple possible keys)
                  const owned = isOwnerOfSession(s);

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSessionClick(s.id, owned)}
                      aria-disabled={!owned}
                      title={
                        owned
                          ? "Open session"
                          : "Session not created by you"
                      }
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: owned ? "pointer" : "not-allowed",
                        opacity: owned ? 1 : 0.6,
                        userSelect: "none",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {s.day_of_week} • {s.start_time}–{s.end_time}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#555" }}>
                          {s.location || "(no location)"}
                        </div>
                        {/* Optional: show owner email for clarity if present */}
                        {(s.created_by ||
                          s.professor_email ||
                          s.instructor_email ||
                          s.owner_email) && (
                          <div style={{ fontSize: "0.75rem", color: "#777" }}>
                            Owner:{" "}
                            {s.created_by ||
                              s.professor_email ||
                              s.instructor_email ||
                              s.owner_email}
                          </div>
                        )}
                      </div>
                      <div>
                        {active ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                          >
                            Active Now
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                          >
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Schedule form */}
            {showScheduleForm && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {/* compact, consistent input styles */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(() => {
                    const common = {
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                    };
                    return (
                      <>
                        <select
                          value={newSession.day_of_week}
                          onChange={(e) =>
                            setNewSession((s) => ({
                              ...s,
                              day_of_week: e.target.value,
                            }))
                          }
                          style={{ ...common, minWidth: 120 }}
                        >
                          <option>Monday</option>
                          <option>Tuesday</option>
                          <option>Wednesday</option>
                          <option>Thursday</option>
                          <option>Friday</option>
                          <option>Saturday</option>
                          <option>Sunday</option>
                        </select>
                        <input
                          type="time"
                          value={newSession.start_time}
                          onChange={(e) =>
                            setNewSession((s) => ({
                              ...s,
                              start_time: e.target.value,
                            }))
                          }
                          style={{ ...common, width: 120 }}
                        />
                        <input
                          type="time"
                          value={newSession.end_time}
                          onChange={(e) =>
                            setNewSession((s) => ({
                              ...s,
                              end_time: e.target.value,
                            }))
                          }
                          style={{ ...common, width: 120 }}
                        />
                        <input
                          placeholder="Location"
                          value={newSession.location}
                          onChange={(e) =>
                            setNewSession((s) => ({
                              ...s,
                              location: e.target.value,
                            }))
                          }
                          style={{ ...common, flex: 1, minWidth: 200 }}
                        />
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={createSession}
                    style={{
                      background: "#111827",
                      color: "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowScheduleForm(false)}
                    style={{
                      background: "#fff",
                      color: "#111827",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sessions.length === 0 &&
              queue.map((entry, idx) => {
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
                                  headers: {
                                    "Content-Type": "application/json",
                                    Accept: "application/json",
                                  },
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
                            background:
                              entry.attendance === "present"
                                ? "#166534"
                                : "#bbf7d0",
                            color:
                              entry.attendance === "present" ? "#fff" : "#164e2e",
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
                                  headers: {
                                    "Content-Type": "application/json",
                                    Accept: "application/json",
                                  },
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
                            background:
                              entry.attendance === "absent" ? "#7f1d1d" : "#fecaca",
                            color:
                              entry.attendance === "absent" ? "#fff" : "#7f1d1d",
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
