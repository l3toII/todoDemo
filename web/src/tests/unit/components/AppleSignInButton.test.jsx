import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../features/auth/authSlice';
import AppleSignInButton from '../../../components/AppleSignInButton';

describe('AppleSignInButton', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });

    // Clean up AppleID mock
    delete window.AppleID;

    // Clear any existing scripts
    document.head.querySelectorAll('script[src*="appleid"]').forEach(script => {
      script.remove();
    });
  });

  const renderButton = () => {
    return render(
      <Provider store={store}>
        <AppleSignInButton />
      </Provider>
    );
  };

  it('renders Apple Sign-In button with correct text', () => {
    renderButton();

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Continue with Apple')).toBeInTheDocument();
  });

  it('renders Apple icon', () => {
    renderButton();

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('is not disabled by default', () => {
    renderButton();

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('is disabled when loading', () => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: true,
          error: null,
          sessionTimeout: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <AppleSignInButton />
      </Provider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('loads Apple JS SDK when clicked and not already loaded', async () => {
    const user = userEvent.setup();
    renderButton();

    const mockAppleSignIn = vi.fn().mockResolvedValue({
      authorization: {
        id_token: 'test-id-token',
        code: 'test-auth-code',
      },
    });

    // Mock successful script load
    vi.spyOn(document.head, 'appendChild').mockImplementation((script) => {
      setTimeout(() => {
        window.AppleID = {
          auth: {
            init: vi.fn(),
            signIn: mockAppleSignIn,
          },
        };
        script.onload?.();
      }, 0);
      return script;
    });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(document.head.appendChild).toHaveBeenCalled();
    });
  });

  it('uses existing AppleID if already loaded', async () => {
    const user = userEvent.setup();

    const mockAppleSignIn = vi.fn().mockResolvedValue({
      authorization: {
        id_token: 'test-id-token',
        code: 'test-auth-code',
      },
    });

    window.AppleID = {
      auth: {
        init: vi.fn(),
        signIn: mockAppleSignIn,
      },
    };

    renderButton();

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(window.AppleID.auth.init).toHaveBeenCalled();
    });

    // When AppleID already exists, signIn should be called without loading a new script
    expect(mockAppleSignIn).toHaveBeenCalled();
  });

  it('initializes AppleID with correct config', async () => {
    const user = userEvent.setup();

    const mockInit = vi.fn();
    const mockAppleSignIn = vi.fn().mockResolvedValue({
      authorization: {
        id_token: 'test-id-token',
        code: 'test-auth-code',
      },
    });

    window.AppleID = {
      auth: {
        init: mockInit,
        signIn: mockAppleSignIn,
      },
    };

    renderButton();

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith({
        clientId: 'com.gtdapp.web',
        scope: 'name email',
        redirectURI: expect.stringContaining('/auth/apple/callback'),
        usePopup: true,
      });
    });
  });

  it('handles Apple Sign-In error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockAppleSignIn = vi.fn().mockRejectedValue(new Error('User cancelled'));

    window.AppleID = {
      auth: {
        init: vi.fn(),
        signIn: mockAppleSignIn,
      },
    };

    renderButton();

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Apple Sign-In failed:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('has proper styling classes', () => {
    renderButton();

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('inline-flex');
    expect(button).toHaveClass('justify-center');
    expect(button).toHaveClass('items-center');
  });
});
