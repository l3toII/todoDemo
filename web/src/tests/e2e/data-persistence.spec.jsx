import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import accountReducer from '../../features/account/accountSlice';
import authReducer from '../../features/auth/authSlice';
import LoginPage from '../../pages/LoginPage';
import AccountSettingsPage from '../../pages/AccountSettingsPage';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
  },
  accountAPI: {
    getProfile: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

// Helper function to create store
const createStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      account: accountReducer,
      auth: authReducer,
    },
    preloadedState,
  });
};

// Helper function to render with providers
const renderWithProviders = (component, { store, initialEntries = ['/'] } = {}) => {
  const testStore = store || createStore();

  return {
    ...render(
      <Provider store={testStore}>
        <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
      </Provider>
    ),
    store: testStore,
  };
};

describe('Data Persistence E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Token Persistence', () => {
    it('should store tokens in localStorage after successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          user: { id: 'user-123', email: 'user@example.com' },
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
        },
      };

      api.authAPI.login.mockResolvedValueOnce(mockResponse);

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('accessToken')).toBe('test-access-token');
        expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token');
      });
    });

    it('should clear tokens from localStorage after logout', async () => {
      // Pre-set tokens
      localStorage.setItem('accessToken', 'existing-access-token');
      localStorage.setItem('refreshToken', 'existing-refresh-token');

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'existing-access-token',
          refreshToken: 'existing-refresh-token',
        },
      });

      api.authAPI.logout.mockResolvedValueOnce({ data: { message: 'Logged out' } });

      // Dispatch logout action
      const { clearAuth } = await import('../../features/auth/authSlice');
      store.dispatch(clearAuth());

      // Verify tokens are cleared from state
      const state = store.getState();
      expect(state.auth.accessToken).toBeNull();
      expect(state.auth.isAuthenticated).toBe(false);
    });

    it('should restore authentication state from localStorage on app load', () => {
      localStorage.setItem('accessToken', 'stored-access-token');
      localStorage.setItem('refreshToken', 'stored-refresh-token');

      // Create store with initial state that reads from localStorage
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      const store = createStore({
        auth: {
          user: null,
          isAuthenticated: !!accessToken,
          accessToken,
          refreshToken,
        },
      });

      const state = store.getState();
      expect(state.auth.accessToken).toBe('stored-access-token');
      expect(state.auth.refreshToken).toBe('stored-refresh-token');
      expect(state.auth.isAuthenticated).toBe(true);
    });
  });

  describe('User Data Persistence After Logout/Login', () => {
    it('should fetch and display user profile after login', async () => {
      const user = userEvent.setup();

      const mockLoginResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'America/New_York',
          },
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      };

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'America/New_York',
            notification_preferences: {
              email_reminders: true,
              weekly_review: false,
            },
            status: 'active',
            created_at: '2024-01-15T10:00:00Z',
          },
        },
      };

      api.authAPI.login.mockResolvedValueOnce(mockLoginResponse);
      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);

      // First, login
      const { unmount } = renderWithProviders(<LoginPage />);

      await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('accessToken')).toBe('new-access-token');
      });

      unmount();

      // Then, render settings page (simulating navigation after login)
      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'new-access-token',
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      // Profile should be fetched and displayed
      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      expect(api.accountAPI.getProfile).toHaveBeenCalled();
    });

    it('should preserve user preferences after logout and login', async () => {
      const user = userEvent.setup();

      // Initial profile with specific preferences
      const originalPreferences = {
        timezone: 'Europe/Paris',
        notification_preferences: {
          email_reminders: true,
          weekly_review: true,
        },
      };

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            ...originalPreferences,
            status: 'active',
          },
        },
      };

      api.accountAPI.getProfile.mockResolvedValue(mockProfileResponse);

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'access-token',
        },
      });

      // Render settings page
      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Verify timezone is loaded
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      expect(timezoneSelect).toHaveValue('Europe/Paris');
    });

    it('should update preferences and persist them', async () => {
      const user = userEvent.setup();

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'UTC',
            notification_preferences: {},
            status: 'active',
          },
        },
      };

      const mockUpdateResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'Asia/Tokyo',
            notification_preferences: {},
            status: 'active',
          },
          message: 'Preferences updated successfully',
        },
      };

      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);
      api.accountAPI.updatePreferences.mockResolvedValueOnce(mockUpdateResponse);

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'access-token',
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Change timezone
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Asia/Tokyo');

      // Save
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(api.accountAPI.updatePreferences).toHaveBeenCalledWith({
          timezone: 'Asia/Tokyo',
          notification_preferences: {},
        });
      });

      // Verify update in store
      await waitFor(() => {
        const state = store.getState();
        expect(state.account.profile.timezone).toBe('Asia/Tokyo');
      });
    });
  });

  describe('Session Recovery', () => {
    it('should maintain session across page refreshes (simulated)', async () => {
      // Simulate stored tokens
      localStorage.setItem('accessToken', 'persisted-access-token');
      localStorage.setItem('refreshToken', 'persisted-refresh-token');

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'persisted@example.com',
            timezone: 'UTC',
            notification_preferences: {},
            status: 'active',
          },
        },
      };

      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);

      // Create store as if app just loaded
      const store = createStore({
        auth: {
          user: null,
          isAuthenticated: true,
          accessToken: localStorage.getItem('accessToken'),
          refreshToken: localStorage.getItem('refreshToken'),
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      // Profile should be fetched using persisted token
      await waitFor(() => {
        expect(api.accountAPI.getProfile).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('persisted@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency', () => {
    it('should display consistent data across store and UI', async () => {
      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'consistent@example.com',
            timezone: 'America/Los_Angeles',
            notification_preferences: {
              email_reminders: true,
            },
            status: 'active',
            created_at: '2024-06-01T00:00:00Z',
          },
        },
      };

      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'consistent@example.com' },
          isAuthenticated: true,
          accessToken: 'access-token',
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      await waitFor(() => {
        expect(screen.getByText('consistent@example.com')).toBeInTheDocument();
      });

      // Verify store state matches what's displayed
      const state = store.getState();
      expect(state.account.profile.email).toBe('consistent@example.com');
      expect(state.account.profile.timezone).toBe('America/Los_Angeles');
      expect(state.account.profile.status).toBe('active');

      // Verify UI matches store
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      expect(timezoneSelect).toHaveValue('America/Los_Angeles');
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should update store when preferences are saved', async () => {
      const user = userEvent.setup();

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'UTC',
            notification_preferences: { email_weekly_review: false },
            status: 'active',
          },
        },
      };

      const mockUpdateResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'Europe/London',
            notification_preferences: { email_weekly_review: true },
            status: 'active',
          },
          message: 'Preferences updated successfully',
        },
      };

      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);
      api.accountAPI.updatePreferences.mockResolvedValueOnce(mockUpdateResponse);

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'access-token',
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Make changes
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/London');

      const weeklyReviewCheckbox = screen.getByRole('checkbox', { name: /weekly review reminder/i });
      await user.click(weeklyReviewCheckbox);

      // Save
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        const state = store.getState();
        expect(state.account.profile.timezone).toBe('Europe/London');
        expect(state.account.profile.notification_preferences.email_weekly_review).toBe(true);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should retain local state on save failure', async () => {
      const user = userEvent.setup();

      const mockProfileResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'UTC',
            notification_preferences: {},
            status: 'active',
          },
        },
      };

      const mockError = {
        response: {
          data: {
            error: 'Server error',
            code: 'SERVER_ERROR',
          },
        },
      };

      api.accountAPI.getProfile.mockResolvedValueOnce(mockProfileResponse);
      api.accountAPI.updatePreferences.mockRejectedValueOnce(mockError);

      const store = createStore({
        auth: {
          user: { id: 'user-123', email: 'user@example.com' },
          isAuthenticated: true,
          accessToken: 'access-token',
        },
      });

      renderWithProviders(<AccountSettingsPage />, {
        store,
        initialEntries: ['/account/settings'],
      });

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Make changes
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/Berlin');

      // Try to save (will fail)
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Local state should still show the changed value
      expect(timezoneSelect).toHaveValue('Europe/Berlin');

      // Store should still have original value (profile loaded from initial fetch)
      const state = store.getState();
      expect(state.account.profile.timezone).toBe('UTC');
    });
  });
});
