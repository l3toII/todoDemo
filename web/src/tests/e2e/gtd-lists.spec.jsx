/**
 * E2E Tests for GTD List Views (P4.4)
 *
 * Tests the GTD list view pages:
 * - Next Actions page
 * - Waiting For page
 * - Someday/Maybe page
 * - Reference page
 * - Navigation between lists
 * - Context filtering
 * - Task status transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import NextActionsPage from '../../pages/NextActionsPage';
import WaitingForPage from '../../pages/WaitingForPage';
import SomedayMaybePage from '../../pages/SomedayMaybePage';
import ReferencePage from '../../pages/ReferencePage';
import Navigation from '../../components/Navigation';
import tasksReducer from '../../features/tasks/tasksSlice';
import contextsReducer from '../../features/contexts/contextsSlice';
import authReducer from '../../features/auth/authSlice';
import accountReducer from '../../features/account/accountSlice';

// Mock tasks for different statuses
const mockNextActions = [
  {
    id: 'na-1',
    title: 'Call client about proposal',
    notes: 'Discuss pricing and timeline',
    status: 'next_action',
    energy_level: 'high',
    time_estimate: 30,
    due_date: '2025-12-10',
    contexts: [{ id: 'ctx-phone', name: '@Phone' }],
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: 'na-2',
    title: 'Buy groceries',
    notes: 'Milk, eggs, bread',
    status: 'next_action',
    energy_level: 'low',
    time_estimate: 45,
    due_date: null,
    contexts: [{ id: 'ctx-errands', name: '@Errands' }],
    created_at: '2025-12-02T10:00:00Z',
    updated_at: '2025-12-02T10:00:00Z',
  },
];

const mockWaitingFor = [
  {
    id: 'wf-1',
    title: 'Waiting for contract review',
    notes: 'Sent to legal team',
    status: 'waiting_for',
    energy_level: null,
    time_estimate: null,
    due_date: '2025-12-15',
    contexts: [{ id: 'ctx-work', name: '@Work' }],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockSomedayMaybe = [
  {
    id: 'sm-1',
    title: 'Learn to play guitar',
    notes: 'Maybe take lessons',
    status: 'someday_maybe',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [],
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
];

const mockReference = [
  {
    id: 'ref-1',
    title: 'Meeting notes from Q4 planning',
    notes: 'Key decisions: budget approved',
    status: 'reference',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [{ id: 'ctx-work', name: '@Work' }],
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2025-11-15T10:00:00Z',
  },
];

const mockContexts = [
  { id: 'ctx-phone', name: '@Phone', is_default: true, status: 'active' },
  { id: 'ctx-errands', name: '@Errands', is_default: true, status: 'active' },
  { id: 'ctx-work', name: '@Work', is_default: true, status: 'active' },
];

// Mock the API module
vi.mock('../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    complete: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  contextsAPI: {
    getAll: vi.fn(),
  },
  authAPI: {
    logout: vi.fn(),
  },
  accountAPI: {
    getProfile: vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } }),
  },
  default: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import { tasksAPI, contextsAPI } from '../../services/api';

// Create a test store with authenticated state
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      account: accountReducer,
      tasks: tasksReducer,
      contexts: contextsReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { email: 'test@example.com' },
        loading: false,
        error: null,
      },
      account: {
        profile: { email: 'test@example.com' },
        loading: false,
        error: null,
      },
      tasks: {
        inbox: [],
        clarified: [],
        nextActions: mockNextActions,
        waitingFor: mockWaitingFor,
        somedayMaybe: mockSomedayMaybe,
        reference: mockReference,
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 0,
      },
      contexts: {
        contexts: mockContexts,
        loading: false,
        error: null,
      },
      ...preloadedState,
    },
  });
};

const renderWithProviders = (ui, { store = createTestStore(), route = '/' } = {}) => {
  return {
    store,
    user: userEvent.setup(),
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
};

describe('GTD List Views E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getByStatus.mockImplementation((status) => {
      switch (status) {
        case 'next_action':
          return Promise.resolve({ data: { tasks: mockNextActions, count: mockNextActions.length } });
        case 'waiting_for':
          return Promise.resolve({ data: { tasks: mockWaitingFor, count: mockWaitingFor.length } });
        case 'someday_maybe':
          return Promise.resolve({ data: { tasks: mockSomedayMaybe, count: mockSomedayMaybe.length } });
        case 'reference':
          return Promise.resolve({ data: { tasks: mockReference, count: mockReference.length } });
        default:
          return Promise.resolve({ data: { tasks: [], count: 0 } });
      }
    });
    tasksAPI.complete.mockResolvedValue({
      data: { task: { ...mockNextActions[0], status: 'completed' }, message: 'Task completed' },
    });
    tasksAPI.update.mockResolvedValue({
      data: { ...mockWaitingFor[0], status: 'next_action' },
    });
    tasksAPI.delete.mockResolvedValue({});
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: mockContexts, count: mockContexts.length },
    });
  });

  describe('Next Actions Page', () => {
    it('displays next actions list with task details', async () => {
      renderWithProviders(<NextActionsPage />, { route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByText('Call client about proposal')).toBeInTheDocument();
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      // Check task count in sidebar (All Contexts count)
      expect(screen.getByTestId('all-contexts-count')).toHaveTextContent('2');

      // Check energy level badge
      expect(screen.getByText('high')).toBeInTheDocument();

      // Check time estimate
      expect(screen.getByText(/30.*min/i)).toBeInTheDocument();

      // Check context badge (appears in both sidebar and task - use getAllByText)
      expect(screen.getAllByText('@Phone').length).toBeGreaterThanOrEqual(1);
    });

    it('filters tasks by context', async () => {
      const { user } = renderWithProviders(<NextActionsPage />, { route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByText('Call client about proposal')).toBeInTheDocument();
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      // Click on @Phone context filter
      const phoneFilter = screen.getByRole('button', { name: '@Phone' });
      await user.click(phoneFilter);

      await waitFor(() => {
        // Should show only @Phone task
        expect(screen.getByText('Call client about proposal')).toBeInTheDocument();
        // @Errands task should be hidden
        expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
      });
    });

    it('completes a task from the list', async () => {
      const { user } = renderWithProviders(<NextActionsPage />, { route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByText('Call client about proposal')).toBeInTheDocument();
      });

      // Click complete button
      const completeButton = screen.getByRole('button', { name: /complete "call client about proposal"/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalledWith('na-1');
      });
    });
  });

  describe('Waiting For Page', () => {
    it('displays waiting for list with duration', async () => {
      renderWithProviders(<WaitingForPage />, { route: '/waiting-for' });

      await waitFor(() => {
        expect(screen.getByText('Waiting for contract review')).toBeInTheDocument();
      });

      // Check waiting duration (1 week = 7 days)
      expect(screen.getByText(/1 week/i)).toBeInTheDocument();

      // Check page title
      expect(screen.getByRole('heading', { name: /waiting for/i })).toBeInTheDocument();
    });

    it('moves task to next actions', async () => {
      const { user } = renderWithProviders(<WaitingForPage />, { route: '/waiting-for' });

      await waitFor(() => {
        expect(screen.getByText('Waiting for contract review')).toBeInTheDocument();
      });

      // Click "Move to Next Actions" button
      const moveButton = screen.getByRole('button', { name: /move to next actions/i });
      await user.click(moveButton);

      await waitFor(() => {
        expect(tasksAPI.update).toHaveBeenCalledWith('wf-1', { status: 'next_action' });
      });
    });
  });

  describe('Someday Maybe Page', () => {
    it('displays someday/maybe list', async () => {
      renderWithProviders(<SomedayMaybePage />, { route: '/someday-maybe' });

      await waitFor(() => {
        expect(screen.getByText('Learn to play guitar')).toBeInTheDocument();
      });

      // Check page title
      expect(screen.getByRole('heading', { name: /someday\/maybe/i })).toBeInTheDocument();
    });

    it('activates a task (moves to next actions)', async () => {
      const { user } = renderWithProviders(<SomedayMaybePage />, { route: '/someday-maybe' });

      await waitFor(() => {
        expect(screen.getByText('Learn to play guitar')).toBeInTheDocument();
      });

      // Click activate button
      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(tasksAPI.update).toHaveBeenCalledWith('sm-1', { status: 'next_action' });
      });
    });

    it('deletes a deferred task', async () => {
      const { user } = renderWithProviders(<SomedayMaybePage />, { route: '/someday-maybe' });

      await waitFor(() => {
        expect(screen.getByText('Learn to play guitar')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete "learn to play guitar"/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith('sm-1');
      });
    });
  });

  describe('Reference Page', () => {
    it('displays reference items', async () => {
      renderWithProviders(<ReferencePage />, { route: '/reference' });

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
      });

      // Check page title
      expect(screen.getByRole('heading', { name: /reference/i })).toBeInTheDocument();
    });

    it('searches reference items', async () => {
      // Mock multiple reference items for search test
      tasksAPI.getByStatus.mockImplementation((status) => {
        if (status === 'reference') {
          return Promise.resolve({
            data: {
              tasks: [
                mockReference[0],
                {
                  id: 'ref-2',
                  title: 'Passport number',
                  notes: 'AB123456',
                  status: 'reference',
                  contexts: [],
                  created_at: '2025-10-20T10:00:00Z',
                  updated_at: '2025-10-20T10:00:00Z',
                },
              ],
              count: 2,
            },
          });
        }
        return Promise.resolve({ data: { tasks: [], count: 0 } });
      });

      const store = createTestStore({
        tasks: {
          inbox: [],
          clarified: [],
          nextActions: [],
          waitingFor: [],
          somedayMaybe: [],
          reference: [
            mockReference[0],
            {
              id: 'ref-2',
              title: 'Passport number',
              notes: 'AB123456',
              status: 'reference',
              contexts: [],
              created_at: '2025-10-20T10:00:00Z',
              updated_at: '2025-10-20T10:00:00Z',
            },
          ],
          currentTask: null,
          loading: false,
          clarifying: false,
          error: null,
          nextCursor: null,
          total: 0,
        },
        contexts: {
          contexts: mockContexts,
          loading: false,
          error: null,
        },
      });

      const { user } = renderWithProviders(<ReferencePage />, { store, route: '/reference' });

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
        expect(screen.getByText('Passport number')).toBeInTheDocument();
      });

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search reference/i);
      await user.type(searchInput, 'passport');

      await waitFor(() => {
        expect(screen.getByText('Passport number')).toBeInTheDocument();
        expect(screen.queryByText('Meeting notes from Q4 planning')).not.toBeInTheDocument();
      });
    });

    it('deletes a reference item', async () => {
      const { user } = renderWithProviders(<ReferencePage />, { route: '/reference' });

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete "meeting notes from q4 planning"/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith('ref-1');
      });
    });
  });

  describe('Navigation Between GTD Lists', () => {
    const AppWithRoutes = () => (
      <>
        <Navigation />
        <Routes>
          <Route path="/next-actions" element={<NextActionsPage />} />
          <Route path="/waiting-for" element={<WaitingForPage />} />
          <Route path="/someday-maybe" element={<SomedayMaybePage />} />
          <Route path="/reference" element={<ReferencePage />} />
        </Routes>
      </>
    );

    it('navigates from Next Actions to Waiting For', async () => {
      const { user } = renderWithProviders(<AppWithRoutes />, { route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByText('Call client about proposal')).toBeInTheDocument();
      });

      // Click Waiting For link in navigation
      const waitingForLink = screen.getByRole('link', { name: /waiting for/i });
      await user.click(waitingForLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /waiting for/i })).toBeInTheDocument();
      });
    });

    it('navigates from Waiting For to Someday/Maybe', async () => {
      const { user } = renderWithProviders(<AppWithRoutes />, { route: '/waiting-for' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /waiting for/i })).toBeInTheDocument();
      });

      // Click Someday link in navigation
      const somedayLink = screen.getByRole('link', { name: /someday/i });
      await user.click(somedayLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /someday\/maybe/i })).toBeInTheDocument();
      });
    });

    it('navigates from Someday/Maybe to Reference', async () => {
      const { user } = renderWithProviders(<AppWithRoutes />, { route: '/someday-maybe' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /someday\/maybe/i })).toBeInTheDocument();
      });

      // Click Reference link in navigation
      const referenceLink = screen.getByRole('link', { name: /reference/i });
      await user.click(referenceLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reference/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for Next Actions when no tasks', async () => {
      tasksAPI.getByStatus.mockResolvedValue({ data: { tasks: [], count: 0 } });

      const emptyStore = createTestStore({
        tasks: {
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
        },
      });

      renderWithProviders(<NextActionsPage />, { store: emptyStore, route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByText(/no next actions/i)).toBeInTheDocument();
      });
    });

    it('shows empty state for Waiting For when no tasks', async () => {
      tasksAPI.getByStatus.mockResolvedValue({ data: { tasks: [], count: 0 } });

      const emptyStore = createTestStore({
        tasks: {
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
        },
      });

      renderWithProviders(<WaitingForPage />, { store: emptyStore, route: '/waiting-for' });

      await waitFor(() => {
        expect(screen.getByText(/no waiting for items/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails on Next Actions', async () => {
      tasksAPI.getByStatus.mockRejectedValue({
        response: { data: { message: 'Failed to fetch tasks' } },
      });

      renderWithProviders(<NextActionsPage />, { route: '/next-actions' });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });
  });
});
