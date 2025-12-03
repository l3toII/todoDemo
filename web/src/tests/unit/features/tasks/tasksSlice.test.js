import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer, {
  TASK_STATUS,
  ENERGY_LEVEL,
  clearError,
  setCurrentTask,
  clearCurrentTask,
  optimisticStatusUpdate,
  selectInboxTasks,
  selectCurrentTask,
  selectTasksLoading,
  selectTasksClarifying,
  selectTasksError,
  selectInboxCount,
  selectNextActions,
  selectWaitingFor,
  selectSomedayMaybe,
  selectReference,
  fetchInboxTasks,
  fetchTaskById,
  clarifyTask,
  updateTaskStatus,
  completeTask,
  deleteTask,
  convertToProject,
} from '../../../../features/tasks/tasksSlice';

// Mock the API module
vi.mock('../../../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    getById: vi.fn(),
    clarify: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    delete: vi.fn(),
    convertToProject: vi.fn(),
  },
}));

import { tasksAPI } from '../../../../services/api';

describe('tasksSlice', () => {
  let store;

  const initialState = {
    inbox: [],
    clarified: [],
    nextActions: [],
    waitingFor: [],
    somedayMaybe: [],
    reference: [],
    currentTask: null,
    loading: false,
    clarifying: false,
    error: null,
    nextCursor: null,
    total: 0,
  };

  const mockTask = {
    id: 'task-uuid-123',
    title: 'Test Task',
    notes: 'Some notes',
    status: 'inbox',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: {
        tasks: tasksReducer,
      },
      preloadedState: {
        tasks: initialState,
      },
    });
  });

  describe('constants', () => {
    it('should export TASK_STATUS constants', () => {
      expect(TASK_STATUS.INBOX).toBe('inbox');
      expect(TASK_STATUS.CLARIFIED).toBe('clarified');
      expect(TASK_STATUS.NEXT_ACTION).toBe('next_action');
      expect(TASK_STATUS.WAITING_FOR).toBe('waiting_for');
      expect(TASK_STATUS.SOMEDAY_MAYBE).toBe('someday_maybe');
      expect(TASK_STATUS.REFERENCE).toBe('reference');
      expect(TASK_STATUS.COMPLETED).toBe('completed');
      expect(TASK_STATUS.DELETED).toBe('deleted');
    });

    it('should export ENERGY_LEVEL constants', () => {
      expect(ENERGY_LEVEL.LOW).toBe('low');
      expect(ENERGY_LEVEL.MEDIUM).toBe('medium');
      expect(ENERGY_LEVEL.HIGH).toBe('high');
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should clear the error state', () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, error: 'Some error' },
          },
        });

        store.dispatch(clearError());
        expect(store.getState().tasks.error).toBeNull();
      });
    });

    describe('setCurrentTask', () => {
      it('should set the current task', () => {
        store.dispatch(setCurrentTask(mockTask));
        expect(store.getState().tasks.currentTask).toEqual(mockTask);
      });
    });

    describe('clearCurrentTask', () => {
      it('should clear the current task', () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, currentTask: mockTask },
          },
        });

        store.dispatch(clearCurrentTask());
        expect(store.getState().tasks.currentTask).toBeNull();
      });
    });

    describe('optimisticStatusUpdate', () => {
      it('should move task from inbox to nextActions', () => {
        const task = { ...mockTask, status: TASK_STATUS.INBOX };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [task] },
          },
        });

        store.dispatch(optimisticStatusUpdate({ taskId: task.id, newStatus: TASK_STATUS.NEXT_ACTION }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.nextActions).toHaveLength(1);
        expect(state.nextActions[0].status).toBe(TASK_STATUS.NEXT_ACTION);
      });

      it('should move task from nextActions to waitingFor', () => {
        const task = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, nextActions: [task] },
          },
        });

        store.dispatch(optimisticStatusUpdate({ taskId: task.id, newStatus: TASK_STATUS.WAITING_FOR }));

        const state = store.getState().tasks;
        expect(state.nextActions).toHaveLength(0);
        expect(state.waitingFor).toHaveLength(1);
      });

      it('should move task from inbox to somedayMaybe', () => {
        const task = { ...mockTask, status: TASK_STATUS.INBOX };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [task] },
          },
        });

        store.dispatch(optimisticStatusUpdate({ taskId: task.id, newStatus: TASK_STATUS.SOMEDAY_MAYBE }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.somedayMaybe).toHaveLength(1);
      });

      it('should move task from inbox to reference', () => {
        const task = { ...mockTask, status: TASK_STATUS.INBOX };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [task] },
          },
        });

        store.dispatch(optimisticStatusUpdate({ taskId: task.id, newStatus: TASK_STATUS.REFERENCE }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.reference).toHaveLength(1);
      });

      it('should handle non-existent task gracefully', () => {
        store.dispatch(optimisticStatusUpdate({ taskId: 'non-existent', newStatus: TASK_STATUS.NEXT_ACTION }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.nextActions).toHaveLength(0);
      });
    });
  });

  describe('selectors', () => {
    const testTask1 = { ...mockTask, id: '1', status: TASK_STATUS.INBOX };
    const testTask2 = { ...mockTask, id: '2', status: TASK_STATUS.INBOX };
    const nextActionTask = { ...mockTask, id: '3', status: TASK_STATUS.NEXT_ACTION };
    const waitingForTask = { ...mockTask, id: '4', status: TASK_STATUS.WAITING_FOR };
    const somedayTask = { ...mockTask, id: '5', status: TASK_STATUS.SOMEDAY_MAYBE };
    const referenceTask = { ...mockTask, id: '6', status: TASK_STATUS.REFERENCE };

    const testState = {
      tasks: {
        inbox: [testTask1, testTask2],
        clarified: [],
        nextActions: [nextActionTask],
        waitingFor: [waitingForTask],
        somedayMaybe: [somedayTask],
        reference: [referenceTask],
        currentTask: mockTask,
        loading: true,
        clarifying: true,
        error: 'Test error',
        nextCursor: 'cursor-123',
        total: 10,
      },
    };

    it('selectInboxTasks should return only inbox status tasks', () => {
      const result = selectInboxTasks(testState);
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.status === TASK_STATUS.INBOX)).toBe(true);
    });

    it('selectInboxTasks should filter out non-inbox tasks from inbox array', () => {
      const stateWithMixedTasks = {
        tasks: {
          ...testState.tasks,
          inbox: [testTask1, { ...mockTask, id: '99', status: TASK_STATUS.CLARIFIED }],
        },
      };
      const result = selectInboxTasks(stateWithMixedTasks);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('selectCurrentTask should return currentTask', () => {
      expect(selectCurrentTask(testState)).toEqual(mockTask);
    });

    it('selectTasksLoading should return loading', () => {
      expect(selectTasksLoading(testState)).toBe(true);
    });

    it('selectTasksClarifying should return clarifying', () => {
      expect(selectTasksClarifying(testState)).toBe(true);
    });

    it('selectTasksError should return error', () => {
      expect(selectTasksError(testState)).toBe('Test error');
    });

    it('selectInboxCount should return count of inbox tasks', () => {
      expect(selectInboxCount(testState)).toBe(2);
    });

    it('selectNextActions should return nextActions array', () => {
      expect(selectNextActions(testState)).toEqual([nextActionTask]);
    });

    it('selectWaitingFor should return waitingFor array', () => {
      expect(selectWaitingFor(testState)).toEqual([waitingForTask]);
    });

    it('selectSomedayMaybe should return somedayMaybe array', () => {
      expect(selectSomedayMaybe(testState)).toEqual([somedayTask]);
    });

    it('selectReference should return reference array', () => {
      expect(selectReference(testState)).toEqual([referenceTask]);
    });
  });

  describe('async thunks', () => {
    describe('fetchInboxTasks', () => {
      it('should handle successful fetch', async () => {
        const mockResponse = {
          data: {
            tasks: [mockTask],
            next_cursor: 'cursor-123',
            count: 1,
          },
        };

        tasksAPI.getByStatus.mockResolvedValueOnce(mockResponse);

        await store.dispatch(fetchInboxTasks());

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(1);
        expect(state.nextCursor).toBe('cursor-123');
        expect(state.total).toBe(1);
        expect(state.loading).toBe(false);
        expect(tasksAPI.getByStatus).toHaveBeenCalledWith(TASK_STATUS.INBOX);
      });

      it('should handle fetch failure', async () => {
        const mockError = {
          response: {
            data: { message: 'Network error' },
          },
        };

        tasksAPI.getByStatus.mockRejectedValueOnce(mockError);

        await store.dispatch(fetchInboxTasks());

        const state = store.getState().tasks;
        expect(state.error).toBe('Network error');
        expect(state.loading).toBe(false);
      });

      it('should handle fetch failure with default message', async () => {
        tasksAPI.getByStatus.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(fetchInboxTasks());

        const state = store.getState().tasks;
        expect(state.error).toBe('Failed to fetch inbox tasks');
      });

      it('should set loading state during fetch', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.getByStatus.mockReturnValueOnce(pendingPromise);

        const fetchPromise = store.dispatch(fetchInboxTasks());
        expect(store.getState().tasks.loading).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({ data: { tasks: [], next_cursor: null, count: 0 } });
        await fetchPromise;

        expect(store.getState().tasks.loading).toBe(false);
      });

      it('should use inbox.length when count is not provided', async () => {
        tasksAPI.getByStatus.mockResolvedValueOnce({
          data: { tasks: [mockTask, { ...mockTask, id: '2' }], next_cursor: null },
        });

        await store.dispatch(fetchInboxTasks());

        expect(store.getState().tasks.total).toBe(2);
      });
    });

    describe('fetchTaskById', () => {
      it('should handle successful fetch', async () => {
        tasksAPI.getById.mockResolvedValueOnce({ data: mockTask });

        await store.dispatch(fetchTaskById('task-123'));

        const state = store.getState().tasks;
        expect(state.currentTask).toEqual(mockTask);
        expect(state.loading).toBe(false);
        expect(tasksAPI.getById).toHaveBeenCalledWith('task-123');
      });

      it('should handle fetch failure', async () => {
        tasksAPI.getById.mockRejectedValueOnce({
          response: { data: { message: 'Task not found' } },
        });

        await store.dispatch(fetchTaskById('invalid-id'));

        const state = store.getState().tasks;
        expect(state.error).toBe('Task not found');
        expect(state.loading).toBe(false);
      });

      it('should handle fetch failure with default message', async () => {
        tasksAPI.getById.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(fetchTaskById('invalid-id'));

        expect(store.getState().tasks.error).toBe('Failed to fetch task');
      });

      it('should set loading state during fetch', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.getById.mockReturnValueOnce(pendingPromise);

        const fetchPromise = store.dispatch(fetchTaskById('task-123'));
        expect(store.getState().tasks.loading).toBe(true);

        resolvePromise({ data: mockTask });
        await fetchPromise;

        expect(store.getState().tasks.loading).toBe(false);
      });
    });

    describe('clarifyTask', () => {
      it('should handle successful clarification', async () => {
        const clarifiedTask = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.clarify.mockResolvedValueOnce({
          data: { message: 'Task clarified', task: clarifiedTask },
        });

        await store.dispatch(clarifyTask({ taskId: mockTask.id, clarificationData: { status: TASK_STATUS.NEXT_ACTION } }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.nextActions).toHaveLength(1);
        expect(state.clarifying).toBe(false);
      });

      it('should handle clarification response without task wrapper', async () => {
        const clarifiedTask = { ...mockTask, status: TASK_STATUS.WAITING_FOR };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.clarify.mockResolvedValueOnce({ data: clarifiedTask });

        await store.dispatch(clarifyTask({ taskId: mockTask.id, clarificationData: { status: TASK_STATUS.WAITING_FOR } }));

        const state = store.getState().tasks;
        expect(state.waitingFor).toHaveLength(1);
      });

      it('should update currentTask if clarified task matches', async () => {
        const clarifiedTask = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask], currentTask: mockTask },
          },
        });

        tasksAPI.clarify.mockResolvedValueOnce({
          data: { task: clarifiedTask },
        });

        await store.dispatch(clarifyTask({ taskId: mockTask.id, clarificationData: {} }));

        expect(store.getState().tasks.currentTask).toEqual(clarifiedTask);
      });

      it('should handle clarification failure', async () => {
        tasksAPI.clarify.mockRejectedValueOnce({
          response: { data: { message: 'Clarification failed' } },
        });

        await store.dispatch(clarifyTask({ taskId: 'task-123', clarificationData: {} }));

        const state = store.getState().tasks;
        expect(state.error).toBe('Clarification failed');
        expect(state.clarifying).toBe(false);
      });

      it('should handle clarification failure with default message', async () => {
        tasksAPI.clarify.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(clarifyTask({ taskId: 'task-123', clarificationData: {} }));

        expect(store.getState().tasks.error).toBe('Failed to clarify task');
      });

      it('should set clarifying state during clarification', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.clarify.mockReturnValueOnce(pendingPromise);

        const clarifyPromise = store.dispatch(clarifyTask({ taskId: 'task-123', clarificationData: {} }));
        expect(store.getState().tasks.clarifying).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({ data: { task: mockTask } });
        await clarifyPromise;

        expect(store.getState().tasks.clarifying).toBe(false);
      });

      it('should update existing task in list instead of duplicating', async () => {
        const existingTask = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        const updatedTask = { ...existingTask, title: 'Updated Title' };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, nextActions: [existingTask] },
          },
        });

        tasksAPI.clarify.mockResolvedValueOnce({ data: { task: updatedTask } });

        await store.dispatch(clarifyTask({ taskId: mockTask.id, clarificationData: {} }));

        const state = store.getState().tasks;
        expect(state.nextActions).toHaveLength(1);
        expect(state.nextActions[0].title).toBe('Updated Title');
      });
    });

    describe('updateTaskStatus', () => {
      it('should handle successful status update', async () => {
        const updatedTask = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.update.mockResolvedValueOnce({ data: updatedTask });

        await store.dispatch(updateTaskStatus({ taskId: mockTask.id, status: TASK_STATUS.NEXT_ACTION }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.nextActions).toHaveLength(1);
        expect(state.loading).toBe(false);
      });

      it('should handle status update with additional data', async () => {
        const updatedTask = { ...mockTask, status: TASK_STATUS.WAITING_FOR, delegateTo: 'John' };

        tasksAPI.update.mockResolvedValueOnce({ data: updatedTask });

        await store.dispatch(
          updateTaskStatus({
            taskId: mockTask.id,
            status: TASK_STATUS.WAITING_FOR,
            additionalData: { delegateTo: 'John' },
          })
        );

        expect(tasksAPI.update).toHaveBeenCalledWith(mockTask.id, {
          status: TASK_STATUS.WAITING_FOR,
          delegateTo: 'John',
        });
      });

      it('should handle status update failure', async () => {
        tasksAPI.update.mockRejectedValueOnce({
          response: { data: { message: 'Update failed' } },
        });

        await store.dispatch(updateTaskStatus({ taskId: 'task-123', status: TASK_STATUS.NEXT_ACTION }));

        const state = store.getState().tasks;
        expect(state.error).toBe('Update failed');
        expect(state.loading).toBe(false);
      });

      it('should handle status update failure with default message', async () => {
        tasksAPI.update.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(updateTaskStatus({ taskId: 'task-123', status: TASK_STATUS.NEXT_ACTION }));

        expect(store.getState().tasks.error).toBe('Failed to update task status');
      });

      it('should set loading state during update', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.update.mockReturnValueOnce(pendingPromise);

        const updatePromise = store.dispatch(updateTaskStatus({ taskId: 'task-123', status: TASK_STATUS.NEXT_ACTION }));
        expect(store.getState().tasks.loading).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({ data: mockTask });
        await updatePromise;

        expect(store.getState().tasks.loading).toBe(false);
      });
    });

    describe('completeTask', () => {
      it('should handle successful completion', async () => {
        const completedTask = { ...mockTask, status: TASK_STATUS.COMPLETED };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.complete.mockResolvedValueOnce({ data: { message: 'Completed', task: completedTask } });

        await store.dispatch(completeTask(mockTask.id));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.loading).toBe(false);
      });

      it('should handle completion response without task wrapper', async () => {
        const completedTask = { ...mockTask, status: TASK_STATUS.COMPLETED };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, nextActions: [mockTask] },
          },
        });

        tasksAPI.complete.mockResolvedValueOnce({ data: completedTask });

        await store.dispatch(completeTask(mockTask.id));

        expect(store.getState().tasks.nextActions).toHaveLength(0);
      });

      it('should handle completion failure', async () => {
        tasksAPI.complete.mockRejectedValueOnce({
          response: { data: { message: 'Completion failed' } },
        });

        await store.dispatch(completeTask('task-123'));

        const state = store.getState().tasks;
        expect(state.error).toBe('Completion failed');
        expect(state.loading).toBe(false);
      });

      it('should handle completion failure with default message', async () => {
        tasksAPI.complete.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(completeTask('task-123'));

        expect(store.getState().tasks.error).toBe('Failed to complete task');
      });

      it('should set loading state during completion', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.complete.mockReturnValueOnce(pendingPromise);

        const completePromise = store.dispatch(completeTask('task-123'));
        expect(store.getState().tasks.loading).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({ data: { task: mockTask } });
        await completePromise;

        expect(store.getState().tasks.loading).toBe(false);
      });
    });

    describe('deleteTask', () => {
      it('should handle successful deletion', async () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.delete.mockResolvedValueOnce({});

        await store.dispatch(deleteTask(mockTask.id));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.loading).toBe(false);
      });

      it('should clear currentTask if deleted task is current', async () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask], currentTask: mockTask },
          },
        });

        tasksAPI.delete.mockResolvedValueOnce({});

        await store.dispatch(deleteTask(mockTask.id));

        expect(store.getState().tasks.currentTask).toBeNull();
      });

      it('should remove task from all lists', async () => {
        const taskInMultiplePlaces = { ...mockTask, status: TASK_STATUS.NEXT_ACTION };
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: {
              ...initialState,
              inbox: [mockTask],
              nextActions: [taskInMultiplePlaces],
              waitingFor: [{ ...mockTask, id: '2', status: TASK_STATUS.WAITING_FOR }],
            },
          },
        });

        tasksAPI.delete.mockResolvedValueOnce({});

        await store.dispatch(deleteTask(mockTask.id));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.nextActions).toHaveLength(0);
        expect(state.waitingFor).toHaveLength(1);
      });

      it('should handle deletion failure', async () => {
        tasksAPI.delete.mockRejectedValueOnce({
          response: { data: { message: 'Deletion failed' } },
        });

        await store.dispatch(deleteTask('task-123'));

        const state = store.getState().tasks;
        expect(state.error).toBe('Deletion failed');
        expect(state.loading).toBe(false);
      });

      it('should handle deletion failure with default message', async () => {
        tasksAPI.delete.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(deleteTask('task-123'));

        expect(store.getState().tasks.error).toBe('Failed to delete task');
      });

      it('should set loading state during deletion', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.delete.mockReturnValueOnce(pendingPromise);

        const deletePromise = store.dispatch(deleteTask('task-123'));
        expect(store.getState().tasks.loading).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({});
        await deletePromise;

        expect(store.getState().tasks.loading).toBe(false);
      });
    });

    describe('convertToProject', () => {
      it('should handle successful conversion', async () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.convertToProject.mockResolvedValueOnce({
          data: { original_task_id: mockTask.id, project: { id: 'project-123' } },
        });

        await store.dispatch(convertToProject({ taskId: mockTask.id, projectData: { name: 'New Project' } }));

        const state = store.getState().tasks;
        expect(state.inbox).toHaveLength(0);
        expect(state.loading).toBe(false);
      });

      it('should handle conversion without original_task_id', async () => {
        store = configureStore({
          reducer: { tasks: tasksReducer },
          preloadedState: {
            tasks: { ...initialState, inbox: [mockTask] },
          },
        });

        tasksAPI.convertToProject.mockResolvedValueOnce({
          data: { project: { id: 'project-123' } },
        });

        await store.dispatch(convertToProject({ taskId: mockTask.id, projectData: {} }));

        // Task should remain since we can't identify which one to remove
        expect(store.getState().tasks.inbox).toHaveLength(1);
      });

      it('should handle conversion failure', async () => {
        tasksAPI.convertToProject.mockRejectedValueOnce({
          response: { data: { message: 'Conversion failed' } },
        });

        await store.dispatch(convertToProject({ taskId: 'task-123', projectData: {} }));

        const state = store.getState().tasks;
        expect(state.error).toBe('Conversion failed');
        expect(state.loading).toBe(false);
      });

      it('should handle conversion failure with default message', async () => {
        tasksAPI.convertToProject.mockRejectedValueOnce(new Error('Unknown'));

        await store.dispatch(convertToProject({ taskId: 'task-123', projectData: {} }));

        expect(store.getState().tasks.error).toBe('Failed to convert to project');
      });

      it('should set loading state during conversion', async () => {
        let resolvePromise;
        const pendingPromise = new Promise((resolve) => {
          resolvePromise = resolve;
        });

        tasksAPI.convertToProject.mockReturnValueOnce(pendingPromise);

        const convertPromise = store.dispatch(convertToProject({ taskId: 'task-123', projectData: {} }));
        expect(store.getState().tasks.loading).toBe(true);
        expect(store.getState().tasks.error).toBeNull();

        resolvePromise({ data: { original_task_id: 'task-123' } });
        await convertPromise;

        expect(store.getState().tasks.loading).toBe(false);
      });
    });
  });
});
