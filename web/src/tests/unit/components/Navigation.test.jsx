import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import accountReducer from '../../../features/account/accountSlice';
import Navigation from '../../../components/Navigation';

// Mock the API module
vi.mock('../../../services/api', () => ({
  authAPI: {
    logout: vi.fn().mockResolvedValue({}),
  },
  accountAPI: {
    getProfile: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@example.com',
          status: 'active',
          timezone: 'UTC',
        },
      },
    }),
  },
}));

import { authAPI, accountAPI } from '../../../services/api';

describe('Navigation', () => {
  const createStore = (authState = {}, accountState = {}) => {
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
          ...authState,
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

  const renderNavigation = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the app name', () => {
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);
    expect(screen.getByText('GTD Todo App')).toBeInTheDocument();
  });

  it('displays user initial from auth user', () => {
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('displays user initial from profile when user is null', () => {
    const store = createStore(
      { user: null },
      { profile: { email: 'profile@example.com' } }
    );
    renderNavigation(store);
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('displays question mark when no email available', () => {
    const store = createStore({ user: null }, { profile: null });
    renderNavigation(store);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('opens dropdown menu on click', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    const menuButton = screen.getByRole('button', { expanded: false });
    await user.click(menuButton);

    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays email in dropdown menu', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('closes menu on outside click', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    // Open menu
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Signed in')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Signed in')).not.toBeInTheDocument();
    });
  });

  it('closes menu on Escape key', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    // Open menu
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Signed in')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Signed in')).not.toBeInTheDocument();
    });
  });

  it('closes menu when Settings link is clicked', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));

    await waitFor(() => {
      expect(screen.queryByText('Signed in')).not.toBeInTheDocument();
    });
  });

  it('has correct link to settings page', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    await user.click(screen.getByRole('button'));
    const settingsLink = screen.getByRole('menuitem', { name: /settings/i });
    expect(settingsLink).toHaveAttribute('href', '/account/settings');
  });

  it('fetches profile when user and profile are both null', async () => {
    const store = createStore({ user: null }, { profile: null });
    renderNavigation(store);

    await waitFor(() => {
      expect(accountAPI.getProfile).toHaveBeenCalled();
    });
  });

  it('does not fetch profile when user exists', () => {
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    expect(accountAPI.getProfile).not.toHaveBeenCalled();
  });

  it('rotates dropdown arrow when menu is open', async () => {
    const user = userEvent.setup();
    const store = createStore({ user: { email: 'test@example.com' } });
    renderNavigation(store);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');

    // Initially not rotated
    expect(svg.className.baseVal).not.toContain('rotate-180');

    // Open menu
    await user.click(button);

    // Arrow should be rotated
    const updatedSvg = button.querySelector('svg');
    expect(updatedSvg.className.baseVal).toContain('rotate-180');
  });

  describe('main navigation links', () => {
    it('renders Inbox link', () => {
      const store = createStore({ user: { email: 'test@example.com' } });
      renderNavigation(store);
      const inboxLink = screen.getByRole('link', { name: /inbox/i });
      expect(inboxLink).toBeInTheDocument();
      expect(inboxLink).toHaveAttribute('href', '/inbox');
    });

    it('renders Clarify link', () => {
      const store = createStore({ user: { email: 'test@example.com' } });
      renderNavigation(store);
      const clarifyLink = screen.getByRole('link', { name: /clarify/i });
      expect(clarifyLink).toBeInTheDocument();
      expect(clarifyLink).toHaveAttribute('href', '/clarify');
    });

    it('renders Contexts link', () => {
      const store = createStore({ user: { email: 'test@example.com' } });
      renderNavigation(store);
      const contextsLink = screen.getByRole('link', { name: /contexts/i });
      expect(contextsLink).toBeInTheDocument();
      expect(contextsLink).toHaveAttribute('href', '/contexts');
    });
  });
});
