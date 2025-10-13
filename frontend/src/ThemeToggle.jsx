import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  // When component mounts, read from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      // Optionally, detect system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";
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
        display: "none", // Hidden but functionality preserved
        position: "fixed",
        top: "10px",
        right: "10px",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid gray",
        backgroundColor: "transparent",
        cursor: "pointer",
        zIndex: 1000,
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
