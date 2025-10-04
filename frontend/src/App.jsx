import { HashRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import SignUp from "./SignUp";
import MyCourses from './MyCourses.jsx';
import ProfCourses from './ProfessorCourses.jsx';
import { Dashboard } from "./Dashboard";
import ThemeToggle from "./ThemeToggle";
import ProfessorView from "./professorview";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/mycourses" element={<MyCourses />} />
          <Route path="/profcourses" element={<ProfCourses />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/professorview" element={<ProfessorView />} />
        </Routes>
      </HashRouter>
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