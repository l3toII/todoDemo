import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/authSlice';
import PasswordResetRequestPage from '../../pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from '../../pages/PasswordResetConfirmPage';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  authAPI: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe('Password Reset with Email E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Password Reset Request Flow', () => {
    it('should render password reset request form correctly', () => {
      renderWithProviders(<PasswordResetRequestPage />);

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('should successfully request password reset', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      };

      api.authAPI.requestPasswordReset.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(api.authAPI.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during request', async () => {
      const user = userEvent.setup();
      api.authAPI.requestPasswordReset.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      // Should show loading state
      expect(await screen.findByText(/sending/i)).toBeInTheDocument();
    });

    it('should handle request error gracefully', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'Service temporarily unavailable',
            code: 'SERVICE_ERROR',
          },
        },
      };

      api.authAPI.requestPasswordReset.mockRejectedValueOnce(mockError);

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/service/i)).toBeInTheDocument();
      });
    });

    it('should validate email format before submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetRequestPage />);

      const emailInput = screen.getByLabelText(/email address/i);

      // Verify email input has correct attributes
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();

      // Type valid email
      await user.type(emailInput, 'valid@example.com');
      expect(emailInput).toHaveValue('valid@example.com');
    });

    it('should provide back to login navigation', () => {
      renderWithProviders(<PasswordResetRequestPage />);

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Password Reset Confirm Flow', () => {
    it('should render password reset confirm form with token', () => {
      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-reset-token'],
      });

      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('should successfully reset password with valid token', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'Password reset successful. You can now log in with your new password.',
        },
      };

      api.authAPI.resetPassword.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-reset-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecurePass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(api.authAPI.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewSecurePass123');
      });

      // After successful reset, user is redirected to login with a success message
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: {
            message: 'Password reset successful! You can now sign in with your new password.',
          },
        });
      });
    });

    it('should show error for invalid reset token', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'Invalid or expired reset token',
            code: 'INVALID_TOKEN',
          },
        },
      };

      api.authAPI.resetPassword.mockRejectedValueOnce(mockError);

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=invalid-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecurePass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid|expired/i)).toBeInTheDocument();
      });
    });

    it('should show error for expired reset token', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'Reset token has expired',
            code: 'TOKEN_EXPIRED',
          },
        },
      };

      api.authAPI.resetPassword.mockRejectedValueOnce(mockError);

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=expired-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecurePass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'weak');
      await user.type(screen.getByLabelText(/confirm new password/i), 'weak');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(api.authAPI.resetPassword).not.toHaveBeenCalled();
    });

    it('should validate passwords match', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'DifferentPass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(api.authAPI.resetPassword).not.toHaveBeenCalled();
    });

    it('should handle missing token', () => {
      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm'],
      });

      // Component returns null and redirects when token is missing
      // The navigate is called via useEffect, so the component renders nothing
      expect(mockNavigate).toHaveBeenCalledWith('/password-reset', { replace: true });
    });

    it('should show loading state during password reset', async () => {
      const user = userEvent.setup();
      api.authAPI.resetPassword.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecurePass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      expect(await screen.findByText(/resetting/i)).toBeInTheDocument();
    });

    it('should redirect to login after successful reset', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'Password reset successful. You can now log in with your new password.',
        },
      };

      api.authAPI.resetPassword.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-token'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewSecurePass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      // After successful reset, user is redirected to login with a success message
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: {
            message: 'Password reset successful! You can now sign in with your new password.',
          },
        });
      });
    });
  });

  describe('Complete Password Reset Flow', () => {
    it('should complete full password reset flow: request -> confirm -> redirect to login', async () => {
      const user = userEvent.setup();

      // Step 1: Request password reset
      const mockRequestResponse = {
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      };
      api.authAPI.requestPasswordReset.mockResolvedValueOnce(mockRequestResponse);

      const { unmount } = renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      unmount();
      mockNavigate.mockClear();

      // Step 2: Confirm password reset (simulating clicking email link)
      const mockConfirmResponse = {
        data: {
          message: 'Password reset successful. You can now log in with your new password.',
        },
      };
      api.authAPI.resetPassword.mockResolvedValueOnce(mockConfirmResponse);

      renderWithProviders(<PasswordResetConfirmPage />, {
        initialEntries: ['/password-reset/confirm?token=valid-token-from-email'],
      });

      await user.type(screen.getByLabelText(/^new password$/i), 'BrandNewPass123');
      await user.type(screen.getByLabelText(/confirm new password/i), 'BrandNewPass123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      // After successful reset, user is redirected to login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: {
            message: 'Password reset successful! You can now sign in with your new password.',
          },
        });
      });
    });
  });

  describe('Security Considerations', () => {
    it('should not reveal if email exists in system during request', async () => {
      const user = userEvent.setup();
      // API should always return success message regardless of email existence
      const mockResponse = {
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      };

      api.authAPI.requestPasswordReset.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'nonexistent@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        // Should show generic success, not "email not found"
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });

      // Should not show "email not found" or similar
      expect(screen.queryByText(/not found|does not exist/i)).not.toBeInTheDocument();
    });
  });
});
