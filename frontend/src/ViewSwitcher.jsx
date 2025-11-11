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
        background: "#f3f4f6",
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
              background: isActive ? "#fff" : "transparent",
              color: isActive ? "#111" : "#6b7280",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#111";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#6b7280";
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
