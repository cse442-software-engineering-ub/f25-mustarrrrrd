import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [isMobile, setIsMobile] = useState(false);

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

    // Check for mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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
        bottom: isMobile ? "1rem" : "1.5rem",
        right: isMobile ? "1rem" : "1.5rem",
        padding: isMobile ? "10px" : "12px",
        borderRadius: "50%",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--card-bg)",
        color: "var(--text-primary)",
        cursor: "pointer",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px var(--card-shadow)",
        transition: "all 0.3s ease",
        width: isMobile ? "44px" : "48px",
        height: isMobile ? "44px" : "48px",
      }}
      aria-label="Toggle theme"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = "0 4px 12px var(--card-shadow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 2px 8px var(--card-shadow)";
      }}
    >
      {theme === "dark" ? (
        <Sun size={isMobile ? 20 : 22} color="var(--text-primary)" />
      ) : (
        <Moon size={isMobile ? 20 : 22} color="var(--text-primary)" />
      )}
    </button>
  );
}
