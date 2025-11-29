import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/authSlice';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import PasswordResetRequestPage from '../../pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from '../../pages/PasswordResetConfirmPage';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    verifyEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    appleSignIn: vi.fn(),
  },
}));

// Helper function to render with providers
const renderWithProviders = (component, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });

  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>{component}</BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Flow', () => {
    it('should render login form with all required fields', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create a new account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
    });

    it('should show validation errors for invalid inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Type and clear to trigger validation
      await user.type(emailInput, 'test');
      await user.clear(emailInput);
      await user.type(passwordInput, 'test');
      await user.clear(passwordInput);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is invalid/i)).toBeInTheDocument();
      });
    });

    it('should successfully login with valid credentials', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      };

      api.authAPI.login.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(api.authAPI.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
        });
      });
    });

    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: { message: 'Invalid credentials' },
        },
      };

      api.authAPI.login.mockRejectedValueOnce(mockError);

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should render registration form with all required fields', () => {
      renderWithProviders(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
    });

    it('should validate password requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'weak');
      await user.type(confirmPasswordInput, 'weak');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password contains uppercase and number', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.type(confirmPasswordInput, 'password');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        const errorText = screen.getByText(/uppercase letter/i);
        expect(errorText).toBeInTheDocument();
      });
    });

    it('should validate passwords match', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password456');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should successfully register with valid data', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'Registration successful. Please verify your email.',
        },
      };

      api.authAPI.register.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(api.authAPI.register).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
          timezone: expect.any(String),
        });
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });
    });

    it('should display error message on registration failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: { message: 'Email already exists' },
        },
      };

      api.authAPI.register.mockRejectedValueOnce(mockError);

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Flow', () => {
    it('should render password reset request form', () => {
      renderWithProviders(<PasswordResetRequestPage />);

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('should validate email on password reset request', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PasswordResetRequestPage />);

      const emailInput = screen.getByLabelText(/email address/i);

      // Trigger validation by typing and clearing
      await user.type(emailInput, 'test');
      await user.clear(emailInput);
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should successfully submit password reset request', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: { message: 'Password reset email sent' },
      };

      api.authAPI.requestPasswordReset.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(api.authAPI.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should display error on password reset request failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: { message: 'Service unavailable' },
        },
      };

      api.authAPI.requestPasswordReset.mockRejectedValueOnce(mockError);

      renderWithProviders(<PasswordResetRequestPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Apple Sign-In', () => {
    it('should render Apple Sign-In button on login page', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
    });

    it('should render Apple Sign-In button on register page', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
    });
  });

  describe('Protected Routes', () => {
    it('should store tokens in localStorage on successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
        },
      };

      api.authAPI.login.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
        expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
      });
    });
  });

  describe('Form Accessibility', () => {
    it('login form should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      await user.tab();
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('registration form should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.tab();
      await user.tab();
      expect(emailInput).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      api.authAPI.login.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText(/signing in/i)).toBeInTheDocument();
    });

    it('should show loading state during registration', async () => {
      const user = userEvent.setup();
      api.authAPI.register.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<RegisterPage />);

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText(/creating account/i)).toBeInTheDocument();
    });
  });
});
