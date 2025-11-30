import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import RegisterPage from '../../../pages/RegisterPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
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

import { authAPI } from '../../../services/api';

describe('RegisterPage', () => {
  let store;

  const createStore = (preloadedState = {}) => {
    return configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionTimeout: null,
          ...preloadedState,
        },
      },
    });
  };

  const renderRegisterPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    store = createStore();
  });

  describe('rendering', () => {
    it('renders registration form with all required elements', () => {
      renderRegisterPage(store);

      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders Apple Sign-In button', () => {
      renderRegisterPage(store);

      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
    });

    it('renders link to login page', () => {
      renderRegisterPage(store);

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      const signInLink = screen.getByText(/sign in/i);
      expect(signInLink.closest('a')).toHaveAttribute('href', '/login');
    });

    it('shows password requirements hint', () => {
      renderRegisterPage(store);

      expect(screen.getByText(/must be at least 8 characters with 1 uppercase letter and 1 number/i)).toBeInTheDocument();
    });

    it('shows terms of service notice', () => {
      renderRegisterPage(store);

      expect(screen.getByText(/by creating an account, you agree to our/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates email format using HTML5 input type', () => {
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      // The email input should have type="email" for HTML5 validation
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('shows validation error for short password', async () => {
      const user = userEvent.setup();
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Short1');
      await user.type(confirmPasswordInput, 'Short1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for password without uppercase', async () => {
      const user = userEvent.setup();
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'lowercase123');
      await user.type(confirmPasswordInput, 'lowercase123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for password without number', async () => {
      const user = userEvent.setup();
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'NoNumberHere');
      await user.type(confirmPasswordInput, 'NoNumberHere');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for mismatched passwords', async () => {
      const user = userEvent.setup();
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'DifferentPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      // Trigger password mismatch validation
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'DifferentPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      // Fix the confirm password
      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, 'ValidPassword1');

      await waitFor(() => {
        expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls register action with correct data', async () => {
      const user = userEvent.setup();

      authAPI.register.mockResolvedValueOnce({
        data: {
          message: 'Registration successful',
        },
      });

      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'ValidPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authAPI.register).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'ValidPassword1',
          timezone: expect.any(String),
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();

      let resolveRegister;
      authAPI.register.mockImplementationOnce(() => new Promise((resolve) => {
        resolveRegister = resolve;
      }));

      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'ValidPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });

      resolveRegister({ data: { message: 'Success' } });
    });

    it('shows success message after successful registration', async () => {
      const user = userEvent.setup();

      authAPI.register.mockResolvedValueOnce({
        data: {
          message: 'Registration successful',
        },
      });

      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'ValidPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/please check your email to verify your account/i)).toBeInTheDocument();
    });

    it('disables submit button while loading', () => {
      store = createStore({ isLoading: true });
      renderRegisterPage(store);

      const submitButton = screen.getByRole('button', { name: /creating account/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('displays error message from Redux state', () => {
      store = createStore({ error: 'Email already exists' });
      renderRegisterPage(store);

      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    it('shows error message on registration failure', async () => {
      const user = userEvent.setup();

      authAPI.register.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Email already registered',
          },
        },
      });

      renderRegisterPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'ValidPassword1');
      await user.type(confirmPasswordInput, 'ValidPassword1');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });
  });
});
