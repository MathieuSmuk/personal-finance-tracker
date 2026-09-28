import { describe, expect, test } from "vitest";
import { getApiErrorMessage } from "./getApiErrorMessage.js";

describe("getApiErrorMessage", () => {
  test("combines validation error messages", () => {
    const data = {
      errors: [
        { message: "Email is required." },
        { message: "Password must contain at least eight characters." },
      ],
    };

    const result = getApiErrorMessage(data, "Something went wrong.");

    expect(result).toBe(
      "Email is required. Password must contain at least eight characters.",
    );
  });

  test("returns the API message when one is provided", () => {
    const data = {
      message: "Unable to load accounts.",
    };

    const result = getApiErrorMessage(data, "Something went wrong.");

    expect(result).toBe("Unable to load accounts.");
  });

  test("returns the fallback when the response has no message", () => {
    const result = getApiErrorMessage(undefined, "Something went wrong.");

    expect(result).toBe("Something went wrong.");
  });

  test("returns the fallback when the validation errors array is empty", () => {
    const data = {
      errors: [],
    };

    const result = getApiErrorMessage(data, "Something went wrong.");

    expect(result).toBe("Something went wrong.");
  });
});
