// src/professorview.jsx
import { useState } from "react";

// Dummy data for now
const officeHours = [
  { id: 1, course: "CSE 442", date: "2025-10-10", time: "2:00 PM - 3:00 PM", location: "Room 101" },
  { id: 2, course: "CSE 442", date: "2025-10-12", time: "4:00 PM - 5:00 PM", location: "Room 102" },
];

const queue = [
  { id: 1, student: "Alice", email: "alice@buffalo.edu", status: "Waiting" },
  { id: 2, student: "Bob", email: "bob@buffalo.edu", status: "In Session" },
];

export default function ProfessorView() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f4f4f4",  // light background
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      justifyContent: "center",
      padding: 40,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 1000,
        backgroundColor: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        padding: 24,
      }}>
        <h1 style={{ marginBottom: 24 }}>Professor Dashboard</h1>
        <p>Welcome, Professor! Here you can manage office hours, queues, and more.</p>

        {/* Example buttons */}
        <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
          <button style={buttonStyle}>View Office Hours</button>
          <button style={buttonStyle}>Manage Queue</button>
          <button style={buttonStyle}>Settings</button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "12px 24px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "#4da6ff",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  flex: 1,
};