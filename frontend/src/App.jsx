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
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </>
  );
}
