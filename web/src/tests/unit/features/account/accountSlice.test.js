import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import accountReducer, {
  clearError,
  clearSuccessMessage,
  selectProfile,
  selectAccountLoading,
  selectAccountSaving,
  selectAccountError,
  selectSuccessMessage,
  fetchProfile,
  updatePreferences,
  deleteAccount,
} from '../../../../features/account/accountSlice';

// Mock the API module
vi.mock('../../../../services/api', () => ({
  accountAPI: {
    getProfile: vi.fn(),
    updatePreferences: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

import { accountAPI } from '../../../../services/api';

describe('accountSlice', () => {
  let store;

  const initialState = {
    profile: null,
    isLoading: false,
    isSaving: false,
    error: null,
    successMessage: null,
  };

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
    verified_at: '2024-01-15T11:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: {
        account: accountReducer,
      },
      preloadedState: {
        account: initialState,
      },
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should clear the error state', () => {
        store = configureStore({
          reducer: { account: accountReducer },
          preloadedState: {
            account: { ...initialState, error: 'Some error' },
          },
        });

        store.dispatch(clearError());
        expect(store.getState().account.error).toBeNull();
      });
    });

    describe('clearSuccessMessage', () => {
      it('should clear the success message state', () => {
        store = configureStore({
          reducer: { account: accountReducer },
          preloadedState: {
            account: { ...initialState, successMessage: 'Success!' },
          },
        });

        store.dispatch(clearSuccessMessage());
        expect(store.getState().account.successMessage).toBeNull();
      });
    });
  });

  describe('selectors', () => {
    const testState = {
      account: {
        profile: mockProfile,
        isLoading: true,
        isSaving: false,
        error: 'Test error',
        successMessage: 'Test success',
      },
    };

    it('selectProfile should return the profile', () => {
      expect(selectProfile(testState)).toEqual(mockProfile);
    });

    it('selectAccountLoading should return isLoading', () => {
      expect(selectAccountLoading(testState)).toBe(true);
    });

    it('selectAccountSaving should return isSaving', () => {
      expect(selectAccountSaving(testState)).toBe(false);
    });

    it('selectAccountError should return error', () => {
      expect(selectAccountError(testState)).toBe('Test error');
    });

    it('selectSuccessMessage should return successMessage', () => {
      expect(selectSuccessMessage(testState)).toBe('Test success');
    });
  });

  describe('async thunks', () => {
    describe('fetchProfile', () => {
      it('should handle successful profile fetch', async () => {
        const mockResponse = {
          data: {
            user: mockProfile,
          },
        };

        accountAPI.getProfile.mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchProfile());

        const state = store.getState().account;
        expect(state.profile).toEqual(mockProfile);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle profile fetch with direct payload', async () => {
        const mockResponse = {
          data: mockProfile,
        };

        accountAPI.getProfile.mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchProfile());

        const state = store.getState().account;
        expect(state.profile).toEqual(mockProfile);
      });

      it('should handle profile fetch failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Unauthorized',
            },
          },
        };

        accountAPI.getProfile.mockRejectedValueOnce(mockError);

        await store.dispatch(fetchProfile());

        const state = store.getState().account;
        expect(state.profile).toBeNull();
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Unauthorized');
      });

      it('should handle profile fetch failure with message', async () => {
        const mockError = {
          response: {
            data: {
              message: 'Session expired',
            },
          },
        };

        accountAPI.getProfile.mockRejectedValueOnce(mockError);

        await store.dispatch(fetchProfile());

        const state = store.getState().account;
        expect(state.error).toBe('Session expired');
      });

      it('should use default error message when no message provided', async () => {
        accountAPI.getProfile.mockRejectedValueOnce(new Error('Network error'));

        await store.dispatch(fetchProfile());

        const state = store.getState().account;
        expect(state.error).toBe('Failed to fetch profile');
      });

      it('should set loading state during fetch', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        accountAPI.getProfile.mockReturnValueOnce(pendingPromise);

        const fetchPromise = store.dispatch(fetchProfile());

        expect(store.getState().account.isLoading).toBe(true);

        resolvePromise({ data: { user: mockProfile } });
        await fetchPromise;

        expect(store.getState().account.isLoading).toBe(false);
      });
    });

    describe('updatePreferences', () => {
      it('should handle successful preferences update', async () => {
        const updatedProfile = { ...mockProfile, timezone: 'UTC' };
        const mockResponse = {
          data: {
            user: updatedProfile,
          },
        };

        accountAPI.updatePreferences.mockResolvedValueOnce(mockResponse);

        await store.dispatch(updatePreferences({ timezone: 'UTC' }));

        const state = store.getState().account;
        expect(state.profile).toEqual(updatedProfile);
        expect(state.isSaving).toBe(false);
        expect(state.successMessage).toBe('Preferences updated successfully');
        expect(state.error).toBeNull();
      });

      it('should handle preferences update failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Invalid timezone',
            },
          },
        };

        accountAPI.updatePreferences.mockRejectedValueOnce(mockError);

        await store.dispatch(updatePreferences({ timezone: 'Invalid' }));

        const state = store.getState().account;
        expect(state.isSaving).toBe(false);
        expect(state.error).toBe('Invalid timezone');
        expect(state.successMessage).toBeNull();
      });

      it('should set saving state during update', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        accountAPI.updatePreferences.mockReturnValueOnce(pendingPromise);

        const updatePromise = store.dispatch(updatePreferences({ timezone: 'UTC' }));

        expect(store.getState().account.isSaving).toBe(true);

        resolvePromise({ data: { user: mockProfile } });
        await updatePromise;

        expect(store.getState().account.isSaving).toBe(false);
      });

      it('should clear error and success message when starting update', async () => {
        store = configureStore({
          reducer: { account: accountReducer },
          preloadedState: {
            account: {
              ...initialState,
              error: 'Previous error',
              successMessage: 'Previous success',
            },
          },
        });

        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        accountAPI.updatePreferences.mockReturnValueOnce(pendingPromise);

        const updatePromise = store.dispatch(updatePreferences({ timezone: 'UTC' }));

        const pendingState = store.getState().account;
        expect(pendingState.error).toBeNull();
        expect(pendingState.successMessage).toBeNull();

        resolvePromise({ data: { user: mockProfile } });
        await updatePromise;
      });
    });

    describe('deleteAccount', () => {
      it('should handle successful account deletion', async () => {
        store = configureStore({
          reducer: { account: accountReducer },
          preloadedState: {
            account: { ...initialState, profile: mockProfile },
          },
        });

        const mockResponse = {
          data: { message: 'Account deleted successfully' },
        };

        accountAPI.deleteAccount.mockResolvedValueOnce(mockResponse);

        await store.dispatch(deleteAccount({ password: 'password123', confirmText: 'DELETE' }));

        const state = store.getState().account;
        expect(state.profile).toBeNull();
        expect(state.isSaving).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle account deletion failure', async () => {
        const mockError = {
          response: {
            data: {
              error: 'Invalid password',
            },
          },
        };

        accountAPI.deleteAccount.mockRejectedValueOnce(mockError);

        await store.dispatch(deleteAccount({ password: 'wrongpassword', confirmText: 'DELETE' }));

        const state = store.getState().account;
        expect(state.isSaving).toBe(false);
        expect(state.error).toBe('Invalid password');
      });

      it('should set saving state during deletion', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        accountAPI.deleteAccount.mockReturnValueOnce(pendingPromise);

        const deletePromise = store.dispatch(deleteAccount({ password: 'password123', confirmText: 'DELETE' }));

        expect(store.getState().account.isSaving).toBe(true);

        resolvePromise({ data: { message: 'Account deleted' } });
        await deletePromise;

        expect(store.getState().account.isSaving).toBe(false);
      });

      it('should call API with correct parameters', async () => {
        accountAPI.deleteAccount.mockResolvedValueOnce({ data: {} });

        await store.dispatch(deleteAccount({ password: 'mypassword', confirmText: 'DELETE' }));

        expect(accountAPI.deleteAccount).toHaveBeenCalledWith('mypassword', 'DELETE');
      });
    });
  });
});
