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
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        padding: "1rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        cursor: "pointer",
        transition: "all 0.15s",
        minWidth: "280px",
        position: "relative",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
        e.currentTarget.style.borderColor = "#d1d5db";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
        e.currentTarget.style.borderColor = "#e5e7eb";
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
            color: "#111",
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
            color: "#6b7280",
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
            color: "#374151",
          }}
        >
          <Calendar size={14} color="#6b7280" />
          <span style={{ fontWeight: 500 }}>{session.dayOfWeek}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "#374151",
          }}
        >
          <Clock size={14} color="#6b7280" />
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
            color: "#374151",
          }}
        >
          <MapPin size={14} color="#6b7280" />
          <span>{session.location}</span>
        </div>
      </div>
    </div>
  );
}

export default ReservedSessionCard;
