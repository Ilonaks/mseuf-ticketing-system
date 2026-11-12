import axios from "axios";
import * as storage from "./storage";
import { emitSessionEnded } from "./session";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: 10000,
});

// Attach the saved Sanctum token to every request
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on a logged-in request means the session ended: either this account was
// logged in on another device (reason "session_replaced") or the token expired.
// Clear it once and let App.js log out and show a pop-up.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url ?? "";
    const isAuthCall = url.endsWith("/login") || url.endsWith("/register") || url.endsWith("/logout");

    if (error.response?.status === 401 && !isAuthCall && (await storage.getItem("token"))) {
      await storage.deleteItem("token");
      emitSessionEnded({ reason: error.response.data?.reason });
    }
    return Promise.reject(error);
  }
);

export default api;
