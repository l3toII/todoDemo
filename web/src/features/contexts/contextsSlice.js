import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contextsAPI } from '../../services/api';

// Context status constants
export const CONTEXT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

// Async thunks
export const fetchContexts = createAsyncThunk(
  'contexts/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await contextsAPI.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch contexts' });
    }
  }
);

export const createContext = createAsyncThunk(
  'contexts/create',
  async (contextData, { rejectWithValue }) => {
    try {
      const response = await contextsAPI.create(contextData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to create context' });
    }
  }
);

export const updateContext = createAsyncThunk(
  'contexts/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await contextsAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to update context' });
    }
  }
);

export const deleteContext = createAsyncThunk(
  'contexts/delete',
  async (id, { rejectWithValue }) => {
    try {
      await contextsAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to delete context' });
    }
  }
);

const initialState = {
  contexts: [],
  loading: false,
  error: null,
};

const contextsSlice = createSlice({
  name: 'contexts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contexts
      .addCase(fetchContexts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContexts.fulfilled, (state, action) => {
        state.loading = false;
        state.contexts = action.payload.contexts || [];
        state.error = null;
      })
      .addCase(fetchContexts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch contexts';
      })

      // Create context
      .addCase(createContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContext.fulfilled, (state, action) => {
        state.loading = false;
        const newContext = action.payload.context;
        if (newContext) {
          state.contexts.push(newContext);
        }
        state.error = null;
      })
      .addCase(createContext.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to create context';
      })

      // Update context
      .addCase(updateContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContext.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContext = action.payload.context;
        if (updatedContext) {
          const index = state.contexts.findIndex((c) => c.id === updatedContext.id);
          if (index !== -1) {
            state.contexts[index] = updatedContext;
          }
        }
        state.error = null;
      })
      .addCase(updateContext.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to update context';
      })

      // Delete context
      .addCase(deleteContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContext.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.contexts = state.contexts.filter((c) => c.id !== deletedId);
        state.error = null;
      })
      .addCase(deleteContext.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to delete context';
      });
  },
});

export const { clearError } = contextsSlice.actions;

// Selectors
export const selectAllContexts = (state) =>
  state.contexts.contexts.filter((c) => c.status === CONTEXT_STATUS.ACTIVE);

export const selectDefaultContexts = (state) =>
  state.contexts.contexts.filter(
    (c) => c.is_default === true && c.status === CONTEXT_STATUS.ACTIVE
  );

export const selectCustomContexts = (state) =>
  state.contexts.contexts.filter(
    (c) => c.is_default === false && c.status === CONTEXT_STATUS.ACTIVE
  );

export const selectContextsLoading = (state) => state.contexts.loading;

export const selectContextsError = (state) => state.contexts.error;

export const selectContextById = (state, id) =>
  state.contexts.contexts.find((c) => c.id === id);

export default contextsSlice.reducer;
