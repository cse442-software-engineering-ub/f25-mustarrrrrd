import React, { useState } from "react";

const MAX = 191;
const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export default function ProfCourses() {
  const [activeTab, setActiveTab] = useState("my");

  // State for inputs
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [lectureTimes, setLectureTimes] = useState("");
  const [room, setRoom] = useState("");

  const clamp = (s) => s.slice(0, MAX);

  // ✅ Async function to create course
  async function createCourse() {
    const courseData = {
      code,
      name,
      lectureTimes,
      room,
    };

    try {
      const res = await fetch(`${API_ROOT}create_course.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      const data = await res.json();
      console.log("Server response:", data);
      alert("Course created successfully!");
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Error creating course. Please try again.");
    }
  }
  
  return (
    <div className="mc-root">
      <style>{`
        html, body, #root, .mc-root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          background: #000000;
        }

        .mc-root {
          --bg: #000000;
          --panel: #111111;
          --panel-2: #1a1a1a;
          --muted: #9b9b9b;
          --divider: #222;
          color: #fff;
          min-height: 100vh;
          width: 100%;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          background: var(--bg);
        }

        .mc-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1200;
          border-bottom: 1px solid var(--divider);
          background: var(--bg);
        }

        .mc-header-inner {
          width: 100%;
          padding: 18px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .mc-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
        }

        .mc-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .mc-back {
          background: var(--panel);
          color: #fff;
          border: 1px solid #2a2a2a;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        .mc-back:hover { background: var(--panel-2); }

        .mc-tabs-wrap {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          z-index: 1100;
          padding: 12px 0;
          background: var(--bg);
        }

        .mc-tabs {
          display: flex;
          justify-content: center;
          background: var(--panel);
          padding: 8px;
          border-radius: 28px;
          box-sizing: border-box;
        }

        .mc-tab {
          background: transparent;
          border: none;
          color: var(--muted);
          padding: 10px 36px;
          border-radius: 20px;
          margin: 0 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 120ms, color 120ms, transform 120ms;
        }
        .mc-tab:hover { color: #fff; transform: translateY(-1px); }
        .mc-tab.active { background: #333; color: #fff; font-weight: 600; }

        .mc-main {
          padding: 180px 28px 60px; /* slightly reduced padding */
          box-sizing: border-box;
          background: var(--bg);
          min-height: 100vh; 
          width: 100%;
        }

        /* Form styling */
        .course-form {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px; /* reduced vertical spacing */
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px; /* slightly reduced */
        }

        .form-group label {
          font-size: 14px;
          color: #ccc;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;    
          padding: 12px; /* smaller height */
          border-radius: 10px;
          border: 1px solid #333;
          background: #111;
          color: #fff;
          font-size: 15px; /* slightly smaller */
        }

        .form-group textarea {
          min-height: 60px; /* reduced height */
          resize: vertical;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #555;
          background: #181818;
        }

        /* Create Course Button */
        .create-btn {
          margin-top: 8px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          color: #000;
          background: #fff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 150ms, transform 100ms;
          align-self: center;
          width: 45%; /* fits better */
          max-width: 260px;
          text-align: center;
        }

        .create-btn:hover {
          background: #e6e6e6;
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .mc-title { font-size: 18px; }
          .mc-tabs { width: 96%; padding: 6px; }
          .mc-tab { padding: 10px 14px; font-size: 13px; margin: 0 6px; }
          .mc-main { padding-top: 160px; }
          .create-btn { width: 80%; }
        }
      `}</style>

      {/* Header */}
      <header className="mc-header">
        <div className="mc-header-inner">
          <h1 className="mc-title">My Courses</h1>
          <div className="mc-controls">
            <button
              className="mc-back"
              onClick={() => console.log("Back to dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mc-tabs-wrap">
        <div className="mc-tabs">
          <button
            className={`mc-tab ${activeTab === "my" ? "active" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            My Courses 
          </button>
          <button
            className={`mc-tab ${activeTab === "find" ? "active" : ""}`}
            onClick={() => setActiveTab("find")}
          >
            Create Courses
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="mc-main">
        {activeTab === "my" ? (
          <p style={{ color: "#9a9a9a" }}>
            This is where your courses will appear.
          </p>
        ) : (
          <form className="course-form">
            <div className="form-group">
              <label>Code</label>
              <input 
                type="text" 
                placeholder="e.g. CSE220" 
                onChange={(e) => setCode(clamp(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                placeholder="e.g. Systems Programming" 
                onChange={(e) => setName(clamp(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Lecture Times</label>
              <input 
                type="text" 
                placeholder="e.g. MWF 1:00-1:50 PM" 
                onChange={(e) => setLectureTimes(clamp(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Room</label>
              <input 
                type="text" 
                placeholder="e.g. Davis 110" 
                onChange={(e) => setRoom(clamp(e.target.value))}
              />
            </div>
            {/* Create Course Button */}
            <button type="button" onClick={createCourse} className="create-btn">
              Create Course
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
