import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import ThemeProvider from "../../context/ThemeProvider";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.setItem("finance-theme", "light");
  });

  test("shows the action for switching from light to dark mode", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", {
      name: "Switch to dark theme",
    });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Dark Mode");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  test("switches to dark mode when the user clicks the button", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const darkModeButton = screen.getByRole("button", {
      name: "Switch to dark theme",
    });

    await user.click(darkModeButton);

    const lightModeButton = screen.getByRole("button", {
      name: "Switch to light theme",
    });

    expect(lightModeButton).toHaveTextContent("Light Mode");
    expect(lightModeButton).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem("finance-theme")).toBe("dark");
  });
});
