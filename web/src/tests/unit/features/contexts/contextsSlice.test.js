import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import contextsReducer, {
  fetchContexts,
  createContext,
  updateContext,
  deleteContext,
  clearError,
  selectAllContexts,
  selectDefaultContexts,
  selectCustomContexts,
  selectContextsLoading,
  selectContextsError,
  CONTEXT_STATUS,
} from '../../../../features/contexts/contextsSlice';
import { contextsAPI } from '../../../../services/api';

// Mock the API
vi.mock('../../../../services/api', () => ({
  contextsAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('contextsSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { contexts: contextsReducer },
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().contexts;
      expect(state.contexts).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchContexts', () => {
    const mockContexts = [
      {
        id: '1',
        name: '@Office',
        is_default: true,
        status: 'active',
        icon: 'building',
        color: '#4A90D9',
        position: 0,
      },
      {
        id: '2',
        name: '@Home',
        is_default: true,
        status: 'active',
        icon: 'home',
        color: '#50C878',
        position: 1,
      },
      {
        id: '3',
        name: '@Custom',
        is_default: false,
        status: 'active',
        icon: null,
        color: '#FF6B6B',
        position: 2,
        user_id: 'user-1',
      },
    ];

    it('should set loading to true when pending', async () => {
      contextsAPI.getAll.mockImplementation(() => new Promise(() => {}));
      store.dispatch(fetchContexts());
      expect(store.getState().contexts.loading).toBe(true);
      expect(store.getState().contexts.error).toBeNull();
    });

    it('should update contexts when fulfilled', async () => {
      contextsAPI.getAll.mockResolvedValue({ data: { contexts: mockContexts, count: 3 } });
      await store.dispatch(fetchContexts());

      const state = store.getState().contexts;
      expect(state.loading).toBe(false);
      expect(state.contexts).toEqual(mockContexts);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to fetch contexts';
      contextsAPI.getAll.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      await store.dispatch(fetchContexts());

      const state = store.getState().contexts;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle network error gracefully', async () => {
      contextsAPI.getAll.mockRejectedValue(new Error('Network error'));

      await store.dispatch(fetchContexts());

      const state = store.getState().contexts;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch contexts');
    });
  });

  describe('createContext', () => {
    const newContext = {
      name: '@Meeting',
      icon: 'calendar',
      color: '#9B59B6',
    };

    const createdContext = {
      id: 'new-id',
      name: '@Meeting',
      is_default: false,
      status: 'active',
      icon: 'calendar',
      color: '#9B59B6',
      position: 3,
      user_id: 'user-1',
    };

    it('should set loading to true when pending', async () => {
      contextsAPI.create.mockImplementation(() => new Promise(() => {}));
      store.dispatch(createContext(newContext));
      expect(store.getState().contexts.loading).toBe(true);
    });

    it('should add new context when fulfilled', async () => {
      contextsAPI.create.mockResolvedValue({
        data: { context: createdContext, message: 'Context created successfully' },
      });

      await store.dispatch(createContext(newContext));

      const state = store.getState().contexts;
      expect(state.loading).toBe(false);
      expect(state.contexts).toContainEqual(createdContext);
      expect(state.error).toBeNull();
    });

    it('should set error when creation fails', async () => {
      contextsAPI.create.mockRejectedValue({
        response: { data: { error: 'A context with this name already exists', code: 'DUPLICATE_NAME' } },
      });

      await store.dispatch(createContext(newContext));

      const state = store.getState().contexts;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('A context with this name already exists');
    });
  });

  describe('updateContext', () => {
    const existingContexts = [
      { id: '1', name: '@Office', is_default: true, status: 'active' },
      { id: '2', name: '@Custom', is_default: false, status: 'active', color: '#FF0000' },
    ];

    const updatedContext = {
      id: '2',
      name: '@Updated',
      is_default: false,
      status: 'active',
      color: '#00FF00',
    };

    beforeEach(async () => {
      contextsAPI.getAll.mockResolvedValue({ data: { contexts: existingContexts } });
      await store.dispatch(fetchContexts());
    });

    it('should update context in state when fulfilled', async () => {
      contextsAPI.update.mockResolvedValue({
        data: { context: updatedContext, message: 'Context updated successfully' },
      });

      await store.dispatch(updateContext({ id: '2', data: { name: '@Updated', color: '#00FF00' } }));

      const state = store.getState().contexts;
      const updated = state.contexts.find((c) => c.id === '2');
      expect(updated.name).toBe('@Updated');
      expect(updated.color).toBe('#00FF00');
    });

    it('should set error when update fails', async () => {
      contextsAPI.update.mockRejectedValue({
        response: { data: { error: 'Cannot modify default contexts', code: 'CANNOT_MODIFY_DEFAULT' } },
      });

      await store.dispatch(updateContext({ id: '1', data: { name: '@NewName' } }));

      const state = store.getState().contexts;
      expect(state.error).toBe('Cannot modify default contexts');
    });
  });

  describe('deleteContext', () => {
    const existingContexts = [
      { id: '1', name: '@Office', is_default: true, status: 'active' },
      { id: '2', name: '@Custom', is_default: false, status: 'active' },
    ];

    beforeEach(async () => {
      contextsAPI.getAll.mockResolvedValue({ data: { contexts: existingContexts } });
      await store.dispatch(fetchContexts());
    });

    it('should remove context from state when fulfilled', async () => {
      contextsAPI.delete.mockResolvedValue({ data: { message: 'Context archived successfully' } });

      await store.dispatch(deleteContext('2'));

      const state = store.getState().contexts;
      expect(state.contexts).not.toContainEqual(expect.objectContaining({ id: '2' }));
      expect(state.contexts).toHaveLength(1);
    });

    it('should set error when delete fails', async () => {
      contextsAPI.delete.mockRejectedValue({
        response: { data: { error: 'Cannot delete default contexts', code: 'CANNOT_DELETE_DEFAULT' } },
      });

      await store.dispatch(deleteContext('1'));

      const state = store.getState().contexts;
      expect(state.error).toBe('Cannot delete default contexts');
      // Context should still exist
      expect(state.contexts).toHaveLength(2);
    });
  });

  describe('clearError reducer', () => {
    it('should clear the error state', async () => {
      contextsAPI.getAll.mockRejectedValue({
        response: { data: { error: 'Some error' } },
      });
      await store.dispatch(fetchContexts());
      expect(store.getState().contexts.error).toBe('Some error');

      store.dispatch(clearError());
      expect(store.getState().contexts.error).toBeNull();
    });
  });

  describe('selectors', () => {
    const mockState = {
      contexts: {
        contexts: [
          { id: '1', name: '@Office', is_default: true, status: 'active' },
          { id: '2', name: '@Home', is_default: true, status: 'active' },
          { id: '3', name: '@Custom1', is_default: false, status: 'active' },
          { id: '4', name: '@Custom2', is_default: false, status: 'archived' },
        ],
        loading: false,
        error: null,
      },
    };

    it('selectAllContexts returns all active contexts', () => {
      const result = selectAllContexts(mockState);
      expect(result).toHaveLength(3);
      expect(result.every((c) => c.status === 'active')).toBe(true);
    });

    it('selectDefaultContexts returns only default active contexts', () => {
      const result = selectDefaultContexts(mockState);
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.is_default === true)).toBe(true);
    });

    it('selectCustomContexts returns only custom active contexts', () => {
      const result = selectCustomContexts(mockState);
      expect(result).toHaveLength(1);
      expect(result.every((c) => c.is_default === false && c.status === 'active')).toBe(true);
    });

    it('selectContextsLoading returns loading state', () => {
      expect(selectContextsLoading({ contexts: { loading: true } })).toBe(true);
      expect(selectContextsLoading({ contexts: { loading: false } })).toBe(false);
    });

    it('selectContextsError returns error state', () => {
      expect(selectContextsError({ contexts: { error: 'Error!' } })).toBe('Error!');
      expect(selectContextsError({ contexts: { error: null } })).toBeNull();
    });
  });

  describe('CONTEXT_STATUS constants', () => {
    it('should export correct status constants', () => {
      expect(CONTEXT_STATUS.ACTIVE).toBe('active');
      expect(CONTEXT_STATUS.ARCHIVED).toBe('archived');
    });
  });
});
