import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  clearError,
  setTokens,
  clearAuth,
  setSessionTimeout,
  selectAuth,
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
  selectAuthError,
  login,
  register,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from '../../../../features/auth/authSlice';

// Mock the API module
vi.mock('../../../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    appleSignIn: vi.fn(),
  },
}));

import { authAPI } from '../../../../services/api';

describe('authSlice', () => {
  let store;

  const initialState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    sessionTimeout: null,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: initialState,
      },
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should clear the error state', () => {
        store = configureStore({
          reducer: { auth: authReducer },
          preloadedState: {
            auth: { ...initialState, error: 'Some error' },
          },
        });

        store.dispatch(clearError());
        expect(store.getState().auth.error).toBeNull();
      });
    });

    describe('setTokens', () => {
      it('should set access and refresh tokens', () => {
        store.dispatch(setTokens({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }));

        const state = store.getState().auth;
        expect(state.accessToken).toBe('new-access-token');
        expect(state.refreshToken).toBe('new-refresh-token');
        expect(state.isAuthenticated).toBe(true);
        expect(localStorage.getItem('accessToken')).toBe('new-access-token');
        expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
      });
    });

    describe('clearAuth', () => {
      it('should clear all auth state and localStorage', () => {
        store = configureStore({
          reducer: { auth: authReducer },
          preloadedState: {
            auth: {
              user: { id: 1, email: 'test@example.com' },
              accessToken: 'some-token',
              refreshToken: 'some-refresh',
              isAuthenticated: true,
              isLoading: false,
              error: 'Some error',
              sessionTimeout: null,
            },
          },
        });

        localStorage.setItem('accessToken', 'some-token');
        localStorage.setItem('refreshToken', 'some-refresh');

        store.dispatch(clearAuth());

        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
      });
    });

    describe('setSessionTimeout', () => {
      it('should set session timeout value', () => {
        const timeout = Date.now() + 3600000;
        store.dispatch(setSessionTimeout(timeout));

        expect(store.getState().auth.sessionTimeout).toBe(timeout);
      });
    });
  });

  describe('selectors', () => {
    const testState = {
      auth: {
        user: { id: 1, email: 'test@example.com' },
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        isAuthenticated: true,
        isLoading: false,
        error: 'Test error',
        sessionTimeout: 12345,
      },
    };

    it('selectAuth should return the entire auth state', () => {
      expect(selectAuth(testState)).toEqual(testState.auth);
    });

    it('selectIsAuthenticated should return isAuthenticated', () => {
      expect(selectIsAuthenticated(testState)).toBe(true);
    });

    it('selectUser should return the user', () => {
      expect(selectUser(testState)).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('selectAuthLoading should return isLoading', () => {
      expect(selectAuthLoading(testState)).toBe(false);
    });

    it('selectAuthError should return error', () => {
      expect(selectAuthError(testState)).toBe('Test error');
    });
  });

  describe('async thunks', () => {
    describe('login', () => {
      it('should handle successful login', async () => {
        const mockResponse = {
          data: {
            user: { id: 1, email: 'test@example.com' },
            access_token: 'access-token-123',
            refresh_token: 'refresh-token-123',
          },
        };

        authAPI.login.mockResolvedValueOnce(mockResponse);

        await store.dispatch(login({ email: 'test@example.com', password: 'password123' }));

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual({ id: 1, email: 'test@example.com' });
        expect(state.accessToken).toBe('access-token-123');
        expect(state.refreshToken).toBe('refresh-token-123');
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle login failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Invalid credentials',
            },
          },
        };

        authAPI.login.mockRejectedValueOnce(mockError);

        await store.dispatch(login({ email: 'test@example.com', password: 'wrongpassword' }));

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Invalid credentials');
      });

      it('should set loading state during login', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        authAPI.login.mockReturnValueOnce(pendingPromise);

        const loginPromise = store.dispatch(login({ email: 'test@example.com', password: 'password123' }));

        expect(store.getState().auth.isLoading).toBe(true);

        resolvePromise({ data: { user: {}, access_token: 'token', refresh_token: 'refresh' } });
        await loginPromise;

        expect(store.getState().auth.isLoading).toBe(false);
      });
    });

    describe('register', () => {
      it('should handle successful registration', async () => {
        const mockResponse = {
          data: {
            message: 'Registration successful',
          },
        };

        authAPI.register.mockResolvedValueOnce(mockResponse);

        await store.dispatch(register({
          email: 'newuser@example.com',
          password: 'Password123',
          timezone: 'UTC',
        }));

        const state = store.getState().auth;
        // Registration doesn't auto-login, user needs to verify email
        expect(state.isAuthenticated).toBe(false);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle registration failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Email already exists',
            },
          },
        };

        authAPI.register.mockRejectedValueOnce(mockError);

        await store.dispatch(register({
          email: 'existing@example.com',
          password: 'Password123',
          timezone: 'UTC',
        }));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Email already exists');
      });
    });

    describe('logout', () => {
      beforeEach(() => {
        store = configureStore({
          reducer: { auth: authReducer },
          preloadedState: {
            auth: {
              user: { id: 1, email: 'test@example.com' },
              accessToken: 'some-token',
              refreshToken: 'some-refresh',
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionTimeout: null,
            },
          },
        });
        localStorage.setItem('accessToken', 'some-token');
        localStorage.setItem('refreshToken', 'some-refresh');
      });

      it('should handle successful logout', async () => {
        authAPI.logout.mockResolvedValueOnce({});

        await store.dispatch(logout());

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
      });

      it('should clear auth state even on logout failure', async () => {
        authAPI.logout.mockRejectedValueOnce(new Error('Network error'));

        await store.dispatch(logout());

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(localStorage.getItem('accessToken')).toBeNull();
      });
    });

    describe('verifyEmail', () => {
      it('should handle successful email verification', async () => {
        authAPI.verifyEmail.mockResolvedValueOnce({
          data: { message: 'Email verified successfully' },
        });

        await store.dispatch(verifyEmail('valid-token'));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle email verification failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Invalid or expired token',
            },
          },
        };

        authAPI.verifyEmail.mockRejectedValueOnce(mockError);

        await store.dispatch(verifyEmail('invalid-token'));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Invalid or expired token');
      });
    });

    describe('requestPasswordReset', () => {
      it('should handle successful password reset request', async () => {
        authAPI.requestPasswordReset.mockResolvedValueOnce({
          data: { message: 'Password reset email sent' },
        });

        await store.dispatch(requestPasswordReset('test@example.com'));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle password reset request failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Email not found',
            },
          },
        };

        authAPI.requestPasswordReset.mockRejectedValueOnce(mockError);

        await store.dispatch(requestPasswordReset('unknown@example.com'));

        const state = store.getState().auth;
        expect(state.error).toBe('Email not found');
      });
    });

    describe('resetPassword', () => {
      it('should handle successful password reset', async () => {
        authAPI.resetPassword.mockResolvedValueOnce({
          data: { message: 'Password reset successfully' },
        });

        await store.dispatch(resetPassword({
          token: 'valid-reset-token',
          newPassword: 'NewPassword123',
        }));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle password reset failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Token expired',
            },
          },
        };

        authAPI.resetPassword.mockRejectedValueOnce(mockError);

        await store.dispatch(resetPassword({
          token: 'expired-token',
          newPassword: 'NewPassword123',
        }));

        const state = store.getState().auth;
        expect(state.error).toBe('Token expired');
      });
    });
  });
});
