import { HashRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import SignUp from "./SignUp";
import MyCourses from './MyCourses.jsx';
import ProfCourses from './ProfessorCourses.jsx';
import { Dashboard } from "./Dashboard";
import ThemeToggle from "./ThemeToggle";

export default function App() {
  return (
    <>
      {/* fixed top-right theme switch, your component handles storage + classes */}
      <ThemeToggle />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/mycourses" element={<MyCourses />} />
          <Route path="/profcourses" element={<ProfCourses />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </HashRouter>
    </>
  );
}
