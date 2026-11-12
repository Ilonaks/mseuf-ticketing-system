import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import usePolling from "../hooks/usePolling";
import { useDialog } from "./DialogContext";

const AuthContext = createContext(null);

// How often a logged-in page confirms its session is still the active one
const SESSION_CHECK_MS = 10000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { alert } = useDialog();

  // On page load, check if a saved token is still valid
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // The API rejected our token (see api/axios.js): log out here and explain why
  useEffect(() => {
    const onEnded = (e) => {
      setUser(null);
      const replaced = e.detail?.reason === "session_replaced";
      alert({
        title: replaced ? "Logged in on another device" : "You've been logged out",
        message: replaced
          ? "Your account was just logged in on another device, so you were logged out here. If that wasn't you, log in again and change your password."
          : "Your session has ended. Please log in again.",
        confirmText: "OK",
        tone: replaced ? "danger" : "primary",
      });
    };
    window.addEventListener("auth:ended", onEnded);
    return () => window.removeEventListener("auth:ended", onEnded);
  }, [alert]);

  // Heartbeat: notices within seconds if another device took over this account,
  // even on pages that don't refresh their own data
  usePolling(() => api.get("/me").catch(() => {}), { interval: SESSION_CHECK_MS, enabled: Boolean(user) });

  // Returns the API response: { user, token, signed_out_other_device }
  const login = async (email, password) => {
    const res = await api.post("/login", { email, password, device_name: "web" });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (form) => {
    const res = await api.post("/register", { ...form, device_name: "web" });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      // Token may already be expired; log out locally anyway
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
