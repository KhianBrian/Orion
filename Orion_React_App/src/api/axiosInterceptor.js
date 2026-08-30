import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL, API_TIMEOUT } from "./apiConfig";

/**
 * Configure Axios instance
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor
 */
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Helper error handlers inspired by sample
 */
const handle401Error = () => {
  const currentPath = window.location.pathname;
  localStorage.clear();
  if (currentPath !== "/") {
    toast.dismiss();
    toast.error("Your session has expired. Please log in again.", {
      toastId: "session-expired",
      autoClose: false,
    });
    window.location.href = "/";
  }
};

const handleNetworkError = () => {
  toast.dismiss();
  toast.error("Network error. Please check your connection and try again.", {
    toastId: "network-error",
    autoClose: false,
  });
};

const handleHttpError = (error) => {
  toast.dismiss();
  toast.error(error.response?.data?.message || `Status: ${error.message}`, {
    toastId: "http-error",
    autoClose: false,
  });
};

const handleSpecialCaseRedirect = (error) => {
  const errorUrl = error.config?.url;
  const currentPath = window.location.pathname;
  if (
    errorUrl &&
    (errorUrl.includes("voice/startcall") || errorUrl.includes("/aiwarmer")) &&
    !currentPath.includes("connect")
  ) {
    window.location.href = "/campaign";
    return true;
  }
  return false;
};

/**
 * Global Error Handler
 */
const errorHandler = (error) => {
  try {
    const statusCode = error.response?.status;

    if (
      error.code === "ERR_NETWORK" ||
      (statusCode && statusCode >= 500 && statusCode < 600)
    ) {
      if (handleSpecialCaseRedirect(error)) {
        return Promise.reject(error);
      }
    }

    if (statusCode === 401) {
      handle401Error();
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      statusCode === 0
    ) {
      handleNetworkError();
    } else if (statusCode && statusCode !== 401) {
      handleHttpError(error);
    }

    return Promise.reject(error);
  } catch (errorHandlingError) {
    toast.dismiss();
    toast.error(
      "An error occurred while handling another error. Please try again.",
      { autoClose: false }
    );
    return Promise.reject(errorHandlingError);
  }
};

/**
 * Response Interceptor
 */
api.interceptors.response.use((response) => response.data, errorHandler);

export default api;
