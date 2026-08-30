/**
 * API layer entry point
 * Exports the default Axios instance and configuration
 */

import api from "./axiosInterceptor";
import { API_ENDPOINTS, API_BASE_URL } from "./apiConfig";

export { API_ENDPOINTS, API_BASE_URL };
export default api;
