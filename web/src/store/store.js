import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import accountReducer from '../features/account/accountSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['auth/setTokens'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.tokenExpiry'],
      },
    }),
});

export default store;
