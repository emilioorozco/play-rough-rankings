"use client";

import { useTheme } from "@/stores/app-store";

export function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();

  if (!mounted) {
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
