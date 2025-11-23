import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  BarChart3,
  Menu,
  X,
  LogOut,
  Settings
} from "lucide-react";

const ABS_BASE = new URL(import.meta.env.BASE_URL, window.location.origin);
const API_ROOT = new URL("../api/", ABS_BASE).pathname;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");

  // Check admin authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_ROOT}check_session.php`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/");
          return;
        }

        const data = await res.json();

        if (!data.loggedIn || data.role !== "admin") {
          navigate("/");
          return;
        }

        setUserName(data.name || data.email);
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/");
      }
    }

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_ROOT}logout.php`, {
        method: "POST",
        credentials: "include",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const tabs = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          padding: "1rem",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-primary)" }}>
              Admin Dashboard
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
            className="desktop-nav"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    backgroundColor: activeTab === tab.id ? "var(--button-bg)" : "transparent",
                    color: activeTab === tab.id ? "white" : "var(--text-primary)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "block" }} className="desktop-user">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {userName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
              className="desktop-logout"
            >
              <LogOut size={18} />
              Logout
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                padding: "0.5rem",
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                border: "none",
                cursor: "pointer",
              }}
              className="mobile-menu-btn"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "var(--bg-primary)",
              borderRadius: "0.5rem",
              border: "1px solid var(--border-color)",
            }}
            className="mobile-menu"
          >
            <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Logged in as: {userName}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      borderRadius: "0.375rem",
                      backgroundColor: activeTab === tab.id ? "var(--button-bg)" : "transparent",
                      color: activeTab === tab.id ? "white" : "var(--text-primary)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  marginTop: "0.5rem",
                }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>
        {activeTab === "analytics" && <AnalyticsView />}
        {activeTab === "users" && <UsersView />}
        {activeTab === "courses" && <CoursesView />}
      </main>

      <style>{`
        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (min-width: 768px) {
          .mobile-menu-btn {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }

        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @media (max-width: 767px) {
          .desktop-nav, .desktop-user, .desktop-logout {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============= USER MANAGEMENT VIEW =============
function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`${API_ROOT}admin/users_list.php?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleViewUser = async (userId) => {
    try {
      const res = await fetch(`${API_ROOT}admin/user_get.php?id=${userId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch user details");

      const user = await res.json();
      setSelectedUser(user);
      setShowDeleteConfirm(false);
      setShowUserModal(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      alert("Failed to load user details");
    }
  };

  const handleDeactivateUser = async (userId, isActive) => {
    if (!confirm(`Are you sure you want to ${isActive ? "deactivate" : "reactivate"} this user?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_ROOT}admin/user_deactivate.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, is_active: isActive ? 0 : 1 }),
      });

      if (!res.ok) throw new Error("Failed to update user");

      alert(isActive ? "User deactivated" : "User reactivated");
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    // Confirmation handled in UI now

    try {
      const res = await fetch(`${API_ROOT}admin/user_delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });

      if (!res.ok) throw new Error("Failed to delete user");

      alert("User deleted successfully");
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
        User Management
      </h2>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          border: "1px solid var(--border-color)",
        }}
      >
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", flex: "1 1 300px" }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--button-bg)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        >
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="ta">TAs</option>
          <option value="professor">Professors</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "150px" }}>Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "200px" }}>Email</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "100px" }}>Role</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "80px" }}>Courses</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "80px" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "100px", width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.75rem", color: "var(--text-primary)" }}>
                      {user.preferred_name || user.name}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      {user.email}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          backgroundColor: user.role === "admin" ? "#dc2626" : user.role === "professor" ? "#2563eb" : user.role === "ta" ? "#16a34a" : "#6b7280",
                          color: "white",
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-primary)" }}>
                      {user.course_count || 0}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          backgroundColor: user.is_active ? "#16a34a" : "#dc2626",
                          color: "white",
                        }}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", minWidth: "100px", width: "100px" }}>
                      <button
                        onClick={() => handleViewUser(user.id)}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "var(--button-bg)",
                          color: "white",
                          border: "none",
                          borderRadius: "0.25rem",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No users found
            </div>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowUserModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                User Details
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Name:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedUser.name}</span>
              </div>
              {selectedUser.preferred_name && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Preferred Name:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedUser.preferred_name}</span>
                </div>
              )}
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Email:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedUser.email}</span>
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Role:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedUser.role}</span>
              </div>
              {selectedUser.pronouns && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Pronouns:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedUser.pronouns}</span>
                </div>
              )}
              {selectedUser.academic_year && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Academic Year:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedUser.academic_year}</span>
                </div>
              )}
              {selectedUser.major && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Major:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedUser.major}</span>
                </div>
              )}
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Enrollments:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedUser.enrollments?.length || 0} courses</span>
              </div>
              {selectedUser.queue_stats && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Queue Stats:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>
                    {selectedUser.queue_stats.total_sessions} sessions,{" "}
                    {selectedUser.queue_stats.attended} attended,{" "}
                    {selectedUser.queue_stats.missed} missed
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Delete User
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", backgroundColor: "rgba(220, 38, 38, 0.1)", padding: "0.5rem", borderRadius: "0.375rem" }}>
                  <span style={{ color: "#dc2626", fontWeight: "600" }}>Are you sure?</span>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                    }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= COURSE MANAGEMENT VIEW =============
