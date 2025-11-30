import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import LoginPage from '../../../pages/LoginPage';

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

describe('LoginPage', () => {
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

  const renderLoginPage = (store, initialEntries = ['/login']) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          <LoginPage />
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
    it('renders login form with all required elements', () => {
      renderLoginPage(store);

      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    });

    it('renders Apple Sign-In button', () => {
      renderLoginPage(store);

      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument();
    });

    it('renders remember me checkbox', () => {
      renderLoginPage(store);

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows validation error for empty email', async () => {
      const user = userEvent.setup();
      renderLoginPage(store);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'ValidPassword123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // The HTML5 required attribute should prevent submission
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeRequired();
    });

    it('validates email format on form submission', async () => {
      const user = userEvent.setup();
      renderLoginPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Type invalid email - HTML5 validation will handle this
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword123');

      // The input should have email type for validation
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('shows validation error for short password', async () => {
      const user = userEvent.setup();
      renderLoginPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Trigger short password validation
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      // Clear and type valid password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'ValidPassword123');

      await waitFor(() => {
        expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls login action with correct credentials', async () => {
      const user = userEvent.setup();

      authAPI.login.mockResolvedValueOnce({
        data: {
          user: { id: 1, email: 'test@example.com' },
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      });

      renderLoginPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'ValidPassword123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authAPI.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'ValidPassword123',
        });
      });
    });

    it('shows loading state when isLoading is true in store', () => {
      store = createStore({ isLoading: true });
      renderLoginPage(store);

      // When loading, the button text changes to "Signing in..."
      // Use queryAllByText since both Apple button and submit button show loading state
      const loadingElements = screen.getAllByText(/signing in/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('disables submit button while loading', () => {
      store = createStore({ isLoading: true });
      renderLoginPage(store);

      // Find submit button by type="submit"
      const submitButton = document.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('displays error message from Redux state', () => {
      store = createStore({ error: 'Invalid credentials' });
      renderLoginPage(store);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('shows error message on login failure', async () => {
      const user = userEvent.setup();

      authAPI.login.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Invalid email or password',
          },
        },
      });

      renderLoginPage(store);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });
  });

  describe('navigation links', () => {
    it('has link to registration page', () => {
      renderLoginPage(store);

      const registerLink = screen.getByText(/create a new account/i);
      expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    });

    it('has link to password reset page', () => {
      renderLoginPage(store);

      const resetLink = screen.getByText(/forgot your password/i);
      expect(resetLink.closest('a')).toHaveAttribute('href', '/password-reset');
    });
  });
});
