import { HashRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import SignUp from "./SignUp";
import MyCourses from './MyCourses.jsx';
import ProfCourses from './ProfessorCourses.jsx';
import { Dashboard } from "./Dashboard";
import ThemeToggle from "./ThemeToggle";
import ProfessorView from "./professorview";
import ProfilePage from "./ProfilePage";
import QueueDetails from "./QueueDetails"; 
import Settings from "./Settings.jsx";
// 1. Import the new ProtectedRoute component
import { ProtectedRoute } from './ProtectedRoute'; 
import { AuthProvider } from './AuthContext';

export default function App() {
  return (
    <>
      <ThemeToggle />
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected Routes */}
            <Route path="/mycourses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
            <Route path="/profcourses" element={<ProtectedRoute><ProfCourses /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/professorview" element={<ProtectedRoute><ProfessorView /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/queue/:courseId" element={<ProtectedRoute><QueueDetails /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </>
  );
}


export function ProfessorDashboard() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Professor Dashboard</h1>
      <p>Welcome, Professor! Here’s where you’ll manage office hours.</p>
    </div>
  );
}