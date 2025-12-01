import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/authSlice';
import RegisterPage from '../../pages/RegisterPage';
import VerifyEmailPage from '../../pages/VerifyEmailPage';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  authAPI: {
    register: vi.fn(),
    verifyEmail: vi.fn(),
    login: vi.fn(),
  },
}));

// Helper function to render with providers
const renderWithProviders = (component, { initialEntries = ['/'], preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });

  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
      </Provider>
    ),
    store,
  };
};

describe('Registration with Email Verification E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration flow: register -> receive success message', async () => {
      const user = userEvent.setup();
      const mockRegisterResponse = {
        data: {
          message: 'Registration successful. Please check your email to verify your account.',
          user: {
            id: 'user-123',
            email: 'newuser@example.com',
            status: 'pending_verification',
          },
        },
      };

      api.authAPI.register.mockResolvedValueOnce(mockRegisterResponse);

      renderWithProviders(<RegisterPage />);

      // Fill out registration form
      await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify API was called with correct data
      await waitFor(() => {
        expect(api.authAPI.register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          timezone: expect.any(String),
        });
      });

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });

      // Verify email verification instructions are shown
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    it('should show pending verification status after registration', async () => {
      const user = userEvent.setup();
      const mockRegisterResponse = {
        data: {
          message: 'Registration successful. Please check your email to verify your account.',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            status: 'pending_verification',
          },
        },
      };

      api.authAPI.register.mockResolvedValueOnce(mockRegisterResponse);

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Email Verification Flow', () => {
    it('should verify email with valid token', async () => {
      const mockVerifyResponse = {
        data: {
          message: 'Email verified successfully. You can now log in.',
          user: {
            id: 'user-123',
            email: 'verified@example.com',
            status: 'active',
          },
        },
      };

      api.authAPI.verifyEmail.mockResolvedValueOnce(mockVerifyResponse);

      renderWithProviders(<VerifyEmailPage />, {
        initialEntries: ['/verify-email?token=valid-verification-token'],
      });

      // Wait for verification to complete
      await waitFor(() => {
        expect(api.authAPI.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
      });

      // Verify login link is available
      expect(screen.getByRole('link', { name: /go to login/i })).toBeInTheDocument();
    });

    it('should show error for invalid verification token', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Invalid verification token',
            code: 'INVALID_TOKEN',
          },
        },
      };

      api.authAPI.verifyEmail.mockRejectedValueOnce(mockError);

      renderWithProviders(<VerifyEmailPage />, {
        initialEntries: ['/verify-email?token=invalid-token'],
      });

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      });

      // Should show options to register again or login
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });

    it('should show error for expired verification token', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Verification token has expired',
            code: 'TOKEN_EXPIRED',
          },
        },
      };

      api.authAPI.verifyEmail.mockRejectedValueOnce(mockError);

      renderWithProviders(<VerifyEmailPage />, {
        initialEntries: ['/verify-email?token=expired-token'],
      });

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('should handle missing token gracefully', async () => {
      renderWithProviders(<VerifyEmailPage />, {
        initialEntries: ['/verify-email'],
      });

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      });

      // API should not be called without token
      expect(api.authAPI.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('Registration Error Handling', () => {
    it('should display error when email already exists', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'User with this email already exists',
            code: 'EMAIL_EXISTS',
          },
        },
      };

      api.authAPI.register.mockRejectedValueOnce(mockError);

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });

    it('should display error on network failure during registration', async () => {
      const user = userEvent.setup();
      const mockError = {
        message: 'Network Error',
        response: undefined,
      };

      api.authAPI.register.mockRejectedValueOnce(mockError);

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        // Should show some error message
        const errorElement = screen.queryByRole('alert') || screen.queryByText(/error|failed/i);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Registration Form Validation', () => {
    it('should prevent submission with mismatched passwords', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      // API should not be called
      expect(api.authAPI.register).not.toHaveBeenCalled();
    });

    it('should prevent submission with weak password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'weak');
      await user.type(screen.getByLabelText(/confirm password/i), 'weak');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(api.authAPI.register).not.toHaveBeenCalled();
    });
  });

  describe('Post-Verification Login', () => {
    it('should allow login after successful email verification', async () => {
      const mockVerifyResponse = {
        data: {
          message: 'Email verified successfully. You can now log in.',
          user: {
            id: 'user-123',
            email: 'verified@example.com',
            status: 'active',
          },
        },
      };

      api.authAPI.verifyEmail.mockResolvedValueOnce(mockVerifyResponse);

      renderWithProviders(<VerifyEmailPage />, {
        initialEntries: ['/verify-email?token=valid-token'],
      });

      await waitFor(() => {
        expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
      });

      // Login link should be present and functional
      const loginLink = screen.getByRole('link', { name: /go to login/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});
