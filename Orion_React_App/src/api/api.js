import axios from "axios";
import { store } from "../redux/store";
import { updateTokens, logout } from "../redux/slices/authSlice";

const api = axios.create({
  baseURL: "http://localhost:5173/api", // Dummy base URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh on 401 error
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;

        if (!refreshToken) {
          store.dispatch(logout());
          return Promise.reject(error);
        }

        // Simulate a token refresh API call
        console.log("Attempting to refresh token...");

        // In a real app, you would call your refresh endpoint:
        // const response = await axios.post("/api/refresh", { refreshToken });
        // const { accessToken, newRefreshToken } = response.data;

        // Dummy refresh logic
        const newAccessToken =
          "new-access-token-" + Math.random().toString(36).substring(7);
        const newRefreshToken =
          "new-refresh-token-" + Math.random().toString(36).substring(7);

        store.dispatch(
          updateTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        );

        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
