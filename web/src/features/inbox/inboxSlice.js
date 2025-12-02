import { createSlice, createAsyncThunk, nanoid } from '@reduxjs/toolkit';
import { tasksAPI } from '../../services/api';

const initialState = {
  tasks: [],
  count: 0,
  hasOverflow: false,
  isLoading: false,
  error: null,
  pendingTasks: {}, // For optimistic updates rollback
};

// Async thunks
export const fetchInbox = createAsyncThunk(
  'inbox/fetchInbox',
  async (_, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.getInbox();
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to fetch inbox',
        code: errorData.code,
      });
    }
  }
);

export const fetchInboxCount = createAsyncThunk(
  'inbox/fetchInboxCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.getInboxCount();
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to fetch inbox count',
        code: errorData.code,
      });
    }
  }
);

export const createTask = createAsyncThunk(
  'inbox/createTask',
  async ({ title, notes, tempId }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.create({ title, notes });
      return { task: response.data.task, tempId };
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to create task',
        code: errorData.code,
        tempId,
      });
    }
  }
);

export const updateTask = createAsyncThunk(
  'inbox/updateTask',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.update(id, updates);
      return response.data.task;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to update task',
        code: errorData.code,
        id,
      });
    }
  }
);

export const deleteTask = createAsyncThunk(
  'inbox/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      await tasksAPI.delete(id);
      return { id };
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to delete task',
        code: errorData.code,
        id,
      });
    }
  }
);

export const completeTask = createAsyncThunk(
  'inbox/completeTask',
  async (id, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.complete(id);
      return response.data.task;
    } catch (error) {
      const errorData = error.response?.data || {};
      return rejectWithValue({
        message: errorData.error || 'Failed to complete task',
        code: errorData.code,
        id,
      });
    }
  }
);

// Slice
const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Optimistic add for instant UI feedback
    optimisticAddTask: {
      reducer: (state, action) => {
        const { tempId, title, notes } = action.payload;
        const optimisticTask = {
          id: tempId,
          title,
          notes: notes || null,
          status: 'inbox',
          position: state.tasks.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isOptimistic: true,
        };
        state.tasks.unshift(optimisticTask);
        state.count += 1;
        state.pendingTasks[tempId] = optimisticTask;
      },
      prepare: ({ title, notes }) => ({
        payload: { tempId: nanoid(), title, notes },
      }),
    },
    // Rollback optimistic add on failure
    rollbackOptimisticAdd: (state, action) => {
      const { tempId } = action.payload;
      state.tasks = state.tasks.filter((t) => t.id !== tempId);
      state.count = Math.max(0, state.count - 1);
      delete state.pendingTasks[tempId];
    },
    // Optimistic delete
    optimisticDeleteTask: (state, action) => {
      const { id } = action.payload;
      const task = state.tasks.find((t) => t.id === id);
      if (task) {
        state.pendingTasks[id] = { ...task, action: 'delete' };
        state.tasks = state.tasks.filter((t) => t.id !== id);
        state.count = Math.max(0, state.count - 1);
      }
    },
    // Rollback optimistic delete on failure
    rollbackOptimisticDelete: (state, action) => {
      const { id } = action.payload;
      const pendingTask = state.pendingTasks[id];
      if (pendingTask) {
        const { action: _, ...taskData } = pendingTask;
        state.tasks.push(taskData);
        state.count += 1;
        delete state.pendingTasks[id];
      }
    },
    clearPendingTask: (state, action) => {
      const { id } = action.payload;
      delete state.pendingTasks[id];
    },
  },
  extraReducers: (builder) => {
    // Fetch inbox
    builder
      .addCase(fetchInbox.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload.tasks;
        state.count = action.payload.count;
        state.hasOverflow = action.payload.has_overflow;
      })
      .addCase(fetchInbox.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch inbox';
      });

    // Fetch inbox count
    builder
      .addCase(fetchInboxCount.fulfilled, (state, action) => {
        state.count = action.payload.count;
        state.hasOverflow = action.payload.has_overflow;
      });

    // Create task
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        const { task, tempId } = action.payload;
        // Replace optimistic task with real task
        const index = state.tasks.findIndex((t) => t.id === tempId);
        if (index !== -1) {
          state.tasks[index] = task;
        } else {
          state.tasks.unshift(task);
        }
        delete state.pendingTasks[tempId];
      })
      .addCase(createTask.rejected, (state, action) => {
        const { tempId } = action.payload || {};
        if (tempId) {
          state.tasks = state.tasks.filter((t) => t.id !== tempId);
          state.count = Math.max(0, state.count - 1);
          delete state.pendingTasks[tempId];
        }
        state.error = action.payload?.message || 'Failed to create task';
      });

    // Update task
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        const index = state.tasks.findIndex((t) => t.id === updatedTask.id);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload?.message || 'Failed to update task';
      });

    // Delete task
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.tasks = state.tasks.filter((t) => t.id !== id);
        state.count = Math.max(0, state.count - 1);
        delete state.pendingTasks[id];
      })
      .addCase(deleteTask.rejected, (state, action) => {
        // Rollback handled by component via rollbackOptimisticDelete
        state.error = action.payload?.message || 'Failed to delete task';
      });

    // Complete task
    builder
      .addCase(completeTask.fulfilled, (state, action) => {
        const completedTask = action.payload;
        // Remove from inbox (completed tasks aren't in inbox)
        state.tasks = state.tasks.filter((t) => t.id !== completedTask.id);
        state.count = Math.max(0, state.count - 1);
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.error = action.payload?.message || 'Failed to complete task';
      });
  },
});

export const {
  clearError,
  optimisticAddTask,
  rollbackOptimisticAdd,
  optimisticDeleteTask,
  rollbackOptimisticDelete,
  clearPendingTask,
} = inboxSlice.actions;

// Selectors
export const selectInbox = (state) => state.inbox;
export const selectInboxTasks = (state) => state.inbox.tasks;
export const selectInboxCount = (state) => state.inbox.count;
export const selectInboxLoading = (state) => state.inbox.isLoading;
export const selectInboxError = (state) => state.inbox.error;
export const selectHasOverflow = (state) => state.inbox.hasOverflow;

export default inboxSlice.reducer;
