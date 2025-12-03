import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from '../../features/tasks/tasksSlice';
import contextsReducer from '../../features/contexts/contextsSlice';

/**
 * Default tasks state for GTD page tests
 */
export const defaultTasksState = {
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

/**
 * Default contexts state for GTD page tests
 */
export const defaultContextsState = {
  contexts: [],
  loading: false,
  error: null,
};

/**
 * Creates a Redux store for testing GTD pages
 * @param {Object} tasksState - Override tasks state
 * @param {Object} contextsState - Override contexts state
 * @returns {Object} Configured Redux store
 */
export const createGtdStore = (tasksState = {}, contextsState = {}) => {
  return configureStore({
    reducer: {
      tasks: tasksReducer,
      contexts: contextsReducer,
    },
    preloadedState: {
      tasks: { ...defaultTasksState, ...tasksState },
      contexts: { ...defaultContextsState, ...contextsState },
    },
  });
};

/**
 * Creates a mock task for testing
 * @param {Object} overrides - Override default task properties
 * @returns {Object} Mock task object
 */
export const createMockTask = (overrides = {}) => ({
  id: `task-${Date.now()}`,
  title: 'Test Task',
  notes: '',
  status: 'next_action',
  energy_level: null,
  time_estimate: null,
  due_date: null,
  contexts: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock context for testing
 * @param {Object} overrides - Override default context properties
 * @returns {Object} Mock context object
 */
export const createMockContext = (overrides = {}) => ({
  id: `ctx-${Date.now()}`,
  name: '@Test',
  is_default: false,
  status: 'active',
  ...overrides,
});

/**
 * Standard mock contexts used across tests
 */
export const standardMockContexts = [
  { id: 'ctx-1', name: '@Errands', is_default: true, status: 'active' },
  { id: 'ctx-2', name: '@Phone', is_default: true, status: 'active' },
  { id: 'ctx-3', name: '@Office', is_default: true, status: 'active' },
];
