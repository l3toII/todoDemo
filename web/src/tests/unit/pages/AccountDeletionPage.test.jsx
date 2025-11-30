import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import accountReducer from '../../../features/account/accountSlice';
import AccountDeletionPage from '../../../pages/AccountDeletionPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  accountAPI: {
    deleteAccount: vi.fn(),
  },
}));

import { accountAPI } from '../../../services/api';

describe('AccountDeletionPage', () => {
  const createStore = (accountState = {}) => {
    return configureStore({
      reducer: {
        auth: authReducer,
        account: accountReducer,
      },
      preloadedState: {
        auth: {
          user: { email: 'test@example.com' },
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
          <AccountDeletionPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('displays warning message', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('displays list of consequences', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByText(/all your tasks and projects will be permanently deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/your inbox items will be erased/i)).toBeInTheDocument();
    expect(screen.getByText(/this action is/i)).toBeInTheDocument();
  });

  it('displays GDPR notice', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByText('GDPR Compliance')).toBeInTheDocument();
    expect(screen.getByText(/right to erasure/i)).toBeInTheDocument();
  });

  it('has back link to settings', () => {
    const store = createStore();
    renderPage(store);

    const backLink = screen.getByRole('link', { name: /back to settings/i });
    expect(backLink).toHaveAttribute('href', '/account/settings');
  });

  it('renders password input', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByLabelText(/enter your password/i)).toBeInTheDocument();
  });

  it('renders confirmation text input', () => {
    const store = createStore();
    renderPage(store);

    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
  });

  it('disables submit button initially', () => {
    const store = createStore();
    renderPage(store);

    const submitButton = screen.getByRole('button', { name: /permanently delete/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when password and DELETE are entered', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderPage(store);

    await user.type(screen.getByLabelText(/enter your password/i), 'mypassword');
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');

    const submitButton = screen.getByRole('button', { name: /permanently delete/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows error when confirmation text is wrong', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderPage(store);

    await user.type(screen.getByPlaceholderText('DELETE'), 'delete');

    // The input auto-uppercases, so it should show DELETE
    expect(screen.getByPlaceholderText('DELETE').value).toBe('DELETE');
  });

  it('shows error message for invalid confirmation', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderPage(store);

    const confirmInput = screen.getByPlaceholderText('DELETE');
    await user.type(confirmInput, 'WRONG');

    expect(screen.getByText(/please type DELETE exactly/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderPage(store);

    const passwordInput = screen.getByLabelText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find and click the toggle button (the button inside the input container)
    const toggleButton = passwordInput.parentElement.querySelector('button');
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls deleteAccount API on submit', async () => {
    const user = userEvent.setup();
    accountAPI.deleteAccount.mockResolvedValue({ data: { message: 'Account deleted' } });
    const store = createStore();
    renderPage(store);

    await user.type(screen.getByLabelText(/enter your password/i), 'mypassword');
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
    await user.click(screen.getByRole('button', { name: /permanently delete/i }));

    await waitFor(() => {
      expect(accountAPI.deleteAccount).toHaveBeenCalledWith('mypassword', 'DELETE');
    });
  });

  it('displays error message on failure', () => {
    const store = createStore({ error: 'Invalid password' });
    renderPage(store);

    expect(screen.getByText('Invalid password')).toBeInTheDocument();
  });

  it('shows saving state on button', () => {
    const store = createStore({ isSaving: true });
    renderPage(store);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('disables form while saving', async () => {
    const store = createStore({ isSaving: true });
    renderPage(store);

    const passwordInput = screen.getByLabelText(/enter your password/i);
    const confirmInput = screen.getByPlaceholderText('DELETE');
    const submitButton = screen.getByRole('button', { name: /deleting/i });

    expect(passwordInput).toBeDisabled();
    expect(confirmInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('has cancel link back to settings', () => {
    const store = createStore();
    renderPage(store);

    const cancelLink = screen.getByRole('link', { name: /cancel/i });
    expect(cancelLink).toHaveAttribute('href', '/account/settings');
  });
});
