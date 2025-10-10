// frontend/src/QueueDetails.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActivitySquare, MapPin, Users } from "lucide-react";

export default function QueueDetails() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  // -------- Robust API root (works on Local: /app -> /api, Aptitude: /auto_oh/ -> /api) --------
  const ABS_BASE = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname; // e.g., /.../api/

  // Session / boot gate
  const [email, setEmail] = useState(null);
  const [booted, setBooted] = useState(false); // render only after we check

  // Live queue numbers (server-driven)
  const [yourPosition, setYourPosition] = useState(1);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [status, setStatus] = useState("Active");

  // Course model (visuals unchanged)
  const course = useMemo(
    () =>
      ({
        id: courseId || "CSE116",
        title: courseId || "CSE116",
        sessionTime: "Mon, Wed, Fri 2:00–4:00 PM",
        location: "Davis Hall 338",
        totalInQueue,
        yourPosition,
        status,
      }),
    [courseId, totalInQueue, yourPosition, status]
  );

  // Notes (local persistence)
  const storageKey = `queue_notes_${course.id}`;
  const [notes, setNotes] = useState("");
  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    if (existing !== null) setNotes(existing);
  }, [storageKey]);

  // Join + polling lifecycle (with safe session gate)
  const pollTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // 1) Check session. Only redirect if we are SURE user is not logged in.
        const sres = await fetch(`${API_ROOT}check_session.php?t=${Date.now()}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!sres.ok) {
          setBooted(true);
          return;
        }

        let sdata = null;
        try {
          sdata = await sres.json();
        } catch {
          setBooted(true);
          return;
        }

        if (sdata?.loggedIn && sdata?.email) {
          if (cancelled) return;
          setEmail(sdata.email);
        } else if (sdata && sdata.loggedIn === false) {
          navigate("/");
          return;
        } else {
          setBooted(true);
          return;
        }

        // 2) Attempt to join queue (idempotent server-side)
        try {
          const jres = await fetch(`${API_ROOT}queue_join.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "include",
            cache: "no-store",
            body: JSON.stringify({
              course_id: course.id, // can be code or id; server normalizes
              user_email: sdata.email,
              notes,
            }),
          });
          // Optional: ignore body if not ok; we'll poll for state next.
          if (!jres.ok) {
            // no-op; polling will still show current status
          }
        } catch {
          /* ignore */
        }

        // 3) Prime status and start polling
        await pollOnce();
        pollTimer.current = setInterval(pollOnce, 3000);
      } finally {
        if (!cancelled) setBooted(true);
      }
    }

    async function pollOnce() {
      try {
        const res = await fetch(
          `${API_ROOT}queue_status.php?course_id=${encodeURIComponent(course.id)}&t=${Date.now()}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (!data) return;

        if (typeof data.total === "number") setTotalInQueue(data.total);
        if (typeof data.position === "number") setYourPosition(data.position);
        if (typeof data.status === "string") setStatus(data.status);

        if (typeof data.notes === "string") {
          const currentLocal = localStorage.getItem(storageKey) ?? "";
          if ((notes ?? "") === currentLocal) {
            setNotes(data.notes);
            localStorage.setItem(storageKey, data.notes);
          }
        }
      } catch {
        // ignore transient errors
      }
    }

    bootstrap();

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_ROOT, course.id, navigate]);

  function saveNotes() {
    localStorage.setItem(storageKey, notes);
    if (email) {
      fetch(`${API_ROOT}queue_save_notes.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          course_id: course.id,
          user_email: email,
          notes,
        }),
      }).catch(() => {});
    }
    alert("Notes saved.");
  }

  async function leaveQueue() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (email) {
      try {
        await fetch(`${API_ROOT}queue_leave.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ course_id: course.id, user_email: email }),
        });
      } catch {
        /* ignore */
      }
    }
    navigate("/dashboard");
  }

  const progressPct =
    course.totalInQueue > 0
      ? Math.min(100, Math.round((course.yourPosition / course.totalInQueue) * 100))
      : 0;

  // ---- Gate rendering until we've done the session check once
  if (!booted) {
    return null; // render nothing briefly instead of flashing login/dashboard
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        background: "#f3f4f6",
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Office Hours • {course.title}
        </h1>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "#fff",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
            marginRight: 56,
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Status pill */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "12px 16px",
          margin: "16px 24px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            padding: "6px 12px",
            borderRadius: 999,
            fontWeight: 600,
          }}
        >
          {course.status}
        </span>
      </div>

      {/* Three-panel content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
          padding: "0 24px 24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Queue Status */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Queue Status
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 20,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {course.yourPosition ?? "-"}
              </div>
              <div style={{ color: "#6b7280" }}>Your Position</div>
            </div>
            <div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {course.totalInQueue}
              </div>
              <div style={{ color: "#6b7280" }}>Total in Queue</div>
            </div>
          </div>

          <div style={{ color: "#6b7280", marginBottom: 8 }}>Queue Progress</div>
          <div
            style={{
              height: 8,
              width: "100%",
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "#111827",
                transition: "width 200ms ease",
              }}
            />
          </div>
        </div>

        {/* Session Details */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Session Details
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            <DetailRow icon={<ActivitySquare size={18} />} text={course.sessionTime} />
            <DetailRow icon={<MapPin size={18} />} text={course.location} />
            <DetailRow
              icon={<Users size={18} />}
              text={`${course.totalInQueue} ${course.totalInQueue === 1 ? "student" : "students"} in queue`}
            />
          </div>
        </div>

        {/* Notes */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 12,
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Your Notes
          </h2>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Questions about assignment 3, need help with recursion, debugging issues…"
            style={{
              width: "100%",
              minHeight: 140,
              resize: "vertical",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: 12,
              fontSize: "1rem",
              color: "#111827",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <button
              onClick={saveNotes}
              style={{
                background: "#111827",
                color: "#fff",
                border: "1px solid #111827",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 600,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#1f2937")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#111827")}
            >
              Save Notes
            </button>

            <button
              onClick={leaveQueue}
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 600,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#fecaca")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#fee2e2")}
            >
              Leave Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#111827" }}>
      <span style={{ color: "#6b7280" }}>{icon}</span>
      <span style={{ fontSize: "1rem" }}>{text}</span>
    </div>
  );
}
