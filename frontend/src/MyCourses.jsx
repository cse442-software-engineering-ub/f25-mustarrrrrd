import React, { useState } from "react";
import { Search, Filter, Star, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyCourses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]); // stores search results
  const [myCourses, setMyCourses] = useState([]); // stores enrolled courses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterOption, setFilterOption] = useState("None");
  const [hasSearched, setHasSearched] = useState(false); // ⬅ track if user searched at least once

  const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
  const API_ROOT = new URL("../api/", ABS_BASE).pathname;

  // Fetch enrolled courses when tab switches to "my"
  React.useEffect(() => {
    if (activeTab === "my") {
      fetchMyCourses();
    } else if (activeTab === "find") {
      // Clear search results when switching to Find Courses tab
      setResults([]);
      setHasSearched(false);
    }
  }, [activeTab]);

  async function fetchMyCourses() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_ROOT}my_courses.php`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (data.courses) {
        setMyCourses(data.courses);
      } else {
        setMyCourses([]);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load your courses.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCourse() {
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(true);
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true); // ⬅ mark that a search has happened

    try {
      const res = await fetch(`${API_ROOT}search_courses.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm, filter: filterOption }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (data.courses) {
        // Fetch favorites and enrollments to mark courses
        const [favRes, enrollRes] = await Promise.all([
          fetch(`${API_ROOT}favorites.php`, { method: "GET", credentials: "include" }),
          fetch(`${API_ROOT}my_courses.php`, { method: "GET", credentials: "include" })
        ]);

        const favData = await favRes.json();
        const enrollData = await enrollRes.json();

        const favoriteIds = new Set(favData.favorites?.map(f => f.id) || []);
        const enrolledIds = new Set(enrollData.courses?.map(c => c.id) || []);

        // Add is_favorited and is_enrolled flags to search results
        const coursesWithFlags = data.courses.map(course => ({
          ...course,
          is_favorited: favoriteIds.has(course.id),
          is_enrolled: enrolledIds.has(course.id)
        }));
        setResults(coursesWithFlags);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Error searching courses:", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectFilter(option) {
    setFilterOption(option);
    setFilterOpen(false);
  }

  async function toggleFavorite(courseId, currentlyFavorited) {
    try {
      const method = currentlyFavorited ? "DELETE" : "POST";
      await fetch(`${API_ROOT}favorites.php`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId }),
      });

      // Update local state
      if (activeTab === "find") {
        setResults(results.map(course =>
          course.id === courseId
            ? { ...course, is_favorited: !currentlyFavorited }
            : course
        ));
      } else {
        setMyCourses(myCourses.map(course =>
          course.id === courseId
            ? { ...course, is_favorited: !currentlyFavorited }
            : course
        ));
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  }

  async function joinCourse(courseId) {
    try {
      const res = await fetch(`${API_ROOT}enroll.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId, role: "student" }),
      });

      const data = await res.json();

      if (data.success) {
        // Update the search results to show the course is now enrolled
        setResults(results.map(course =>
          course.id === courseId
            ? { ...course, is_enrolled: true }
            : course
        ));

        // Automatically switch to My Courses tab to show the newly joined course
        setActiveTab("my");
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Error joining course:", err);
      setError("Failed to join course. Please try again.");
    }
  }

  async function unenrollCourse(courseId) {
    try {
      const res = await fetch(`${API_ROOT}unenroll.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ course_id: courseId }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove the course from myCourses list
        setMyCourses(myCourses.filter(course => course.id !== courseId));
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Error unenrolling from course:", err);
      setError("Failed to unenroll from course. Please try again.");
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
          position: relative;
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

        /* Dropdown styles */
        .filter-dropdown {
          position: absolute;
          right: 0;
          top: 46px;
          background: var(--panel);
          border: 1px solid var(--divider);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          z-index: 2000;
          width: 160px;
        }

        .filter-item {
          padding: 10px 14px;
          color: var(--muted);
          font-size: 14px;
          cursor: pointer;
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
        }

        .filter-item:hover {
          background: var(--panel-2);
          color: #fff;
        }

        .filter-selected {
          color: #fff;
          font-weight: 600;
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
          position: relative;
        }

        .course-card:hover {
          background: #1a1a1a;
        }

        .course-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .course-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .course-meta {
          color: var(--muted);
          font-size: 14px;
          margin-top: 4px;
        }

        .course-credits {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }

        .course-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .star-btn, .join-btn {
          padding: 6px;
          background: transparent;
          border: 1px solid #333;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 120ms;
        }

        .star-btn:hover {
          background: #222;
        }

        .join-btn {
          padding: 6px 12px;
          background: #fff;
          color: #000;
          font-size: 13px;
          font-weight: 500;
        }

        .join-btn:hover {
          background: #e5e5e5;
        }

        .unenroll-btn {
          padding: 6px 12px;
          background: #dc2626;
          color: #fff;
          border: 1px solid #b91c1c;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 120ms;
        }

        .unenroll-btn:hover {
          background: #b91c1c;
        }

        .joined-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #10b981;
          font-size: 13px;
          font-weight: 500;
          margin-top: 8px;
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
              onClick={() => navigate("/dashboard")}
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
              placeholder={`Search by ${
                filterOption === "None"
                  ? "code, title, or professor"
                  : filterOption.toLowerCase()
              } (e.g. CSE220, Systems Programming, Blanton)`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCourse()}
            />
            <div style={{ position: "relative" }}>
              <Filter
                size={18}
                onClick={() => setFilterOpen(!filterOpen)}
                style={{ cursor: "pointer" }}
              />
              {filterOpen && (
                <div className="filter-dropdown">
                  {["None", "Code", "Title", "Professor"].map((opt) => (
                    <button
                      key={opt}
                      className={`filter-item ${
                        filterOption === opt ? "filter-selected" : ""
                      }`}
                      onClick={() => selectFilter(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mc-main">
        {activeTab === "my" ? (
          <>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div className="results">
              {myCourses.length > 0 ? (
                myCourses.map((course, idx) => (
                  <div key={idx} className="course-card">
                    <div className="course-header">
                      <div>
                        <h3 className="course-title">
                          {course.code}
                        </h3>
                        <p style={{ color: '#ccc', fontSize: '14px', margin: '0 0 8px 0' }}>
                          {course.title}
                        </p>
                        <div className="course-meta">
                          Professor {course.professor} • {course.lecture_times} • {course.room}
                        </div>
                        <div className="joined-indicator">
                          ✓ Joined
                        </div>
                      </div>
                      <div className="course-actions">
                        <button
                          className="star-btn"
                          onClick={() => toggleFavorite(course.id, course.is_favorited)}
                          title={course.is_favorited ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star
                            size={18}
                            color={course.is_favorited ? "#eab308" : "#666"}
                            fill={course.is_favorited ? "#eab308" : "none"}
                          />
                        </button>
                        <button
                          className="unenroll-btn"
                          onClick={() => unenrollCourse(course.id)}
                          title="Unenroll from course"
                        >
                          <X size={16} />
                          Unenroll
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                !loading && <p style={{ color: "#9a9a9a" }}>No courses found. Join some courses to see them here!</p>
              )}
            </div>
          </>
        ) : (
          <>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div className="results">
              {results.length > 0 ? (
                results.map((course, idx) => (
                  <div key={idx} className="course-card">
                    <div className="course-header">
                      <div>
                        <h3 className="course-title">
                          {course.code}
                        </h3>
                        <p style={{ color: '#ccc', fontSize: '14px', margin: '0 0 8px 0' }}>
                          {course.title}
                        </p>
                        <div className="course-meta">
                          Professor {course.professor}  • {course.lecture_times} • {course.room}
                        </div>
                      </div>
                      <div className="course-actions">
                        {course.is_enrolled ? (
                          <div style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ✓ Joined
                          </div>
                        ) : (
                          <button
                            className="join-btn"
                            onClick={() => joinCourse(course.id)}
                          >
                            <Plus size={16} />
                            <span style={{ marginLeft: '4px' }}>Join</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                !loading &&
                hasSearched && (
                  <p style={{ color: "#9a9a9a" }}>No results found.</p>
                )
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
