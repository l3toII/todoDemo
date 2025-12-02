import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import inboxReducer, {
  clearError,
  optimisticAddTask,
  rollbackOptimisticAdd,
  optimisticDeleteTask,
  rollbackOptimisticDelete,
  clearPendingTask,
  selectInbox,
  selectInboxTasks,
  selectInboxCount,
  selectInboxLoading,
  selectInboxError,
  selectHasOverflow,
  fetchInbox,
  fetchInboxCount,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from '../../../../features/inbox/inboxSlice';

// Mock the API module
vi.mock('../../../../services/api', () => ({
  tasksAPI: {
    getInbox: vi.fn(),
    getInboxCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
  },
}));

import { tasksAPI } from '../../../../services/api';

describe('inboxSlice', () => {
  let store;

  const initialState = {
    tasks: [],
    count: 0,
    hasOverflow: false,
    isLoading: false,
    error: null,
    pendingTasks: {},
  };

  const mockTask = {
    id: 'task-uuid-123',
    title: 'Test Task',
    notes: null,
    status: 'inbox',
    position: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: {
        inbox: inboxReducer,
      },
      preloadedState: {
        inbox: initialState,
      },
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should clear the error state', () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, error: 'Some error' },
          },
        });

        store.dispatch(clearError());
        expect(store.getState().inbox.error).toBeNull();
      });
    });

    describe('optimisticAddTask', () => {
      it('should add an optimistic task to the list', () => {
        store.dispatch(optimisticAddTask({ title: 'New Task', notes: 'Some notes' }));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(1);
        expect(state.tasks[0].title).toBe('New Task');
        expect(state.tasks[0].notes).toBe('Some notes');
        expect(state.tasks[0].isOptimistic).toBe(true);
        expect(state.count).toBe(1);
      });

      it('should generate a tempId for optimistic task', () => {
        const action = store.dispatch(optimisticAddTask({ title: 'Test' }));

        expect(action.payload.tempId).toBeDefined();
        expect(typeof action.payload.tempId).toBe('string');
      });

      it('should add optimistic task to pendingTasks', () => {
        store.dispatch(optimisticAddTask({ title: 'Pending Task' }));

        const state = store.getState().inbox;
        const tempId = state.tasks[0].id;
        expect(state.pendingTasks[tempId]).toBeDefined();
      });
    });

    describe('rollbackOptimisticAdd', () => {
      it('should remove the optimistic task from list', () => {
        store.dispatch(optimisticAddTask({ title: 'Task to rollback' }));
        const tempId = store.getState().inbox.tasks[0].id;

        store.dispatch(rollbackOptimisticAdd({ tempId }));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(0);
        expect(state.count).toBe(0);
        expect(state.pendingTasks[tempId]).toBeUndefined();
      });
    });

    describe('optimisticDeleteTask', () => {
      it('should remove task from list and store in pendingTasks', () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        store.dispatch(optimisticDeleteTask({ id: mockTask.id }));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(0);
        expect(state.count).toBe(0);
        expect(state.pendingTasks[mockTask.id]).toBeDefined();
        expect(state.pendingTasks[mockTask.id].action).toBe('delete');
      });
    });

    describe('rollbackOptimisticDelete', () => {
      it('should restore deleted task to list', () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: {
              ...initialState,
              pendingTasks: { [mockTask.id]: { ...mockTask, action: 'delete' } },
            },
          },
        });

        store.dispatch(rollbackOptimisticDelete({ id: mockTask.id }));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(1);
        expect(state.tasks[0].title).toBe(mockTask.title);
        expect(state.count).toBe(1);
        expect(state.pendingTasks[mockTask.id]).toBeUndefined();
      });
    });

    describe('clearPendingTask', () => {
      it('should remove task from pendingTasks', () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: {
              ...initialState,
              pendingTasks: { [mockTask.id]: mockTask },
            },
          },
        });

        store.dispatch(clearPendingTask({ id: mockTask.id }));

        expect(store.getState().inbox.pendingTasks[mockTask.id]).toBeUndefined();
      });
    });
  });

  describe('selectors', () => {
    const testState = {
      inbox: {
        tasks: [mockTask],
        count: 5,
        hasOverflow: true,
        isLoading: true,
        error: 'Test error',
        pendingTasks: {},
      },
    };

    it('selectInbox should return the entire inbox state', () => {
      expect(selectInbox(testState)).toEqual(testState.inbox);
    });

    it('selectInboxTasks should return tasks array', () => {
      expect(selectInboxTasks(testState)).toEqual([mockTask]);
    });

    it('selectInboxCount should return count', () => {
      expect(selectInboxCount(testState)).toBe(5);
    });

    it('selectInboxLoading should return isLoading', () => {
      expect(selectInboxLoading(testState)).toBe(true);
    });

    it('selectInboxError should return error', () => {
      expect(selectInboxError(testState)).toBe('Test error');
    });

    it('selectHasOverflow should return hasOverflow', () => {
      expect(selectHasOverflow(testState)).toBe(true);
    });
  });

  describe('async thunks', () => {
    describe('fetchInbox', () => {
      it('should handle successful fetch', async () => {
        const mockResponse = {
          data: {
            tasks: [mockTask],
            count: 1,
            has_overflow: false,
          },
        };

        tasksAPI.getInbox.mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchInbox());

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(1);
        expect(state.count).toBe(1);
        expect(state.hasOverflow).toBe(false);
        expect(state.isLoading).toBe(false);
      });

      it('should handle fetch failure', async () => {
        const mockError = {
          response: {
            data: { error: 'Network error' },
          },
        };

        tasksAPI.getInbox.mockRejectedValueOnce(mockError);

        await store.dispatch(fetchInbox());

        const state = store.getState().inbox;
        expect(state.error).toBe('Network error');
        expect(state.isLoading).toBe(false);
      });

      it('should set loading state during fetch', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.getInbox.mockReturnValueOnce(pendingPromise);

        const fetchPromise = store.dispatch(fetchInbox());
        expect(store.getState().inbox.isLoading).toBe(true);

        resolvePromise({ data: { tasks: [], count: 0, has_overflow: false } });
        await fetchPromise;

        expect(store.getState().inbox.isLoading).toBe(false);
      });
    });

    describe('fetchInboxCount', () => {
      it('should update count and hasOverflow', async () => {
        tasksAPI.getInboxCount.mockResolvedValueOnce({
          data: { count: 150, has_overflow: true },
        });

        await store.dispatch(fetchInboxCount());

        const state = store.getState().inbox;
        expect(state.count).toBe(150);
        expect(state.hasOverflow).toBe(true);
      });
    });

    describe('createTask', () => {
      it('should replace optimistic task with real task on success', async () => {
        const tempId = 'temp-123';
        const realTask = { ...mockTask, id: 'real-uuid-456' };

        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: {
              ...initialState,
              tasks: [{ id: tempId, title: 'Test', isOptimistic: true }],
              count: 1,
              pendingTasks: { [tempId]: {} },
            },
          },
        });

        tasksAPI.create.mockResolvedValueOnce({
          data: { task: realTask },
        });

        await store.dispatch(createTask({ title: 'Test', tempId }));

        const state = store.getState().inbox;
        expect(state.tasks[0].id).toBe('real-uuid-456');
        expect(state.tasks[0].isOptimistic).toBeUndefined();
        expect(state.pendingTasks[tempId]).toBeUndefined();
      });

      it('should rollback on failure', async () => {
        const tempId = 'temp-456';

        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: {
              ...initialState,
              tasks: [{ id: tempId, title: 'Test', isOptimistic: true }],
              count: 1,
              pendingTasks: { [tempId]: {} },
            },
          },
        });

        tasksAPI.create.mockRejectedValueOnce({
          response: { data: { error: 'Server error' } },
        });

        await store.dispatch(createTask({ title: 'Test', tempId }));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(0);
        expect(state.count).toBe(0);
        expect(state.error).toBe('Server error');
      });
    });

    describe('updateTask', () => {
      it('should update task in list on success', async () => {
        const updatedTask = { ...mockTask, title: 'Updated Title' };

        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        tasksAPI.update.mockResolvedValueOnce({
          data: { task: updatedTask },
        });

        await store.dispatch(updateTask({ id: mockTask.id, updates: { title: 'Updated Title' } }));

        const state = store.getState().inbox;
        expect(state.tasks[0].title).toBe('Updated Title');
      });

      it('should set error on failure', async () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        tasksAPI.update.mockRejectedValueOnce({
          response: { data: { error: 'Update failed' } },
        });

        await store.dispatch(updateTask({ id: mockTask.id, updates: { title: 'New' } }));

        expect(store.getState().inbox.error).toBe('Update failed');
      });
    });

    describe('deleteTask', () => {
      it('should remove task from list on success', async () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        tasksAPI.delete.mockResolvedValueOnce({});

        await store.dispatch(deleteTask(mockTask.id));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(0);
        expect(state.count).toBe(0);
      });
    });

    describe('completeTask', () => {
      it('should remove completed task from inbox', async () => {
        const completedTask = { ...mockTask, status: 'completed' };

        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        tasksAPI.complete.mockResolvedValueOnce({
          data: { task: completedTask },
        });

        await store.dispatch(completeTask(mockTask.id));

        const state = store.getState().inbox;
        expect(state.tasks).toHaveLength(0);
        expect(state.count).toBe(0);
      });

      it('should set error on failure', async () => {
        store = configureStore({
          reducer: { inbox: inboxReducer },
          preloadedState: {
            inbox: { ...initialState, tasks: [mockTask], count: 1 },
          },
        });

        tasksAPI.complete.mockRejectedValueOnce({
          response: { data: { error: 'Complete failed' } },
        });

        await store.dispatch(completeTask(mockTask.id));

        expect(store.getState().inbox.error).toBe('Complete failed');
      });
    });
  });
});
