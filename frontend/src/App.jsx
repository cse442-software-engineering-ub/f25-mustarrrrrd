import MyCourses from './MyCourses.jsx';
import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import SignUp from "./SignUp"; // ✅ SignUp stays untouched
import ProfCourses from './ProfessorCourses.jsx';

const MAX = 191;
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import SignUp from "./SignUp";
import { Dashboard } from "./Dashboard";
import ThemeToggle from "./ThemeToggle";

export default function App() {
  return (
    <>
      {/* fixed top-right theme switch, your component handles storage + classes */}
      <ThemeToggle />
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profcourses" element={<ProfCourses />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </>
  );
}
