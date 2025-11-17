import React from "react";

export function ViewSwitcher({ activeView, onViewChange }) {
  const views = [
    { id: "student", label: "Student View" },
    { id: "ta", label: "TA View" }
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "0.25rem",
        background: "var(--bg-tertiary)",
        padding: "0.25rem",
        borderRadius: "0.5rem",
        width: "fit-content",
      }}
    >
      {views.map((view) => {
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isActive ? "var(--card-bg)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: isActive ? "0 1px 3px var(--card-shadow)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
