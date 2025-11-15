// frontend/src/ReservedSessionCard.jsx
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ReservedSessionCard({ session, onCancel }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/session/${session.sessionId}`);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(session.sessionId);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxShadow: "0 1px 2px var(--card-shadow)",
        cursor: "pointer",
        transition: "all 0.15s",
        minWidth: "280px",
        position: "relative",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 6px var(--card-shadow)";
        e.currentTarget.style.borderColor = "var(--text-secondary)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px var(--card-shadow)";
        e.currentTarget.style.borderColor = "var(--border-color)";
      }}
    >
      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        title="Cancel reservation"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
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
        <X size={16} color="#dc2626" />
      </button>

      {/* Course Info */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h3
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 0.25rem 0",
            fontSize: "0.95rem",
            paddingRight: "1.5rem",
          }}
        >
          {session.courseCode}
        </h3>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            margin: 0,
          }}
        >
          {session.courseTitle}
        </p>
      </div>

      {/* Session Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {/* Day and Time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
          }}
        >
          <Calendar size={14} color="var(--text-secondary)" />
          <span style={{ fontWeight: 500 }}>{session.dayOfWeek}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
          }}
        >
          <Clock size={14} color="var(--text-secondary)" />
          <span>
            {session.startTime} - {session.endTime}
          </span>
        </div>

        {/* Location */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
          }}
        >
          <MapPin size={14} color="var(--text-secondary)" />
          <span>{session.location}</span>
        </div>
      </div>
    </div>
  );
}

export default ReservedSessionCard;
