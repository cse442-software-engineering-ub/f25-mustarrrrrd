// frontend/src/QueueDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActivitySquare, MapPin, Users } from "lucide-react";

export default function QueueDetails() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  // Demo course data (can be wired up later)
  const course = useMemo(
    () =>
      ({
        id: courseId || "CSE116",
        title: courseId || "CSE116",
        sessionTime: "Mon, Wed, Fri 2:00–4:00 PM",
        location: "Davis Hall 338",
        totalInQueue: 0,
        yourPosition: 1,
        status: "Active",
      }),
    [courseId]
  );

  // Notes persisted per course
  const storageKey = `queue_notes_${course.id}`;
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    if (existing !== null) setNotes(existing);
  }, [storageKey]);

  function saveNotes() {
    localStorage.setItem(storageKey, notes);
    alert("Notes saved.");
  }

  // Leave → Dashboard (server hook can be added later)
  function leaveQueue() {
    navigate("/dashboard");
  }

  const progressPct =
    course.totalInQueue > 0
      ? Math.min(100, Math.round((course.yourPosition / course.totalInQueue) * 100))
      : 0;

  return (
    <div
      style={{
        // FULL-BLEED: fill entire viewport, no black borders
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
            marginRight: 56, // nudged left from dark-mode button area
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
                {course.yourPosition}
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
