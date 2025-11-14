import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  // When component mounts, read from localStorage or default to light mode
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      // Always default to light mode
      const defaultTheme = "light";
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    }
  }, []);

  function applyTheme(themeName) {
    document.documentElement.classList.remove("light-mode", "dark-mode");
    if (themeName === "dark") {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.add("light-mode");
    }
  }

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: "fixed",
        top: "0.75rem",
        right: "3.5rem",
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--card-bg)",
        color: "var(--text-primary)",
        cursor: "pointer",
        zIndex: 998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px var(--card-shadow)",
        transition: "all 0.3s ease",
      }}
      aria-label="Toggle theme"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {theme === "dark" ? <Sun size={20} color="var(--text-primary)" /> : <Moon size={20} color="var(--text-primary)" />}
    </button>
  );
}
