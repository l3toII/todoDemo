import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import accountReducer from '../../features/account/accountSlice';
import authReducer from '../../features/auth/authSlice';
import AccountSettingsPage from '../../pages/AccountSettingsPage';
import { accountAPI } from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  accountAPI: {
    getProfile: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

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
      ...preloadedState,
    },
  });

  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/account/settings']}>
          {component}
        </MemoryRouter>
      </Provider>
    ),
    store,
  };
};

describe('Account Preferences E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Profile Loading', () => {
    it('should display loading state while fetching profile', async () => {
      accountAPI.getProfile.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<AccountSettingsPage />);

      // Should show loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should display profile information after loading', async () => {
      const mockProfile = {
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
            verified_at: '2024-01-15T10:05:00Z',
          },
        },
      };

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should display error on profile fetch failure', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Failed to load profile',
            code: 'PROFILE_ERROR',
          },
        },
      };

      accountAPI.getProfile.mockRejectedValueOnce(mockError);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Timezone Update', () => {
    it('should update timezone successfully', async () => {
      const user = userEvent.setup();
      const mockProfile = {
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
            ...mockProfile.data.user,
            timezone: 'Europe/Paris',
          },
          message: 'Preferences updated successfully',
        },
      };

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);
      accountAPI.updatePreferences.mockResolvedValueOnce(mockUpdateResponse);

      renderWithProviders(<AccountSettingsPage />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Find and change timezone selector
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/Paris');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(accountAPI.updatePreferences).toHaveBeenCalledWith({
          timezone: 'Europe/Paris',
          notification_preferences: {},
        });
      });

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/preferences updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should display error on timezone update failure', async () => {
      const user = userEvent.setup();
      const mockProfile = {
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
            error: 'Invalid timezone',
            code: 'INVALID_TIMEZONE',
          },
        },
      };

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);
      accountAPI.updatePreferences.mockRejectedValueOnce(mockError);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/London');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid timezone/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Preferences Update', () => {
    it('should update notification preferences successfully', async () => {
      const user = userEvent.setup();
      const mockProfile = {
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            timezone: 'UTC',
            notification_preferences: {
              email_weekly_review: false,
              email_deadline_reminder: false,
            },
            status: 'active',
          },
        },
      };

      const mockUpdateResponse = {
        data: {
          user: {
            ...mockProfile.data.user,
            notification_preferences: {
              email_weekly_review: true,
              email_deadline_reminder: false,
            },
          },
          message: 'Preferences updated successfully',
        },
      };

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);
      accountAPI.updatePreferences.mockResolvedValueOnce(mockUpdateResponse);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Find and toggle notification checkbox (Weekly Review Reminder)
      const weeklyReviewCheckbox = screen.getByRole('checkbox', { name: /weekly review reminder/i });
      await user.click(weeklyReviewCheckbox);

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(accountAPI.updatePreferences).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should enable save button only when changes are made', async () => {
      const user = userEvent.setup();
      const mockProfile = {
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

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Save button should be disabled initially (no changes)
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      // Make a change
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/London');

      // Save button should now be enabled
      expect(saveButton).toBeEnabled();
    });

    it('should reset form to original values on reset button click', async () => {
      const user = userEvent.setup();
      const mockProfile = {
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

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      // Make a change
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/Paris');

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Should be back to original value
      expect(timezoneSelect).toHaveValue('UTC');
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      const mockProfile = {
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

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);
      // Keep the promise pending to verify loading state
      let resolveUpdate;
      accountAPI.updatePreferences.mockImplementationOnce(
        () => new Promise((resolve) => { resolveUpdate = resolve; })
      );

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      await user.selectOptions(timezoneSelect, 'Europe/London');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show saving state (button text changes to "Saving...")
      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });

      // Cleanup: resolve the pending promise
      resolveUpdate?.({ data: { user: mockProfile.data.user, message: 'Success' } });
    });
  });

  describe('Navigation', () => {
    it('should have link to delete account page', async () => {
      const mockProfile = {
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

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      const deleteLink = screen.getByRole('link', { name: /delete account/i });
      expect(deleteLink).toHaveAttribute('href', '/account/delete');
    });
  });

  describe('Danger Zone', () => {
    it('should display danger zone section with warning', async () => {
      const mockProfile = {
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

      accountAPI.getProfile.mockResolvedValueOnce(mockProfile);

      renderWithProviders(<AccountSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
      expect(screen.getByText(/no going back/i)).toBeInTheDocument();
    });
  });
});
