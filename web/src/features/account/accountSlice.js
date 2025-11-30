import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountAPI } from '../../services/api';

// Initial state
const initialState = {
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  'account/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountAPI.getProfile();
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Failed to fetch profile',
        code: errorData.code
      });
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'account/updatePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await accountAPI.updatePreferences(preferences);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Failed to update preferences',
        code: errorData.code
      });
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'account/deleteAccount',
  async ({ password, confirmText }, { rejectWithValue }) => {
    try {
      const response = await accountAPI.deleteAccount(password, confirmText);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Failed to delete account',
        code: errorData.code
      });
    }
  }
);

// Account slice
const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload.user || action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch profile';
      });

    // Update Preferences
    builder
      .addCase(updatePreferences.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.isSaving = false;
        state.profile = action.payload.user || action.payload;
        state.successMessage = 'Preferences updated successfully';
        state.error = null;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload?.message || 'Failed to update preferences';
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.isSaving = false;
        state.profile = null;
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload?.message || 'Failed to delete account';
      });
  },
});

export const { clearError, clearSuccessMessage } = accountSlice.actions;

// Selectors
export const selectProfile = (state) => state.account.profile;
export const selectAccountLoading = (state) => state.account.isLoading;
export const selectAccountSaving = (state) => state.account.isSaving;
export const selectAccountError = (state) => state.account.error;
export const selectSuccessMessage = (state) => state.account.successMessage;

export default accountSlice.reducer;
