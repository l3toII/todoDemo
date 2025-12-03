import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import accountReducer from '../features/account/accountSlice';
import inboxReducer from '../features/inbox/inboxSlice';
import tasksReducer from '../features/tasks/tasksSlice';
import contextsReducer from '../features/contexts/contextsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
    inbox: inboxReducer,
    tasks: tasksReducer,
    contexts: contextsReducer,
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
