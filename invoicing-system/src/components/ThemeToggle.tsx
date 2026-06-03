"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className={`rounded-full p-2 text-lg shadow-md transition-colors ${
        isDark
          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
          : "bg-slate-200 text-slate-900 hover:bg-slate-300"
      }`}
      style={{ minWidth: 40, minHeight: 40 }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
