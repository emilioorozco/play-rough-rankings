"use client";

import { useContext, useState, useEffect } from "react";
import { ThemeContext } from "./theme-provider";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const themeContext = useContext(ThemeContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !themeContext) {
    // Return a placeholder button to prevent layout shift
    return (
      <button
        className="theme-toggle"
        disabled
        aria-label="Theme toggle loading"
      >
        ⚪
      </button>
    );
  }

  const { theme, toggleTheme } = themeContext;

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
