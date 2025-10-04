import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import SignUp from "./SignUp";
import { Dashboard } from "./Dashboard";
import ThemeToggle from "./ThemeToggle";
import ProfessorView from "./professorview";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/professorview" element={<ProfessorView />} />
        </Routes>
      </Router>
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