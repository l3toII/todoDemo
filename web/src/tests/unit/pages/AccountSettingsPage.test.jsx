import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import accountReducer from '../../../features/account/accountSlice';
import AccountSettingsPage from '../../../pages/AccountSettingsPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  accountAPI: {
    getProfile: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

import { accountAPI } from '../../../services/api';

describe('AccountSettingsPage', () => {
  const mockProfile = {
    id: '123',
    email: 'test@example.com',
    status: 'active',
    timezone: 'Europe/Paris',
    notification_preferences: {
      email_weekly_review: true,
      email_deadline_reminder: false,
    },
    created_at: '2024-01-15T10:30:00Z',
    verified_at: '2024-02-20T11:00:00Z',
  };

  const createStore = (accountState = {}) => {
    return configureStore({
      reducer: {
        auth: authReducer,
        account: accountReducer,
      },
      preloadedState: {
        auth: {
          user: null,
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          isAuthenticated: true,
          isLoading: false,
          error: null,
          sessionTimeout: null,
        },
        account: {
          profile: null,
          isLoading: false,
          isSaving: false,
          error: null,
          successMessage: null,
          ...accountState,
        },
      },
    });
  };

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <AccountSettingsPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    accountAPI.getProfile.mockResolvedValue({ data: { user: mockProfile } });
    accountAPI.updatePreferences.mockResolvedValue({ data: { user: mockProfile } });
  });

  it('renders page title', async () => {
    const store = createStore();
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    const store = createStore({ isLoading: true });
    renderPage(store);

    // Should show skeleton loading
    expect(screen.queryByText('Profile Information')).not.toBeInTheDocument();
  });

  it('fetches profile on mount', async () => {
    const store = createStore();
    renderPage(store);

    await waitFor(() => {
      expect(accountAPI.getProfile).toHaveBeenCalled();
    });
  });

  it('displays profile information', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays member since date', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Member Since')).toBeInTheDocument();
    });
    expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
  });

  it('displays email verified date', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Email Verified')).toBeInTheDocument();
    });
    expect(screen.getByText('February 20, 2024')).toBeInTheDocument();
  });

  it('shows "Not verified" when email not verified', async () => {
    const unverifiedProfile = { ...mockProfile, verified_at: null };
    accountAPI.getProfile.mockResolvedValue({ data: { user: unverifiedProfile } });
    const store = createStore({
      profile: unverifiedProfile,
      isLoading: false,
    });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Not verified')).toBeInTheDocument();
    });
  });

  it('renders timezone selector with correct value', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      const timezoneSelect = screen.getByLabelText(/timezone/i);
      expect(timezoneSelect.value).toBe('Europe/Paris');
    });
  });

  it('renders notification preferences', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByLabelText(/weekly review reminder/i)).toBeChecked();
    });
    expect(screen.getByLabelText(/deadline reminders/i)).not.toBeChecked();
  });

  it('enables save button when changes are made', async () => {
    const user = userEvent.setup();
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    // Change timezone
    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(timezoneSelect, 'UTC');

    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('enables reset button when changes are made', async () => {
    const user = userEvent.setup();
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });

    // Make a change
    await user.click(screen.getByLabelText(/deadline reminders/i));

    expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });

    // Change value
    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await user.selectOptions(timezoneSelect, 'UTC');

    // Click reset
    await user.click(screen.getByRole('button', { name: /reset/i }));

    // Should be back to original
    expect(timezoneSelect.value).toBe('Europe/Paris');
  });

  it('calls updatePreferences on save', async () => {
    const user = userEvent.setup();
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
    });

    // Change timezone
    await user.selectOptions(screen.getByLabelText(/timezone/i), 'UTC');

    // Save
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(accountAPI.updatePreferences).toHaveBeenCalledWith({
        timezone: 'UTC',
        notification_preferences: mockProfile.notification_preferences,
      });
    });
  });

  it('displays success message after save', async () => {
    const store = createStore({
      profile: mockProfile,
      isLoading: false,
      successMessage: 'Preferences updated successfully',
    });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Preferences updated successfully')).toBeInTheDocument();
    });
  });

  it('displays error message on failure', async () => {
    // Mock getProfile to reject, which triggers the error state
    accountAPI.getProfile.mockRejectedValue({
      response: { data: { error: 'Failed to update preferences' } }
    });
    const store = createStore({
      profile: null,
      isLoading: false,
    });
    renderPage(store);

    // Wait for the error message to appear after fetch fails
    await waitFor(() => {
      expect(screen.getByText('Failed to update preferences')).toBeInTheDocument();
    });
  });

  it('shows saving state on button', async () => {
    const store = createStore({
      profile: mockProfile,
      isLoading: false,
      isSaving: true,
    });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('renders danger zone with delete link', async () => {
    const store = createStore({ profile: mockProfile, isLoading: false });
    renderPage(store);

    await waitFor(() => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /delete account/i })).toHaveAttribute(
      'href',
      '/account/delete'
    );
  });

  it('displays N/A for missing data', async () => {
    const incompleteProfile = { ...mockProfile, email: null, created_at: null };
    accountAPI.getProfile.mockResolvedValue({ data: { user: incompleteProfile } });
    const store = createStore({
      profile: incompleteProfile,
      isLoading: false,
    });
    renderPage(store);

    await waitFor(() => {
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });
});
