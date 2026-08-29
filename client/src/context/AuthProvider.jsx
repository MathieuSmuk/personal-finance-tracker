import { useEffect, useState } from "react";

import API_URL from "../config/api.js";
import AuthContext from "./AuthContext.js";

function formatResponseError(data, fallbackMessage) {
  if (data.errors) {
    return data.errors.map((item) => item.message).join(" ");
  }

  return data.message || fallbackMessage;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          setUser(null);
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to check authentication.");
        }

        setUser(data.user);
      } catch (error) {
        if (error.name !== "AbortError") {
          setUser(null);
          setAuthError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      controller.abort();
    };
  }, []);

  async function authenticate(endpoint, formData) {
    setAuthError("");

    const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(formatResponseError(data, "Authentication failed."));
    }

    setUser(data.user);

    return data.user;
  }

  function register(formData) {
    return authenticate("register", formData);
  }

  function login(formData) {
    return authenticate("login", formData);
  }

  async function logout() {
    setAuthError("");

    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to log out.");
    }

    setUser(null);
  }

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
