import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tasksAPI } from '../../services/api';

// Task statuses from GTD workflow
export const TASK_STATUS = {
  INBOX: 'inbox',
  CLARIFIED: 'clarified',
  NEXT_ACTION: 'next_action',
  WAITING_FOR: 'waiting_for',
  SOMEDAY_MAYBE: 'someday_maybe',
  REFERENCE: 'reference',
  COMPLETED: 'completed',
  DELETED: 'deleted',
};

// Energy levels
export const ENERGY_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// Async thunks
export const fetchInboxTasks = createAsyncThunk(
  'tasks/fetchInbox',
  async (_, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.getByStatus(TASK_STATUS.INBOX);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch inbox tasks' });
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchById',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.getById(taskId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch task' });
    }
  }
);

export const clarifyTask = createAsyncThunk(
  'tasks/clarify',
  async ({ taskId, clarificationData }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.clarify(taskId, clarificationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to clarify task' });
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ taskId, status, additionalData = {} }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.update(taskId, { status, ...additionalData });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to update task status' });
    }
  }
);

export const completeTask = createAsyncThunk(
  'tasks/complete',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.complete(taskId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to complete task' });
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (taskId, { rejectWithValue }) => {
    try {
      await tasksAPI.delete(taskId);
      return taskId;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to delete task' });
    }
  }
);

export const convertToProject = createAsyncThunk(
  'tasks/convertToProject',
  async ({ taskId, projectData }, { rejectWithValue }) => {
    try {
      const response = await tasksAPI.convertToProject(taskId, projectData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to convert to project' });
    }
  }
);

const initialState = {
  // Tasks by status for quick access
  inbox: [],
  clarified: [],
  nextActions: [],
  waitingFor: [],
  somedayMaybe: [],
  reference: [],

  // Current task being clarified
  currentTask: null,

  // Loading states
  loading: false,
  clarifying: false,

  // Error state
  error: null,

  // Pagination
  nextCursor: null,
  total: 0,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    },
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    // Optimistic update for task status change
    optimisticStatusUpdate: (state, action) => {
      const { taskId, newStatus } = action.payload;
      // Remove from current list
      const lists = ['inbox', 'clarified', 'nextActions', 'waitingFor', 'somedayMaybe', 'reference'];
      lists.forEach((list) => {
        const index = state[list].findIndex((t) => t.id === taskId);
        if (index !== -1) {
          const [task] = state[list].splice(index, 1);
          // Add to new list based on status
          const targetList = getListByStatus(newStatus);
          if (targetList && state[targetList]) {
            state[targetList].push({ ...task, status: newStatus });
          }
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inbox tasks
      .addCase(fetchInboxTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInboxTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.inbox = action.payload.tasks || [];
        state.nextCursor = action.payload.next_cursor;
        state.total = action.payload.count || state.inbox.length;
      })
      .addCase(fetchInboxTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch inbox tasks';
      })

      // Fetch task by ID
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch task';
      })

      // Clarify task
      .addCase(clarifyTask.pending, (state) => {
        state.clarifying = true;
        state.error = null;
      })
      .addCase(clarifyTask.fulfilled, (state, action) => {
        state.clarifying = false;
        // API returns { message: '...', task: {...} }
        const updatedTask = action.payload.task || action.payload;
        // Remove from inbox
        state.inbox = state.inbox.filter((t) => t.id !== updatedTask.id);
        // Add to appropriate list based on new status
        addTaskToList(state, updatedTask);
        // Update current task if it's the same
        if (state.currentTask?.id === updatedTask.id) {
          state.currentTask = updatedTask;
        }
      })
      .addCase(clarifyTask.rejected, (state, action) => {
        state.clarifying = false;
        state.error = action.payload?.message || 'Failed to clarify task';
      })

      // Update task status
      .addCase(updateTaskStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTask = action.payload;
        // Remove from all lists
        removeTaskFromAllLists(state, updatedTask.id);
        // Add to appropriate list
        addTaskToList(state, updatedTask);
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update task status';
      })

      // Complete task
      .addCase(completeTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        state.loading = false;
        // API returns { message: '...', task: {...} } or just the task
        const completedTask = action.payload.task || action.payload;
        removeTaskFromAllLists(state, completedTask.id);
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to complete task';
      })

      // Delete task
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        const taskId = action.payload;
        removeTaskFromAllLists(state, taskId);
        if (state.currentTask?.id === taskId) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to delete task';
      })

      // Convert to project
      .addCase(convertToProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertToProject.fulfilled, (state, action) => {
        state.loading = false;
        // Task is now converted, remove from inbox
        const taskId = action.payload.original_task_id;
        if (taskId) {
          removeTaskFromAllLists(state, taskId);
        }
      })
      .addCase(convertToProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to convert to project';
      });
  },
});

// Helper functions
function getListByStatus(status) {
  const statusToList = {
    [TASK_STATUS.INBOX]: 'inbox',
    [TASK_STATUS.CLARIFIED]: 'clarified',
    [TASK_STATUS.NEXT_ACTION]: 'nextActions',
    [TASK_STATUS.WAITING_FOR]: 'waitingFor',
    [TASK_STATUS.SOMEDAY_MAYBE]: 'somedayMaybe',
    [TASK_STATUS.REFERENCE]: 'reference',
  };
  return statusToList[status];
}

function addTaskToList(state, task) {
  const listName = getListByStatus(task.status);
  if (listName && state[listName]) {
    // Check if task already exists
    const existingIndex = state[listName].findIndex((t) => t.id === task.id);
    if (existingIndex === -1) {
      state[listName].push(task);
    } else {
      state[listName][existingIndex] = task;
    }
  }
}

function removeTaskFromAllLists(state, taskId) {
  const lists = ['inbox', 'clarified', 'nextActions', 'waitingFor', 'somedayMaybe', 'reference'];
  lists.forEach((list) => {
    state[list] = state[list].filter((t) => t.id !== taskId);
  });
}

export const { clearError, setCurrentTask, clearCurrentTask, optimisticStatusUpdate } = tasksSlice.actions;

// Selectors
// Filter to only return tasks with inbox status as a safety measure
export const selectInboxTasks = (state) =>
  state.tasks.inbox.filter((task) => task.status === TASK_STATUS.INBOX);
export const selectCurrentTask = (state) => state.tasks.currentTask;
export const selectTasksLoading = (state) => state.tasks.loading;
export const selectTasksClarifying = (state) => state.tasks.clarifying;
export const selectTasksError = (state) => state.tasks.error;
export const selectInboxCount = (state) =>
  state.tasks.inbox.filter((task) => task.status === TASK_STATUS.INBOX).length;
export const selectNextActions = (state) => state.tasks.nextActions;
export const selectWaitingFor = (state) => state.tasks.waitingFor;
export const selectSomedayMaybe = (state) => state.tasks.somedayMaybe;
export const selectReference = (state) => state.tasks.reference;

export default tasksSlice.reducer;
