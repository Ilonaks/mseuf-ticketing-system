import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: "application/json",
  },
});

// Attach the Sanctum token to every request if the user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 on a logged-in request means the session ended: either this account was
// logged in on another device (reason "session_replaced") or the token expired.
// Clear it once and tell AuthContext, which logs out and shows a pop-up.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthCall = url.endsWith("/login") || url.endsWith("/register") || url.endsWith("/logout");

    if (error.response?.status === 401 && !isAuthCall && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      window.dispatchEvent(
        new CustomEvent("auth:ended", {
          detail: { reason: error.response.data?.reason, message: error.response.data?.message },
        })
      );
    }
    return Promise.reject(error);
  }
);

export default api;