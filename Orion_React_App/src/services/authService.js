import api from "../api/axiosInterceptor";
import { API_ENDPOINTS } from "../api/apiConfig";

/**
 * Authentication Service
 */
const authService = {
  login: (data) => api.post(API_ENDPOINTS.AUTH.LOGIN, data),
  register: (data) => api.post(API_ENDPOINTS.AUTH.REGISTER, data),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT),
  verifyEmail: (data) => api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, data),
  verifyToken: () => api.get(API_ENDPOINTS.AUTH.VERIFY_TOKEN),
  forgotPassword: (data) => api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data),
  resetPassword: (data) => api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data),
  confirmPassword: (data) =>
    api.post(API_ENDPOINTS.AUTH.CREATE_NEW_PASSWORD, data),
  initiateMFA: (data) => api.post(API_ENDPOINTS.AUTH.INITIATE_MFA, data),
  verifyOTP: (data) => api.post(API_ENDPOINTS.AUTH.VALIDATE_MFA, data),
};

export default authService;
