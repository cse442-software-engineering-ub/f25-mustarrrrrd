// frontend/src/CourseCardDashboard.jsx
import { Star, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CourseCardDashboard({ course, onToggleFavorite, onUnenroll, isFavorited }) {
  const navigate = useNavigate();

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(course.id, isFavorited);
  };

  const handleUnenroll = (e) => {
    e.stopPropagation();
    if (onUnenroll) onUnenroll(course.id);
  };

  // Navigate to sessions view
  const handlePrimary = async () => {
    const cid = String(course.id ?? course.code ?? "");
    const slug = encodeURIComponent(course.code ?? course.id ?? cid);
    navigate(`/sessions/${slug}`);
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
        }}
      >
        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          style={{
            padding: "0.5rem",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#f9fafb";
            e.currentTarget.style.borderColor = isFavorited ? "#eab308" : "#9ca3af";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "#e5e7eb";
          }}
        >
          <Star
            size={18}
            color={isFavorited ? "#eab308" : "#9ca3af"}
            fill={isFavorited ? "#eab308" : "none"}
          />
        </button>

        {/* Primary Action Button */}
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "#111",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#1f2937";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#111";
          }}
          onClick={handlePrimary}
        >
          View Sessions
        </button>
      </div>
    </div>
  );
}

export default CourseCardDashboard;
