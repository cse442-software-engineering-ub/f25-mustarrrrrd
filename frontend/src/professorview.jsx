import React, { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfessorView() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [queue, setQueue] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSession, setNewSession] = useState({ day_of_week: 'Monday', start_time: '12:00', end_time: '13:00', location: '' });
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', title: '' });
  const [professorName, setProfessorName] = useState('Professor');

  const btnRef = useRef(null);
  const menuRef = useRef(null);
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
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.loggedIn && data.name) {
          setProfessorName(data.name);
        }
      } catch (err) {
        console.error("Error fetching professor info:", err);
      }
    }

    fetchProfessorInfo();
  }, []);

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
    return () => clearInterval(interval);
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

  async function createCourse(){
    try{
      const res = await fetch(`${API_ROOT}professor_create_course.php`,{
        method: 'POST', credentials:'include', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body: JSON.stringify({ code: newCourse.code, title: newCourse.title })
      });
      if(!res.ok) throw new Error('create course failed');
      const data = await res.json().catch(()=>null);
      if(data && data.ok){
        // Add the new course to the list
        const newCourseData = data.course;
        setCourses(prev => [...prev, newCourseData]);
        setActiveCourse(newCourseData.code);
        // Reset form
        setNewCourse({ code: '', title: '' });
        setShowCreateCourse(false);
      } else {
        alert(data?.error || 'Failed to create course');
      }
    }catch(err){
      console.error('Failed to create course', err);
      alert('Failed to create course');
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
                disabled={newCourse.code.length !== 6 || newCourse.title.trim() === ''}
                style={{
                  background:
                    newCourse.code.length === 6 && newCourse.title.trim() !== ''
                      ? "#16a34a"
                      : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  padding: "0.5rem 1rem",
                  cursor:
                    newCourse.code.length === 6 && newCourse.title.trim() !== ''
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
                  setNewCourse({ code: '', title: '' });
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

            {loading && <p style={{ color: "#666" }}>Loading queue...</p>}
            {/* Sessions list for this course */}
            {sessions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {sessions.map((s) => {
                  const active = isSessionActive(s);
                  return (
                    <div key={s.id} onClick={() => window.location.hash = `#/session/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', padding: 10, borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.day_of_week} • {s.start_time}–{s.end_time}</div>
                        <div style={{ fontSize: '0.9rem', color: '#555' }}>{s.location || '(no location)'}</div>
                      </div>
                      <div>
                        {active ? (
                          <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>Active Now</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>Upcoming</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Schedule form */}
            {showScheduleForm && (
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                {/* compact, consistent input styles */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  {(() => {
                    const common = { padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' };
                    return (
                      <>
                        <select value={newSession.day_of_week} onChange={(e)=>setNewSession(s=>({...s, day_of_week: e.target.value}))} style={{ ...common }}>
                          <option>Monday</option>
                          <option>Tuesday</option>
                          <option>Wednesday</option>
                          <option>Thursday</option>
                          <option>Friday</option>
                          <option>Saturday</option>
                          <option>Sunday</option>
                        </select>
                        <input type="time" value={newSession.start_time} onChange={(e)=>setNewSession(s=>({...s, start_time: e.target.value}))} style={{ ...common, width: 120 }} />
                        <input type="time" value={newSession.end_time} onChange={(e)=>setNewSession(s=>({...s, end_time: e.target.value}))} style={{ ...common, width: 120 }} />
                        <input placeholder="Location" value={newSession.location} onChange={(e)=>setNewSession(s=>({...s, location: e.target.value}))} style={{ ...common, flex: 1 }} />
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={createSession} style={{ background: '#111827', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Save</button>
                  <button onClick={()=>setShowScheduleForm(false)} style={{ background: '#fff', color: '#111827', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            )}
            {/* {!loading && queue.length === 0 && (
              <p style={{ color: "#666" }}>No students currently in queue.</p>
            )} */}

            {sessions.length === 0 && queue.map((entry, idx) => {
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
