"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Add no-transitions class to prevent initial flash
    document.documentElement.classList.add("no-transitions");

    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setTheme(prefersDark ? "dark" : "light");
    }

    // Remove no-transitions class after initial theme is applied
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("no-transitions");
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Remove existing theme classes
      document.documentElement.classList.remove("light", "dark");
      // Add current theme class
      document.documentElement.classList.add(theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";

    // Use View Transitions API if supported
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (
        document as Document & {
          startViewTransition: (callback: () => void) => void;
        }
      ).startViewTransition(() => {
        setTheme(newTheme);
      });
    } else {
      // Fallback for browsers without View Transitions API
      setTheme(newTheme);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
