import { describe, it, expect, vi, beforeEach } from 'vitest';

// Store interceptor callbacks for testing
let requestInterceptorSuccess;
let requestInterceptorError;
let responseInterceptorSuccess;
let responseInterceptorError;

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn((success, error) => {
        requestInterceptorSuccess = success;
        requestInterceptorError = error;
      }),
    },
    response: {
      use: vi.fn((success, error) => {
        responseInterceptorSuccess = success;
        responseInterceptorError = error;
      }),
    },
  },
};

const mockAxiosPost = vi.fn();

// Mock axios before importing api module
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    post: mockAxiosPost,
  },
}));

// Import after mock setup
const { tasksAPI } = await import('../../../services/api');

describe('api.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', () => {
      localStorage.setItem('accessToken', 'test-token-123');

      const config = { headers: {} };
      const result = requestInterceptorSuccess(config);

      expect(result.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should not add Authorization header when no token', () => {
      const config = { headers: {} };
      const result = requestInterceptorSuccess(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should reject on request error', async () => {
      const error = new Error('Request failed');
      await expect(requestInterceptorError(error)).rejects.toThrow('Request failed');
    });
  });

  describe('response interceptor', () => {
    it('should pass through successful responses', () => {
      const response = { data: { message: 'success' } };
      const result = responseInterceptorSuccess(response);
      expect(result).toBe(response);
    });

    it('should reject non-401 errors without retry', async () => {
      const error = {
        config: {},
        response: { status: 500 },
      };

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('should reject 401 errors when no refresh token', async () => {
      const error = {
        config: {},
        response: { status: 401 },
      };

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('should reject 401 errors on retry attempt', async () => {
      const error = {
        config: { _retry: true },
        response: { status: 401 },
      };

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('should attempt token refresh on 401 with refresh token', async () => {
      localStorage.setItem('refreshToken', 'refresh-token-123');

      const originalRequest = {
        headers: {},
        _retry: false,
      };
      const error = {
        config: originalRequest,
        response: { status: 401 },
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      });

      mockAxiosInstance.patch.mockResolvedValueOnce({ data: 'retried' });

      // The interceptor will call apiClient which is mockAxiosInstance
      // We need to mock the instance call for retry
      const mockRetry = vi.fn().mockResolvedValueOnce({ data: 'success' });

      // Store original and replace temporarily
      const originalCreate = (await import('axios')).default.create;

      // Since apiClient is already created, we need to test the flow differently
      // Let's verify the refresh was called
      try {
        await responseInterceptorError(error);
      } catch (e) {
        // May fail on retry, but we can check if refresh was attempted
      }

      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refresh_token: 'refresh-token-123' }
      );
    });

    it('should clear tokens and redirect on refresh failure', async () => {
      localStorage.setItem('accessToken', 'old-access-token');
      localStorage.setItem('refreshToken', 'old-refresh-token');

      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      const error = {
        config: { headers: {} },
        response: { status: 401 },
      };

      mockAxiosPost.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(responseInterceptorError(error)).rejects.toThrow('Refresh failed');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(window.location.href).toBe('/login');

      window.location = originalLocation;
    });

    it('should handle errors without response object', async () => {
      const error = { config: {} };
      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });
  });

  describe('tasksAPI.clarify', () => {
    it('should reject with error when status is missing', async () => {
      const clarificationData = {
        notes: 'some notes',
        energyLevel: 'low',
      };

      await expect(tasksAPI.clarify('task-123', clarificationData)).rejects.toMatchObject({
        message: 'Missing target status in clarification data',
        response: {
          data: {
            message: 'Missing target status in clarification data',
            code: 'MISSING_TARGET_STATUS',
          },
          status: 400,
        },
      });
    });

    it('should reject with error when status is empty string', async () => {
      const clarificationData = {
        status: '',
        notes: 'some notes',
      };

      await expect(tasksAPI.clarify('task-123', clarificationData)).rejects.toMatchObject({
        response: {
          data: { code: 'MISSING_TARGET_STATUS' },
          status: 400,
        },
      });
    });

    it('should call API with correct payload when status provided', async () => {
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { id: 'task-123' } });

      const clarificationData = {
        status: 'next_action',
        notes: 'test notes',
        energyLevel: 'high',
        timeEstimate: 30,
        dueDate: '2024-12-31',
        projectId: 'proj-1',
      };

      await tasksAPI.clarify('task-123', clarificationData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/tasks/task-123/clarify', {
        target_status: 'next_action',
        notes: 'test notes',
        energy_level: 'high',
        time_estimate: 30,
        due_date: '2024-12-31',
        project_id: 'proj-1',
      });
    });
  });

  describe('tasksAPI.convertToProject', () => {
    it('should reject with not implemented error', async () => {
      await expect(tasksAPI.convertToProject('task-123', { title: 'Project' })).rejects.toMatchObject({
        message: 'Convert to project is not yet implemented',
        response: {
          data: {
            message: 'Convert to project is not yet implemented',
            code: 'NOT_IMPLEMENTED',
          },
          status: 501,
        },
      });
    });

    it('should reject even without arguments', async () => {
      await expect(tasksAPI.convertToProject()).rejects.toMatchObject({
        response: {
          status: 501,
          data: { code: 'NOT_IMPLEMENTED' },
        },
      });
    });
  });
});
