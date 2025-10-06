import React, { useState } from "react";
import { Search, Filter } from "lucide-react";

export default function MyCourses() {
  const [activeTab, setActiveTab] = useState("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]); // ⬅ stores search results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  async function searchCourse() {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_ROOT}search_courses.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm }),
      });

      const text = await res.text();

      const data = JSON.parse(text);

      if (data.courses) {
        setResults(data.courses);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("❌ Error searching courses:", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        .search-bar-wrap {
          position: fixed;
          top: 130px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          z-index: 1000;
          background: var(--bg);
          padding: 12px 0;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: var(--panel);
          border: 1px solid #222;
          border-radius: 12px;
          width: 80%;
          max-width: 700px;
          padding: 10px 14px;
          box-sizing: border-box;
        }

        .search-bar input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 15px;
          outline: none;
          margin: 0 10px;
        }

        .search-bar svg {
          color: #9b9b9b;
          flex-shrink: 0;
        }

        .results {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .course-card {
          background: var(--panel);
          border: 1px solid var(--divider);
          border-radius: 12px;
          width: 80%;
          max-width: 700px;
          padding: 16px;
          text-align: left;
          transition: background 150ms;
        }

        .course-card:hover {
          background: #1a1a1a;
        }

        .course-title {
          font-size: 16px;
          font-weight: 600;
        }

        .course-meta {
          color: var(--muted);
          font-size: 14px;
          margin-top: 4px;
        }

        .mc-main {
          padding: 220px 28px 60px;
          box-sizing: border-box;
          background: var(--bg);
          min-height: 100vh; 
          width: 100%;
          text-align: center;
        }

        @media (max-width: 640px) {
          .mc-title { font-size: 18px; }
          .mc-tabs { width: 96%; padding: 6px; }
          .mc-tab { padding: 10px 14px; font-size: 13px; margin: 0 6px; }
          .search-bar { width: 90%; }
          .mc-main { padding-top: 200px; }
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
            Find Courses
          </button>
        </div>
      </div>

      {/* Search bar (only for "Find Courses") */}
      {activeTab === "find" && (
        <div className="search-bar-wrap">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by course code or name (i.e. CSE220, Systems Programming)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCourse()}
            />
            <Filter size={18} onClick={searchCourse} style={{ cursor: "pointer" }} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mc-main">
        {activeTab === "my" ? (
          <p style={{ color: "#9a9a9a" }}>
            This is where your courses will appear.
          </p>
        ) : (
          <>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div className="results">
              {results.length > 0 ? (
                results.map((course, idx) => (
                  <div key={idx} className="course-card">
                    <div className="course-title">
                      {course.code} — {course.title}
                    </div>
                    <div className="course-meta">
                      {course.lecture_times} • {course.room}
                    </div>
                  </div>
                ))
              ) : (
                !loading && <p style={{ color: "#9a9a9a" }}>No results found.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
