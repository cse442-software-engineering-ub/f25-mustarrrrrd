// frontend/src/CourseCardDashboard.jsx
import { Star, Clock, MapPin, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function CourseCardDashboard({ course, onRemoveFavorite }) {
  const navigate = useNavigate();

  // Build absolute API root that works in subfolders (local and Aptitude)
  const ABS_BASE = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  // Session email (resolved once)
  const [email, setEmail] = useState(null);

  // Live queue state for this course
  const [totalInQueue, setTotalInQueue] = useState(
    typeof course.studentsInQueue === "number" ? course.studentsInQueue : 0
  );
  const [inQueue, setInQueue] = useState(false); // true if this user is queued
  const [position, setPosition] = useState(null); // optional: your position

  const pollTimer = useRef(null);

  // Resolve session and start polling this course’s status
  useEffect(() => {
    let cancelled = false;

    async function getSession() {
      try {
        const res = await fetch(`${API_ROOT}check_session.php?t=${Date.now()}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || !data.loggedIn) return;
        if (!cancelled) setEmail(data.email);
      } catch {
        /* ignore */
      }
    }

    async function poll() {
      try {
        const cid = String(course.id ?? course.code ?? "");
        const res = await fetch(
          `${API_ROOT}queue_status.php?course_id=${encodeURIComponent(cid)}&t=${Date.now()}`,
          { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }
        );
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;
        if (typeof data.total === "number") setTotalInQueue(data.total);
        // If server sees your session, it returns position (number) when you’re in the queue.
        setInQueue(typeof data.position === "number" && data.position >= 1);
        setPosition(typeof data.position === "number" ? data.position : null);
      } catch {
        /* ignore */
      }
    }

    (async () => {
      await getSession();
      await poll();
      pollTimer.current = setInterval(poll, 5000);
    })();

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_ROOT, course.id, course.code]);

  const handleRemoveFavorite = (e) => {
    e.stopPropagation();
    if (onRemoveFavorite) onRemoveFavorite(course.id);
  };

  // Join or view depending on state
  const handlePrimary = async () => {
    const cid = String(course.id ?? course.code ?? "");
    const slug = encodeURIComponent(course.code ?? course.id ?? cid);

    // If already in queue -> go straight to details
    if (inQueue) {
      navigate(`/queue/${slug}`);
      return;
    }

    // Otherwise try to ensure session, join, then go to details
    try {
      const sres = await fetch(`${API_ROOT}check_session.php?t=${Date.now()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const sdata = await sres.json().catch(() => ({}));
      if (!sdata?.loggedIn || !sdata?.email) {
        navigate("/");
        return;
      }

      await fetch(`${API_ROOT}queue_join.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          course_id: cid,       // server can resolve code or numeric id
          user_email: sdata.email,
          notes: "",
        }),
      }).catch(() => {});
    } finally {
      navigate(`/queue/${slug}`);
    }
  };

  // Basic green vs default button styles
  const primaryLabel = inQueue ? "View Queue" : "Join Queue";
  const primaryStyle = inQueue
    ? {
        padding: "0.5rem 1rem",
        background: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        cursor: "pointer",
        fontWeight: 600,
      }
    : {
        padding: "0.5rem 1rem",
        background: "#111",
        color: "white",
        border: "none",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        cursor: "pointer",
        fontWeight: 600,
      };

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Course Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h3
            style={{
              fontWeight: 600,
              color: "#111",
              margin: "0 0 0.25rem 0",
              fontSize: "1rem",
            }}
          >
            {course.code} - {course.name}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              margin: 0,
            }}
          >
            <Users size={12} />
            {course.professor}
          </p>
        </div>
        <button
          onClick={handleRemoveFavorite}
          title="Remove from favorites"
          style={{
            padding: "0.25rem",
            background: "transparent",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Star size={20} color="#eab308" fill="#eab308" />
        </button>
      </div>

      {/* Status Badge */}
      <div style={{ marginBottom: "0.75rem" }}>
        <span
          style={{
            padding: "0.25rem 0.5rem",
            background: course.status === "available" ? "#10b981" : "#3b82f6",
            color: "white",
            borderRadius: "0.25rem",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          {course.status === "available" ? "Available Now" : "Upcoming"}
        </span>
      </div>

      {/* Course Details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: 0,
          }}
        >
          <Clock size={16} />
          {course.time}
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: 0,
          }}
        >
          <MapPin size={16} />
          {course.location}
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: 0,
          }}
        >
          <Users size={16} />
          {totalInQueue} {totalInQueue === 1 ? "student" : "students"} in queue
          {inQueue && typeof position === "number" ? ` • your position ${position}` : ""}
        </p>
      </div>

      {/* Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <button
          style={primaryStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.background = inQueue ? "#059669" : "#1f2937";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = inQueue ? "#10b981" : "#111";
          }}
          onClick={handlePrimary}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

export default CourseCardDashboard;
