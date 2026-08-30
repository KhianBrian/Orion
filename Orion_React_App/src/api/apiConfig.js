/**
 * API Configuration Constants
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.example.com";
export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {


  // Authentication
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    VERIFY_EMAIL: "/auth/verifyEmail",
    VERIFY_TOKEN: "/auth/verify",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CREATE_NEW_PASSWORD: "/auth/createNewPassword",
    REFRESH_TOKEN: "/auth/refresh-token",
    INITIATE_MFA: "/auth/initiateMFASetup",
    VALIDATE_MFA: "/auth/validateMFA",
  },

  // User & Profile
  USER: {
    PROFILE: "/auth/users/getUser",
    CREATE: "/auth/users/createUser",
    MODIFY: "/auth/users/modifyUser",
    UPLOAD_IMAGE: "/auth/users/upload",
    TIMEZONE_LIST: "/auth/users/timeZone",
  },

 
};
