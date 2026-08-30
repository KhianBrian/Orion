import api from "../api/axiosInterceptor";
import { API_ENDPOINTS } from "../api/apiConfig";

/**
 * User Service
 */
const userService = {
  getUserList: (data) => api.post(API_ENDPOINTS.USER.PROFILE, data),
  createUser: (data) => api.post(API_ENDPOINTS.USER.CREATE, data),
  updateUserDetail: (data) => api.patch(API_ENDPOINTS.USER.MODIFY, data),
  uploadImage: (data) => api.patch(API_ENDPOINTS.USER.UPLOAD_IMAGE, data),
  getTimeZoneList: (data) => api.post(API_ENDPOINTS.USER.TIMEZONE_LIST, data),
};

export default userService;
