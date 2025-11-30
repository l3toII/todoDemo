import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

// Initial state
const initialState = {
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  sessionTimeout: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Login failed',
        code: errorData.code,
        status: errorData.status
      });
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Registration failed',
        code: errorData.code
      });
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      return null;
    } catch (error) {
      // Even if logout fails on server, we still clear local state
      return null;
    }
  }
);

export const appleSignIn = createAsyncThunk(
  'auth/appleSignIn',
  async ({ identityToken, authorizationCode }, { rejectWithValue }) => {
    try {
      const response = await authAPI.appleSignIn(identityToken, authorizationCode);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Apple Sign-In failed',
        code: errorData.code
      });
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyEmail(token);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Email verification failed',
        code: errorData.code
      });
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authAPI.requestPasswordReset(email);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Password reset request failed',
        code: errorData.code
      });
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authAPI.resetPassword(token, newPassword);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || errorData.message || 'Password reset failed',
        code: errorData.code
      });
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setSessionTimeout: (state, action) => {
      state.sessionTimeout = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.error = null;
        localStorage.setItem('accessToken', action.payload.access_token);
        localStorage.setItem('refreshToken', action.payload.refresh_token);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Login failed';
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        // Don't auto-login after registration, user needs to verify email
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Registration failed';
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .addCase(logout.rejected, (state) => {
        // Clear auth even on logout failure
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      });

    // Apple Sign-In
    builder
      .addCase(appleSignIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(appleSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.error = null;
        localStorage.setItem('accessToken', action.payload.access_token);
        localStorage.setItem('refreshToken', action.payload.refresh_token);
      })
      .addCase(appleSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Apple Sign-In failed';
      });

    // Verify Email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Email verification failed';
      });

    // Request Password Reset
    builder
      .addCase(requestPasswordReset.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Password reset request failed';
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Password reset failed';
      });
  },
});

export const { clearError, setTokens, clearAuth, setSessionTimeout } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
