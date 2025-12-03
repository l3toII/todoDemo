import axios from 'axios';

// Get API base URL from environment variable
// Note: VITE_API_URL is set in render.yaml for staging/production
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('accessToken', access_token);
          localStorage.setItem('refreshToken', refresh_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  requestPasswordReset: (email) => apiClient.post('/auth/password-reset/request', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/password-reset/confirm', { token, password: newPassword }),
  appleSignIn: (identityToken, authorizationCode) => apiClient.post('/auth/apple', { identity_token: identityToken, authorization_code: authorizationCode }),
  deleteAccount: () => apiClient.delete('/account'),
};

// Account API endpoints
export const accountAPI = {
  getProfile: () => apiClient.get('/auth/me'),
  updatePreferences: (data) => apiClient.patch('/account/preferences', data),
  deleteAccount: (password, confirmText) => apiClient.delete('/account', {
    data: { password, confirm_text: confirmText }
  }),
};

// Tasks API endpoints
export const tasksAPI = {
  getInbox: () => apiClient.get('/tasks/inbox'),
  getInboxCount: () => apiClient.get('/tasks/inbox/count'),
  getAll: (status) => apiClient.get('/tasks', { params: status ? { status } : {} }),
  getByStatus: (status) => apiClient.get('/tasks', { params: { status } }),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.patch(`/tasks/${id}`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}`),
  complete: (id) => apiClient.post(`/tasks/${id}/complete`),
  restore: (id) => apiClient.post(`/tasks/${id}/restore`),
  getStats: () => apiClient.get('/tasks/stats'),
  // Clarification helpers
  clarify: (id, clarificationData) => {
    if (!clarificationData.status) {
      return Promise.reject({
        response: {
          data: {
            message: 'Missing target status in clarification data',
            code: 'MISSING_TARGET_STATUS'
          },
          status: 400
        }
      });
    }
    return apiClient.patch(`/tasks/${id}/clarify`, {
      target_status: clarificationData.status,
      notes: clarificationData.notes,
      energy_level: clarificationData.energyLevel,
      time_estimate: clarificationData.timeEstimate,
      due_date: clarificationData.dueDate,
      project_id: clarificationData.projectId,
    });
  },
  setContexts: (id, contextIds) => apiClient.put(`/tasks/${id}/contexts`, { context_ids: contextIds }),
  // Convert task to project (not yet implemented in backend)
  convertToProject: (id, projectData) => Promise.reject({
    response: {
      data: {
        message: 'Convert to project is not yet implemented',
        code: 'NOT_IMPLEMENTED'
      },
      status: 501
    }
  }),
};

// Projects API endpoints
export const projectsAPI = {
  getAll: (params = {}) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.patch(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
};

// Contexts API endpoints
export const contextsAPI = {
  getAll: () => apiClient.get('/contexts'),
  create: (data) => apiClient.post('/contexts', data),
  update: (id, data) => apiClient.patch(`/contexts/${id}`, data),
  delete: (id) => apiClient.delete(`/contexts/${id}`),
};

// Health check endpoint
export const healthAPI = {
  check: () => apiClient.get('/health'),
};

export default apiClient;
