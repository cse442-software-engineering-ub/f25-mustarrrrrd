// frontend/src/CourseCardDashboard.jsx
import { Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// Build absolute base from Vite base (ends with /), safe in subfolders
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export function CourseCardDashboard({ course, onToggleFavorite, onUnenroll, isFavorited }) {
  const navigate = useNavigate();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(course.id, isFavorited);
  };

  const handleUnenroll = (e) => {
    e.stopPropagation();
    setShowRemoveDialog(true);
  };

  const confirmUnenroll = () => {
    setShowRemoveDialog(false);
    if (onUnenroll) onUnenroll(course.id);
  };

  const cancelUnenroll = () => {
    setShowRemoveDialog(false);
  };

  // Navigate to sessions view
  const handlePrimary = async () => {
    const cid = String(course.id ?? course.code ?? "");
    const slug = encodeURIComponent(course.code ?? course.id ?? cid);
    navigate(`/sessions/${slug}`);
  };

  // Join active session
  const handleJoinSession = async () => {
    if (course.activeSession && course.activeSession.id) {
      // Only join the queue if not already in it
      if (!course.activeSession.inQueue) {
        try {
          // Join the queue first
          const res = await fetch(`${API_ROOT}queue_join.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              course_id: course.id,
              session_id: course.activeSession.id
            })
          });
          const data = await res.json();

          // Check if there's an error (e.g., already reserved another session)
          if (!data.ok && data.error === 'already_reserved') {
            alert(data.message || 'You already have a reservation for another session in this course.');
            return;
          }
        } catch (e) {
          console.error("Error joining queue:", e);
        }
      }
      // Navigate to the session queue page
      navigate(`/session/${course.activeSession.id}`);
    }
  };

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: course.activeSession
          ? "2px solid #10b981"
          : "1px solid var(--border-color)",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxShadow: course.activeSession
          ? "0 4px 12px rgba(16, 185, 129, 0.15)"
          : "0 1px 2px var(--card-shadow)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Active Session Banner */}
      {course.activeSession && (
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.375rem",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                background: "#fff",
                borderRadius: "50%",
                boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.3)",
              }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {course.activeSession.inQueue ? "You're in Queue" : "Session Active Now"}
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                {course.activeSession.inQueue ? (
                  <>Position: {course.activeSession.position} of {course.activeSession.total} • Ends at {course.activeSession.endTime}</>
                ) : (
                  <>Ends at {course.activeSession.endTime}</>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleJoinSession}
            style={{
              background: "white",
              color: "#059669",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f0fdf4";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            {course.activeSession.inQueue ? "View Queue" : "Join"}
          </button>
        </div>
      )}

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
              color: "var(--text-primary)",
              margin: "0 0 0.25rem 0",
              fontSize: "1rem",
            }}
          >
            {course.code} - {course.name}
          </h3>
        </div>
        <button
          onClick={handleUnenroll}
          title="Remove from courses"
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
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#fee2e2";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X
            size={20}
            color="#dc2626"
          />
        </button>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          style={{
            padding: "0.5rem",
            background: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.borderColor = isFavorited ? "#eab308" : "var(--text-secondary)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border-color)";
          }}
        >
          <Star
            size={18}
            color={isFavorited ? "#eab308" : "var(--text-secondary)"}
            fill={isFavorited ? "#eab308" : "none"}
          />
        </button>

        {/* Primary Action Button */}
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "var(--button-bg)",
            color: "var(--button-text)",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--button-hover)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "var(--button-bg)";
          }}
          onClick={handlePrimary}
        >
          View Sessions
        </button>
      </div>

      {/* Remove Confirmation Dialog */}
      {showRemoveDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={cancelUnenroll}
        >
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 25px -5px var(--card-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: "0 0 0.5rem 0",
              }}
            >
              Remove Course?
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                margin: "0 0 1.5rem 0",
                lineHeight: "1.5",
              }}
            >
              Are you sure you want to remove <strong>{course.code}</strong> from your courses? This will also remove it from your favorites.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={cancelUnenroll}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "var(--card-bg)";
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUnenroll}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#b91c1c";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#dc2626";
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseCardDashboard;
