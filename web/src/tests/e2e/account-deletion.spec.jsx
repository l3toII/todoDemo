import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import accountReducer from '../../features/account/accountSlice';
import authReducer from '../../features/auth/authSlice';
import AccountDeletionPage from '../../pages/AccountDeletionPage';
import { accountAPI } from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  accountAPI: {
    deleteAccount: vi.fn(),
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
const renderWithProviders = (component, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      account: accountReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'user-123', email: 'user@example.com' },
        isAuthenticated: true,
        accessToken: 'mock-token',
      },
      account: {
        profile: {
          id: 'user-123',
          email: 'user@example.com',
        },
        isLoading: false,
        isSaving: false,
        error: null,
      },
      ...preloadedState,
    },
  });

  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/account/delete']}>
          {component}
        </MemoryRouter>
      </Provider>
    ),
    store,
  };
};

describe('Account Deletion E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Page Rendering', () => {
    it('should render deletion page with all required elements', () => {
      renderWithProviders(<AccountDeletionPage />);

      expect(screen.getByRole('heading', { name: /delete account/i })).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type.*delete.*to confirm/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /permanently delete/i })).toBeInTheDocument();
    });

    it('should display warning about data deletion', () => {
      renderWithProviders(<AccountDeletionPage />);

      expect(screen.getByText(/tasks and projects will be permanently deleted/i)).toBeInTheDocument();
      expect(screen.getByText(/inbox items will be erased/i)).toBeInTheDocument();
      expect(screen.getByText(/irreversible/i)).toBeInTheDocument();
    });

    it('should display GDPR compliance notice', () => {
      renderWithProviders(<AccountDeletionPage />);

      expect(screen.getByText(/gdpr compliance/i)).toBeInTheDocument();
      expect(screen.getByText(/right to erasure/i)).toBeInTheDocument();
    });

    it('should have back to settings link', () => {
      renderWithProviders(<AccountDeletionPage />);

      const backLink = screen.getByRole('link', { name: /back to settings/i });
      expect(backLink).toHaveAttribute('href', '/account/settings');
    });

    it('should have cancel link', () => {
      renderWithProviders(<AccountDeletionPage />);

      const cancelLink = screen.getByRole('link', { name: /cancel/i });
      expect(cancelLink).toHaveAttribute('href', '/account/settings');
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when password is empty', () => {
      renderWithProviders(<AccountDeletionPage />);

      const submitButton = screen.getByRole('button', { name: /permanently delete/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when DELETE confirmation is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');

      const submitButton = screen.getByRole('button', { name: /permanently delete/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when DELETE confirmation is incorrect', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'REMOVE');

      const submitButton = screen.getByRole('button', { name: /permanently delete/i });
      expect(submitButton).toBeDisabled();

      expect(screen.getByText(/please type delete exactly/i)).toBeInTheDocument();
    });

    it('should enable submit button when both fields are valid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');

      const submitButton = screen.getByRole('button', { name: /permanently delete/i });
      expect(submitButton).toBeEnabled();
    });

    it('should convert confirmation text to uppercase', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountDeletionPage />);

      const confirmInput = screen.getByLabelText(/type.*delete.*to confirm/i);
      await user.type(confirmInput, 'delete');

      expect(confirmInput).toHaveValue('DELETE');
    });
  });

  describe('Account Deletion Flow', () => {
    it('should successfully delete account and redirect to login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'Account deleted successfully',
        },
      };

      accountAPI.deleteAccount.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'correctpassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(accountAPI.deleteAccount).toHaveBeenCalledWith('correctpassword', 'DELETE');
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { message: 'Your account has been permanently deleted.' },
        });
      });
    });

    it('should display error on incorrect password', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'Invalid password',
            code: 'INVALID_PASSWORD',
          },
        },
      };

      accountAPI.deleteAccount.mockRejectedValueOnce(mockError);

      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should display error on deletion failure', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: 'Failed to delete account. Please try again.',
            code: 'DELETION_FAILED',
          },
        },
      };

      accountAPI.deleteAccount.mockRejectedValueOnce(mockError);

      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during deletion', async () => {
      const user = userEvent.setup();
      accountAPI.deleteAccount.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      // Should show deleting state
      expect(await screen.findByText(/deleting/i)).toBeInTheDocument();
    });

    it('should disable form inputs during deletion', async () => {
      const user = userEvent.setup();
      accountAPI.deleteAccount.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<AccountDeletionPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      const confirmInput = screen.getByLabelText(/type.*delete.*to confirm/i);

      await user.type(passwordInput, 'mypassword');
      await user.type(confirmInput, 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(passwordInput).toBeDisabled();
        expect(confirmInput).toBeDisabled();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountDeletionPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click toggle button (it's the button inside the password field container)
      const toggleButton = passwordInput.parentElement.querySelector('button');
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Clear Auth on Successful Deletion', () => {
    it('should clear authentication state after successful deletion', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          message: 'Account deleted successfully',
        },
      };

      accountAPI.deleteAccount.mockResolvedValueOnce(mockResponse);

      const { store } = renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Check that auth state is cleared
      const state = store.getState();
      expect(state.auth.user).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      const mockError = {
        message: 'Network Error',
        response: undefined,
      };

      accountAPI.deleteAccount.mockRejectedValueOnce(mockError);

      renderWithProviders(<AccountDeletionPage />);

      await user.type(screen.getByLabelText(/password/i), 'mypassword');
      await user.type(screen.getByLabelText(/type.*delete.*to confirm/i), 'DELETE');
      await user.click(screen.getByRole('button', { name: /permanently delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete account/i)).toBeInTheDocument();
      });
    });
  });
});
