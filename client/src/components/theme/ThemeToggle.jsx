import { useTheme } from "../../hooks/useTheme";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDarkTheme = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={
        isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
      }
      aria-pressed={isDarkTheme}
    >
      {isDarkTheme ? "Light Mode" : "Dark Mode"}
    </button>
  );
}

export default ThemeToggle;
