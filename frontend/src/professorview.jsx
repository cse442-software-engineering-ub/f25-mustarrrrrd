import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Plus, MoreVertical, X, Clock } from "lucide-react";
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
  const [scheduleError, setScheduleError] = useState("");
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
  const[showRemoveTA, setShowRemoveTA] = useState(false);
  const[removeTASearchTerm, setRemoveTASearchTerm] = useState('');
  const[removeTASearchResults, setRemoveTASearchResults] = useState([]);
  const[removeTASearchLoading, setRemoveTASearchLoading] = useState(false);

  const [showAddTASuccess, setShowAddTASuccess] = useState(false);
  const [AddedTAName, setAddedTAName] = useState('');

  const [showRemoveTASuccess, setShowRemoveTASuccess] = useState(false);
  const [removedTAName, setRemovedTAName] = useState('');

  // NEW: who am I (email) + banner message
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");
  // NEW: current user role (professor or ta)
  const [currentUserRole, setCurrentUserRole] = useState("");

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
          // capture role so we can apply professor-specific privileges
          if (data.role) setCurrentUserRole(data.role);
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
    // client-side validation
    setScheduleError("");
    const [sh, sm] = (newSession.start_time || "").split(':').map(n=>parseInt(n||'0',10));
    const [eh, em] = (newSession.end_time || "").split(':').map(n=>parseInt(n||'0',10));
    const smin = (sh||0)*60 + (sm||0);
    const emin = (eh||0)*60 + (em||0);
    if (emin <= smin) {
      setScheduleError('End time must be after start time');
      return;
    }

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
        // Mark courses as already enrolled instead of filtering them out
        const enrolledCodes = new Set(courses.map((c) => c.code));
        const resultsWithEnrollmentStatus = data.courses.map((c) => ({
          ...c,
          alreadyEnrolled: enrolledCodes.has(c.code),
        }));
        setJoinSearchResults(resultsWithEnrollmentStatus);
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

  // Add this useEffect for searching TAs (place it after the joinCourse search effect):

  useEffect(() => {
    if (!removeTASearchTerm.trim() || !activeCourse) {
      setRemoveTASearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      performRemoveTASearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [removeTASearchTerm, activeCourse]);

  async function performRemoveTASearch() {
    if (!removeTASearchTerm.trim() || !activeCourse) return;

    setRemoveTASearchLoading(true);
    try {
      const res = await fetch(`${API_ROOT}search_tas.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
        query: removeTASearchTerm,
        course_id: activeCourse 
      }),
    });

    const data = await res.json();

    if (data.tas) {
      setRemoveTASearchResults(data.tas);
    } else {
      setRemoveTASearchResults([]);
    }
    } catch (err) {
      console.error("Error searching TAs:", err);
      setRemoveTASearchResults([]);
    } finally {
      setRemoveTASearchLoading(false);
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
        // Show success modal
        setAddedTAName(newTA.ta_email);
        setShowAddTASuccess(true);
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

  // Replace the old removeTAHandler function with this updated version:

  async function removeTAHandler(taEmail, taName) {
    try {
      const res = await fetch(`${API_ROOT}remove_ta.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code: activeCourse, ta_email: taEmail })
      });
      if (!res.ok) throw new Error('remove TA failed');
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        // Show success modal
        setRemovedTAName(taName || taEmail);
        setShowRemoveTASuccess(true);
        // Reset form
        setRemoveTASearchTerm('');
        setRemoveTASearchResults([]);
        setShowRemoveTA(false);
      } else {
        alert(data?.error || 'Failed to remove TA');
      }
    } catch (err) {
      console.error('Failed to remove TA', err);
      alert('Failed to remove TA');
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
      (s.created_by || s.professor_email || s.instructor_email || s.owner_email || "")
        .toString()
        .toLowerCase();
    // If the session was created by the current user, allow open
    if (ownerEmail && currentUserEmail && ownerEmail === currentUserEmail) return true;

    // Professors may also open sessions that were created by a TA for this course
    // (server returns owner_role which is the enrollment.role_in_course for the session instructor)
    if (currentUserRole === 'professor' && (s.owner_role === 'ta' || s.owner_role === 'TA')) return true;

    return false;
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
        background: "var(--bg-secondary)",
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
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--border-color)",
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
              color: "var(--text-primary)",
            }}
          >
            Instructor Dashboard
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
            {professorName}
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
      border: "1px solid var(--border-color)",
      background: "var(--card-bg)",
      cursor: "pointer",
    }}
    title="Menu"
  >
    <Menu size={20} color="var(--text-primary)" />
  </button>

  {menuOpen && (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "absolute",
        right: 0,
        marginTop: 8,
        width: 180,
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        boxShadow: "0 8px 20px var(--card-shadow)",
        overflow: "hidden",
      }}
    >
      {/* NEW: Profile */}
      <button
        onClick={() => {
          setMenuOpen(false);
          navigate("/professor/profile");
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          fontSize: 14,
          color: "var(--text-primary)",
        }}
      >
        Profile
      </button>

      <div style={{ height: 1, background: "var(--border-color)" }} />

      {/* Existing: Sign out */}
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
            <p style={{ color: "var(--text-secondary)" }}>
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
                    background: isActive ? "var(--text-primary)" : "var(--card-bg)",
                    color: isActive ? "var(--bg-primary)" : "var(--text-primary)",
                    border: isActive ? "none" : "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    paddingRight: "2.5rem",
                    textAlign: "left",
                    boxShadow: isActive
                      ? "0 2px 6px var(--card-shadow)"
                      : "0 1px 3px var(--card-shadow)",
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
                    color: isActive ? "var(--bg-primary)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isActive
                      ? "rgba(128,128,128,0.2)"
                      : "var(--bg-tertiary)";
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
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.375rem",
                      boxShadow: "0 4px 12px var(--card-shadow)",
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
                        e.currentTarget.style.background = "var(--bg-tertiary)";
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

        {/* TA Added Success Modal */}
        {showAddTASuccess && (
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
            onClick={() => setShowAddTASuccess(false)}
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
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                TA Added Successfully
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>{AddedTAName}</strong> has been successfully added to the course.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowAddTASuccess(false)}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.625rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#15803d'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#16a34a'}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove TA Button */}
          <button
            onClick={() => setShowRemoveTA(true)}
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "2px dashed #fca5a5",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.9rem",
              minWidth: "120px",
            }}
          >
            - Remove TA
          </button>
        </div>

        {/* Create Course Form */}
        {showCreateCourse && (
          <div
            style={{
              background: "var(--card-bg)",
              border: "2px solid #86efac",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px var(--card-shadow)",
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
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  width: "180px",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
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
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  flex: 1,
                  minWidth: "200px",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
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
                  background: "var(--card-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
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
                color: "var(--text-secondary)",
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
              background: "var(--card-bg)",
              border: "2px solid #93c5fd",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px var(--card-shadow)",
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
                  background: "var(--input-bg)",
                  border: "2px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  gap: "0.5rem",
                }}
              >
                <Search size={20} color="var(--text-secondary)" />
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
                    color: "var(--text-primary)",
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
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 10px 25px var(--card-shadow)",
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
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-tertiary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {course.code}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.125rem",
                          }}
                        >
                          {course.title}
                        </div>
                        {course.professor && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              marginTop: "0.125rem",
                            }}
                          >
                            {course.professor}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => !course.alreadyEnrolled && joinCourse(course.id)}
                        disabled={course.alreadyEnrolled}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.5rem",
                          background: course.alreadyEnrolled ? "#d1d5db" : "#3b82f6",
                          color: course.alreadyEnrolled ? "#9ca3af" : "white",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: course.alreadyEnrolled ? "not-allowed" : "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!course.alreadyEnrolled) {
                            e.currentTarget.style.background = "#2563eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!course.alreadyEnrolled) {
                            e.currentTarget.style.background = "#3b82f6";
                          }
                        }}
                        title={course.alreadyEnrolled ? "Already enrolled as instructor" : "Join this course"}
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
                  background: "var(--card-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
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
                color: "var(--text-secondary)",
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
              background: "var(--card-bg)",
              border: "2px solid #c084fc",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px var(--card-shadow)",
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
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  flex: 1,
                  minWidth: "200px",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
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
                  background: "var(--card-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
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
                color: "var(--text-secondary)",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              This will immediately enroll the TA into the course.
            </p>
          </div>
        )}

        {/* Remove TA Form */}
        {showRemoveTA && (
          <div
            style={{
              background: "var(--card-bg)",
              border: "2px solid #fca5a5",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              boxShadow: "0 2px 8px var(--card-shadow)",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
                color: "#991b1b",
              }}
            >
              Remove TA
            </h3>

            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--input-bg)",
                  border: "2px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  gap: "0.5rem",
                }}
              >
                <Search size={20} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search TAs by name or email... (e.g., 'John Doe' or 'johndoe@gmail.com')"
                  value={removeTASearchTerm}
                  onChange={(e) => setRemoveTASearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    background: "transparent",
                  }}
                />
                {removeTASearchLoading && (
                  <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                    Searching...
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {removeTASearchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 0.5rem)",
                    left: 0,
                    right: 0,
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 10px 25px var(--card-shadow)",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 50,
                  }}
                >
                  {removeTASearchResults.map((ta) => (
                    <div
                      key={ta.email}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-tertiary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {ta.name || ta.email}
                        </div>
                        {ta.name && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              marginTop: "0.125rem",
                            }}
                          >
                            {ta.email}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeTAHandler(ta.email)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.5rem",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          minWidth: "36px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#b91c1c";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#dc2626";
                        }}
                        title="Remove this TA"
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowRemoveTA(false);
                  setRemoveTASearchTerm("");
                  setRemoveTASearchResults([]);
                }}
                style={{
                  background: "var(--card-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
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
                color: "var(--text-secondary)",
                marginTop: "0.5rem",
                marginBottom: 0,
              }}
            >
              Search for TAs enrolled in this course to remove them.
            </p>
          </div>
        )}

        {/* TA Removed Success Modal */}
        {showRemoveTASuccess && (
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
            onClick={() => setShowRemoveTASuccess(false)}
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
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                TA Removed Successfully
              </h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>{removedTAName}</strong> has been successfully removed from the course.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRemoveTASuccess(false)}
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.625rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#15803d'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#16a34a'}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queue View */}
        {activeCourse && (
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
              padding: "1rem",
              boxShadow: "0 1px 4px var(--card-shadow)",
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
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: owned ? "pointer" : "not-allowed",
                        opacity: owned ? 1 : 0.6,
                        userSelect: "none",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {s.day_of_week} • {s.start_time}–{s.end_time}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                          {s.location || "(no location)"}
                        </div>
                        {/* Optional: show owner email for clarity if present */}
                        {(s.created_by ||
                          s.professor_email ||
                          s.instructor_email ||
                          s.owner_email) && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
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
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {/* modern, compact schedule controls */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Day</label>
                    <select value={newSession.day_of_week} onChange={(e)=>setNewSession(s=>({...s, day_of_week: e.target.value}))} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Start</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}>
                      <Clock size={16} color="var(--text-primary)" />
                      <input type="time" value={newSession.start_time} onChange={(e)=>setNewSession(s=>({...s, start_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>End</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--input-bg)' }}>
                      <Clock size={16} color="var(--text-primary)" />
                      <input type="time" value={newSession.end_time} onChange={(e)=>setNewSession(s=>({...s, end_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Location</label>
                    <input placeholder="Where (optional)" value={newSession.location} onChange={(e)=>setNewSession(s=>({...s, location: e.target.value}))} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={createSession}
                      disabled={!!scheduleError}
                      style={{
                        background: scheduleError ? '#94a3b8' : 'var(--text-primary)',
                        color: 'var(--bg-primary)',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: scheduleError ? 'not-allowed' : 'pointer',
                        boxShadow: scheduleError ? 'none' : '0 6px 18px rgba(17,24,39,0.08)'
                      }}
                    >
                      Save
                    </button>
                    {scheduleError && <div style={{ color: '#92400e', background: '#fffbeb', padding: '6px 8px', borderRadius: 6, fontSize: '0.85rem' }}>{scheduleError}</div>}
                  </div>
                  <button
                    onClick={() => setShowScheduleForm(false)}
                    style={{
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: "pointer",
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
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
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
