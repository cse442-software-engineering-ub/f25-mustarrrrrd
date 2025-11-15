import React, { useState, useEffect, useRef } from "react";
import { Menu, Search, Plus, MoreVertical, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ViewSwitcher } from "./ViewSwitcher";

export default function TADashboard() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [queue, setQueue] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSession, setNewSession] = useState({ day_of_week: 'Monday', start_time: '12:00', end_time: '13:00', location: '' });
  const [scheduleError, setScheduleError] = useState("");
  const [editSessionId, setEditSessionId] = useState(null);
  const [editSessionData, setEditSessionData] = useState({ day_of_week: 'Monday', start_time: '12:00', end_time: '13:00', location: '' });
  const [taName, setTAName] = useState('TA');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [noticeMsg, setNoticeMsg] = useState("");
  const noticeTimerRef = useRef(null);
  const [showJoinCourse, setShowJoinCourse] = useState(false);
  const [joinSearchTerm, setJoinSearchTerm] = useState('');
  const [joinSearchResults, setJoinSearchResults] = useState([]);
  const [joinSearchLoading, setJoinSearchLoading] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(null); // Tracks which course menu is open
  const [activeView, setActiveView] = useState("ta"); // Current view: "student" or "ta"
  const [errorMessage, setErrorMessage] = useState(""); // Custom error message

  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const errorTimerRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Use correct API root for XAMPP
  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  // Parse 12-hour time format "3:00 PM" to 24-hour { hours, minutes }
  function parse12HourTime(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.trim().split(' '); // ["3:00", "PM"]
    if (parts.length !== 2) return { hours: 0, minutes: 0 };

    const [timePart, period] = parts;
    const [h, m] = timePart.split(':').map(nt => parseInt(nt, 10) || 0);

    let hours = h;
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes: m };
  }

  // --- Fetch TA info from session ---
  useEffect(() => {
    async function fetchTAInfo() {
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

        // Check if user is a TA or professor (this is the TA dashboard)
        if (data.role === "student") {
          // Wrong dashboard - redirect to student dashboard
          navigate("/dashboard");
          return;
        }

        // Professors can access this view too
        // TAs can switch between this and student dashboard

        if (data.loggedIn) {
          if (data.name) setTAName(data.name);
          if (data.user_id) setCurrentUserId(data.user_id);
          if (data.role) setCurrentUserRole(data.role);
        }
      } catch (err) {
        console.error("Error fetching TA info:", err);
        navigate("/");
      }
    }

    fetchTAInfo();
  }, [navigate]);

  // --- Fetch TA's assigned courses ---
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch(`${API_ROOT}professor_courses.php`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          console.error("Failed to load TA courses:", res.status);
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
        console.error("Error loading TA courses:", err);
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
    // fetch sessions too
    fetchSessions();
    const sInterval = setInterval(fetchSessions, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(sInterval);
    };
  }, [activeCourse]);

  async function fetchSessions(){
    try{
      const res = await fetch(`${API_ROOT}office_hours_sessions_list.php?course_id=${encodeURIComponent(activeCourse)}`, { credentials: 'include', headers:{Accept:'application/json'} });
      if(!res.ok){ console.error('Failed to load sessions', res.status); return; }
      const data = await res.json().catch(()=>null);
      if(!(data && data.ok && Array.isArray(data.sessions))){ console.error('Invalid sessions response', data); return; }

      // normalize and sort sessions: Monday..Sunday then start_time ascending
      const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const dayIdx = (d)=> Math.max(0, dayOrder.indexOf(d));

      const sorted = data.sessions.slice().sort((a,b)=>{
        const da = dayIdx(a.day_of_week);
        const db = dayIdx(b.day_of_week);
        if(da !== db) return da - db;
        // compare start_time strings 'HH:MM'
        if((a.start_time||'') < (b.start_time||'')) return -1;
        if((a.start_time||'') > (b.start_time||'')) return 1;
        return 0;
      });

      // avoid flicker: only update state when data actually changed
      try{
        const prev = JSON.stringify(sessions || []);
        const next = JSON.stringify(sorted || []);
        if(prev !== next){
          setSessions(sorted);
        }
      }catch(e){
        setSessions(sorted);
      }
    }catch(err){ console.error('Error fetching sessions',err); }
  }

  function isSessionActive(s){
    try{
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const now = new Date();
      const today = days[now.getDay()];
      if(s.day_of_week !== today) return false;
      // s.start_time like "3:00 PM"
      const { hours: sh, minutes: sm } = parse12HourTime(s.start_time);
      const { hours: eh, minutes: em } = parse12HourTime(s.end_time);
      const nowMinutes = now.getHours()*60 + now.getMinutes();
      const startMinutes = sh*60 + sm;
      const endMinutes = eh*60 + em;
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }catch(e){ return false; }
  }

  async function createSession(){
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

    try{
      const res = await fetch(`${API_ROOT}create_office_hours_session.php`,{
        method: 'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ course_id: activeCourse, ...newSession })
      });
      if(!res.ok) throw new Error('create failed');
      const data = await res.json().catch(()=>null);
      if(data && data.ok){
        setShowScheduleForm(false);
        // refresh sessions
        fetchSessions();
      }
    }catch(err){ console.error('Failed to create session', err); }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: joinSearchTerm, filter: 'None' }),
      });

      const data = await res.json();

      if (data.courses) {
        // Mark courses as already enrolled instead of filtering them out
        const enrolledCodes = new Set(courses.map(c => c.code));
        const resultsWithEnrollmentStatus = data.courses.map(c => ({
          ...c,
          alreadyEnrolled: enrolledCodes.has(c.code),
        }));
        setJoinSearchResults(resultsWithEnrollmentStatus);
      } else {
        setJoinSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching courses:', err);
      setJoinSearchResults([]);
    } finally {
      setJoinSearchLoading(false);
    }
  }

  async function joinCourse(courseId) {
    try {
      const res = await fetch(`${API_ROOT}enroll.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId, role: 'ta' }),
      });

      const data = await res.json();

      if (data.success) {
        // Refetch courses to include the newly joined course
        const coursesRes = await fetch(`${API_ROOT}professor_courses.php`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          if (coursesData.ok && Array.isArray(coursesData.courses)) {
            setCourses(coursesData.courses);
            // Set the newly joined course as active
            const joinedCourse = coursesData.courses.find(c => c.id === courseId);
            if (joinedCourse) {
              setActiveCourse(joinedCourse.code);
            }
          }
        }

        // Clear search
        setJoinSearchTerm('');
        setJoinSearchResults([]);
        setShowJoinCourse(false);
      } else {
        // Show custom error message
        setErrorMessage(data?.error || 'Failed to join course');
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorMessage(""), 5000);
      }
    } catch (err) {
      console.error('Error joining course:', err);
      setErrorMessage('Failed to join course');
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setErrorMessage(""), 5000);
    }
  }

  async function handleRemoveCourse(courseId, courseCode) {
    try {
      const res = await fetch(`${API_ROOT}unenroll.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove course from local state
        setCourses(prev => prev.filter(c => c.id !== courseId));

        // If removed course was active, set another as active
        if (activeCourse === courseCode) {
          const remainingCourses = courses.filter(c => c.id !== courseId);
          setActiveCourse(remainingCourses.length > 0 ? remainingCourses[0].code : null);
        }

        // Close the menu
        setCourseMenuOpen(null);
      } else {
        // Show custom error message
        setErrorMessage(data?.error || 'Failed to remove course');
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorMessage(""), 5000);
      }
    } catch (err) {
      console.error('Error removing course:', err);
      setErrorMessage('Failed to remove course');
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setErrorMessage(""), 5000);
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

  // Handle view switching
  function handleViewChange(newView) {
    if (newView === "student") {
      navigate("/dashboard");
    } else {
      setActiveView(newView);
    }
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
      const isClickInsideMenu = target.closest('[data-course-menu]');
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

  // cleanup notice timer on unmount
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // cleanup error timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "500",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              TA Dashboard
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
              {taName}
            </p>
          </div>

          {/* View Switcher (only for TAs, not professors) */}
          {currentUserRole === "ta" && (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              <ViewSwitcher activeView={activeView} onViewChange={handleViewChange} />
            </div>
          )}

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
                  width: 160,
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  boxShadow: "0 8px 20px var(--card-shadow)",
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
                    color: "var(--error-color)",
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Error Banner */}
      {errorMessage && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 15,
            background: "#fef2f2",
            color: "#991b1b",
            borderBottom: "1px solid #fecaca",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "64rem",
            margin: "0 auto",
          }}
          role="alert"
          aria-live="assertive"
        >
          <span style={{ fontWeight: 600 }}>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage("")}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#991b1b",
              display: "inline-flex",
              alignItems: "center",
              padding: 4,
            }}
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Top banner for TA notices (e.g., trying to open a session they didn't create) */}
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
            maxWidth: "64rem",
            margin: "0 auto",
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
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem" }}>
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
              You have no assigned courses yet. Please join one first.
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
                    background: isActive ? "var(--button-bg)" : "var(--card-bg)",
                    color: isActive ? "var(--button-text)" : "var(--text-primary)",
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
                    color: isActive ? "var(--button-text)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isActive ? "var(--bg-tertiary)" : "var(--bg-tertiary)";
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
        </div>

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
                  background: "var(--card-bg)",
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
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
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
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                          {course.code}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.125rem" }}>
                          {course.title}
                        </div>
                        {course.professor && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.125rem" }}>
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
                        title={course.alreadyEnrolled ? "Already enrolled as TA" : "Join this course"}
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
                  setJoinSearchTerm('');
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
              Search for existing courses by code or title to join as a TA.
            </p>
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
                  color: "var(--text-primary)",
                }}
              >
                {activeCourse} —{" "}
                {
                  courses.find((c) => c.code === activeCourse)?.title ||
                  "Course Queue"
                }
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setShowScheduleForm((v) => !v)}
                  style={{
                    background: '#eef2ff',
                    color: '#3730a3',
                    border: '1px solid #e0e7ff',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Schedule session
                </button>
              </div>
            </div>

            {loading && <p style={{ color: "var(--text-secondary)" }}>Loading queue...</p>}
            {/* Sessions list for this course */}
            {sessions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {sessions.map((s) => {
                  const active = isSessionActive(s);
                  // TAs can only open sessions they created (instructor_id === currentUserId)
                  const taCanOpen = Number(currentUserId) === Number(s.instructor_id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (taCanOpen) {
                          window.location.hash = `#/session/${s.id}`;
                        } else {
                          // show banner like the professor view
                          setNoticeMsg("session was not created by you");
                          if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
                          // auto-hide after 4s
                          noticeTimerRef.current = window.setTimeout(() => setNoticeMsg(""), 4000);
                        }
                      }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: 10, borderRadius: 8, marginBottom: 8, cursor: taCanOpen ? 'pointer' : 'not-allowed', opacity: taCanOpen ? 1 : 0.6 }}
                    >
                        <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.day_of_week} • {s.start_time}–{s.end_time}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{s.location || '(no location)'}</div>
                        {/* Owner tag: show who created the session when available */}
                        {(s.created_by || s.professor_email || s.instructor_email || s.owner_email) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Owner: {s.created_by || s.professor_email || s.instructor_email || s.owner_email}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {active ? (
                          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>Active Now</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>Upcoming</span>
                        )}
                        {(currentUserRole === 'professor' || Number(currentUserId) === Number(s.instructor_id)) && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditSessionId(s.id); setEditSessionData({ day_of_week: s.day_of_week || 'Monday', start_time: s.start_time || '12:00', end_time: s.end_time || '13:00', location: s.location || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                            <button onClick={async (e) => { e.stopPropagation(); if(!window.confirm('Delete this session?')) return; try{ const res = await fetch(`${API_ROOT}delete_office_hours_session.php`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify({ session_id: s.id }) }); if(!res.ok) throw new Error('delete failed'); const d = await res.json().catch(()=>null); if(d && d.ok){ fetchSessions(); } }catch(err){ console.error('Failed to delete session', err); alert('Failed to delete session'); } }} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Schedule form */}
            {showScheduleForm && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                {/* compact, consistent input styles */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const common = { padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' };
                    return (
                      <>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Day</label>
                            <select value={newSession.day_of_week} onChange={(e)=>setNewSession(s=>({...s, day_of_week: e.target.value}))} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontWeight: 600 }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                              <Clock size={16} />
                              <input type="time" value={newSession.start_time} onChange={(e)=>setNewSession(s=>({...s, start_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>End</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                              <Clock size={16} />
                              <input type="time" value={newSession.end_time} onChange={(e)=>setNewSession(s=>({...s, end_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Location</label>
                            <input placeholder="Where (optional)" value={newSession.location} onChange={(e)=>setNewSession(s=>({...s, location: e.target.value}))} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={createSession} disabled={!!scheduleError} style={{ background: scheduleError ? '#94a3b8' : 'var(--button-bg)', color: 'var(--button-text)', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 600, cursor: scheduleError ? 'not-allowed' : 'pointer' }}>Save</button>
                    {scheduleError && <div style={{ color: '#92400e', background: '#fffbeb', padding: '6px 8px', borderRadius: 6, fontSize: '0.85rem' }}>{scheduleError}</div>}
                  </div>
                  <button onClick={()=>setShowScheduleForm(false)} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Edit session form (for TAs) */}
            {editSessionId && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <h3 style={{ marginTop: 0, marginBottom: 8, color: 'var(--text-primary)' }}>Edit Session</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    return (
                      <>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Day</label>
                            <select value={editSessionData.day_of_week} onChange={(e)=>setEditSessionData(s=>({...s, day_of_week: e.target.value}))} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', fontWeight: 600 }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                              <Clock size={16} />
                              <input type="time" value={editSessionData.start_time} onChange={(e)=>setEditSessionData(s=>({...s, start_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>End</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                              <Clock size={16} />
                              <input type="time" value={editSessionData.end_time} onChange={(e)=>setEditSessionData(s=>({...s, end_time: e.target.value}))} style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Location</label>
                            <input placeholder="Where (optional)" value={editSessionData.location} onChange={(e)=>setEditSessionData(s=>({...s, location: e.target.value}))} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async ()=>{
                    // client-side validation for edit
                    try{
                      const [sh, sm] = (editSessionData.start_time || '').split(':').map(n=>parseInt(n||'0',10));
                      const [eh, em] = (editSessionData.end_time || '').split(':').map(n=>parseInt(n||'0',10));
                      const smin = (sh||0)*60 + (sm||0);
                      const emin = (eh||0)*60 + (em||0);
                      if (emin <= smin) { alert('End time must be after start time'); return; }

                      const body = { session_id: editSessionId, ...editSessionData };
                      const res = await fetch(`${API_ROOT}update_office_hours_session.php`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'}, body: JSON.stringify(body) });
                      if(!res.ok) throw new Error('update failed');
                      const d = await res.json().catch(()=>null);
                      if(d && d.ok){ setEditSessionId(null); fetchSessions(); }
                    }catch(e){ console.error('Failed to update session', e); alert('Failed to update session'); }
                  }} style={{ background: 'var(--button-bg)', color: 'var(--button-text)', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Save</button>
                  <button onClick={()=>setEditSessionId(null)} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            )}

            

            {sessions.length === 0 && queue.map((entry, idx) => {
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
                    <p style={{ fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                      {entry.user_email}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
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
                      color: "var(--text-primary)",
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