function CoursesView() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`${API_ROOT}admin/courses_list.php?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch courses");

      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleViewCourse = async (courseId) => {
    try {
      const res = await fetch(`${API_ROOT}admin/course_get.php?id=${courseId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch course details");

      const course = await res.json();
      setSelectedCourse(course);
      setShowDeleteConfirm(false);
      setShowCourseModal(true);
    } catch (error) {
      console.error("Error fetching course details:", error);
      alert("Failed to load course details");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    // Confirmation handled in UI now

    try {
      const res = await fetch(`${API_ROOT}admin/course_delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: courseId }),
      });

      if (!res.ok) throw new Error("Failed to delete course");

      alert("Course deleted successfully");
      fetchCourses();
      setShowCourseModal(false);
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
        Course Management
      </h2>

      {/* Search */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          border: "1px solid var(--border-color)",
        }}
      >
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Search by course code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--button-bg)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Courses Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "100px" }}>Code</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "200px" }}>Title</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "80px" }}>Students</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "60px" }}>Instructors</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "80px" }}>Sessions</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "100px" }}>Queue</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: "var(--text-primary)", minWidth: "100px", width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "0.75rem", color: "var(--text-primary)", fontWeight: "500" }}>
                      {course.code}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-primary)" }}>
                      {course.title}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {course.student_count}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {course.ta_count}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {course.session_count}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {course.queue_stats?.total_queue_entries || 0}
                      {course.queue_stats?.active_queue_entries > 0 && (
                        <span style={{ color: "#16a34a", marginLeft: "0.25rem" }}>
                          ({course.queue_stats.active_queue_entries} active)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", minWidth: "100px", width: "100px" }}>
                      <button
                        onClick={() => handleViewCourse(course.id)}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "var(--button-bg)",
                          color: "white",
                          border: "none",
                          borderRadius: "0.25rem",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {courses.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No courses found
            </div>
          )}
        </div>
      )}

      {/* Course Details Modal */}
      {showCourseModal && selectedCourse && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowCourseModal(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-primary)" }}>
                Course Details
              </h3>
              <button
                onClick={() => setShowCourseModal(false)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Code:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedCourse.code}</span>
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Title:</strong>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{selectedCourse.title}</span>
              </div>
              {selectedCourse.lecture_times && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Lecture Times:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedCourse.lecture_times}</span>
                </div>
              )}
              {selectedCourse.room && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Room:</strong>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>{selectedCourse.room}</span>
                </div>
              )}

              <div style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
                <h4 style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Enrollment: {selectedCourse.students?.length || 0} students, {selectedCourse.tas?.length || 0} instructors, {selectedCourse.professors?.length || 0} professors
                </h4>
              </div>

              {selectedCourse.office_hours_sessions && selectedCourse.office_hours_sessions.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Office Hours Sessions ({selectedCourse.office_hours_sessions.length})
                  </h4>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {selectedCourse.office_hours_sessions.slice(0, 3).map((session) => (
                      <div key={session.id} style={{ marginBottom: "0.25rem" }}>
                        {session.day_of_week} {session.start_time} - {session.end_time} ({session.location})
                      </div>
                    ))}
                    {selectedCourse.office_hours_sessions.length > 3 && (
                      <div>+ {selectedCourse.office_hours_sessions.length - 3} more...</div>
                    )}
                  </div>
                </div>
              )}

              {selectedCourse.queue_stats && (
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Queue Statistics
                  </h4>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    <div>Total Entries: {selectedCourse.queue_stats.total_entries}</div>
                    <div>Active: {selectedCourse.queue_stats.active_entries}</div>
                    <div>Present: {selectedCourse.queue_stats.present_count}</div>
                    <div>Absent: {selectedCourse.queue_stats.absent_count}</div>
                    {selectedCourse.queue_stats.avg_wait_minutes && (
                      <div>Avg Wait: {Math.round(selectedCourse.queue_stats.avg_wait_minutes)} min</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                  }}
                >
                  Delete Course
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", backgroundColor: "rgba(220, 38, 38, 0.1)", padding: "0.5rem", borderRadius: "0.375rem" }}>
                  <span style={{ color: "#dc2626", fontWeight: "600" }}>Are you sure?</span>
                  <button
                    onClick={() => handleDeleteCourse(selectedCourse.id)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                    }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= ANALYTICS VIEW =============
function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ROOT}admin/analytics_overview.php`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch analytics");

      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "2rem" }}>Loading analytics...</div>;
  }

  if (!stats) {
    return <div style={{ textAlign: "center", padding: "2rem" }}>Failed to load analytics</div>;
  }

  return (
    <div>
      {/* Stats Cards */}
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(1, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          title="Total Users"
          value={stats.users.total_users}
          subtitle={`${stats.users.active_users} active, ${stats.users.inactive_users} inactive`}
          color="#3b82f6"
        />
        <StatCard
          title="Students"
          value={stats.users.students}
          subtitle={`${Math.round((stats.users.students / stats.users.total_users) * 100)}% of users`}
          color="#10b981"
        />
        <StatCard
          title="TAs"
          value={stats.users.tas}
          subtitle={`${stats.users.professors} professors`}
          color="#8b5cf6"
        />
        <StatCard
          title="Total Courses"
          value={stats.courses.total_courses}
          subtitle={`Avg ${Math.round(stats.courses.avg_enrollments || 0)} enrollments`}
          color="#f59e0b"
        />
        <StatCard
          title="Queue Entries"
          value={stats.queue.total_entries}
          subtitle={`${stats.queue.active_entries} active now`}
          color="#06b6d4"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendance.present_percentage}%`}
          subtitle={`${stats.attendance.present} present, ${stats.attendance.absent} absent`}
          color="#14b8a6"
        />
        <StatCard
          title="Avg Wait Time"
          value={`${Math.round(stats.queue.avg_wait_minutes || 0)} min`}
          subtitle="Average queue wait"
          color="#ec4899"
        />
        <StatCard
          title="Office Hours"
          value={stats.sessions.total_sessions}
          subtitle="Total sessions scheduled"
          color="#f97316"
        />
      </div>

      {/* Most Active Courses */}
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          border: "1px solid var(--border-color)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Most Active Courses (by queue entries)
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Code
                </th>
                <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Title
                </th>
                <th style={{ padding: "0.5rem", textAlign: "right", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Queue Entries
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.active_courses.slice(0, 5).map((course) => (
                <tr key={course.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem", color: "var(--text-primary)", fontWeight: "500" }}>
                    {course.code}
                  </td>
                  <td style={{ padding: "0.75rem", color: "var(--text-primary)" }}>
                    {course.title}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>
                    {course.queue_entries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Peak Usage Times */}
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          border: "1px solid var(--border-color)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Peak Usage Times (Last 30 Days)
        </h3>
        <SimpleBarChart data={stats.peak_times} />
      </div>

      {/* Day of Week Distribution */}
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          border: "1px solid var(--border-color)",
        }}
      >
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Queue Activity by Day (Last 30 Days)
        </h3>
        <SimpleDayChart data={stats.day_distribution} />
      </div>
    </div>
  );
}

// Simple Stat Card Component
function StatCard({ title, value, subtitle, color }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        border: "1px solid var(--border-color)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        {title}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
        {subtitle}
      </div>
    </div>
  );
}

// Simple Bar Chart for Peak Times
function SimpleBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "var(--text-secondary)" }}>No data available</div>;
  }

  const maxCount = Math.max(...data.map((d) => parseInt(d.count)));

  return (
    <div style={{ display: "flex", alignItems: "end", gap: "0.5rem", height: "200px" }}>
      {data.map((item) => {
        const height = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;

        // Convert 24h to 12h AM/PM
        const hour = parseInt(item.hour);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const timeLabel = `${hour12} ${ampm}`;

        return (
          <div
            key={item.hour}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.625rem",
                color: "var(--text-secondary)",
              }}
            >
              {item.count}
            </div>
            <div
              style={{
                width: "100%",
                backgroundColor: "#3b82f6",
                borderRadius: "0.25rem 0.25rem 0 0",
                height: `${height}%`,
                minHeight: item.count > 0 ? "4px" : "0",
              }}
              title={`${timeLabel} - ${item.count} entries`}
            />
            <div
              style={{
                fontSize: "0.625rem",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {timeLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple Chart for Day Distribution
function SimpleDayChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "var(--text-secondary)" }}>No data available</div>;
  }

  const maxCount = Math.max(...data.map((d) => parseInt(d.count)));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div style={{ display: "flex", alignItems: "end", gap: "0.5rem", height: "200px" }}>
      {data.map((item) => {
        const height = maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
        const dayName = item.day_name || days[item.day_num - 1] || 'Unknown';
        return (
          <div
            key={item.day_num}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.625rem",
                color: "var(--text-secondary)",
              }}
            >
              {item.count}
            </div>
            <div
              style={{
                width: "100%",
                backgroundColor: "#10b981",
                borderRadius: "0.25rem 0.25rem 0 0",
                height: `${height}%`,
                minHeight: item.count > 0 ? "4px" : "0",
              }}
              title={`${dayName} - ${item.count} entries`}
            />
            <div
              style={{
                fontSize: "0.625rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                wordBreak: "break-word",
              }}
            >
              {dayName.substring(0, 3)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
