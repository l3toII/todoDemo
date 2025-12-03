import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createGtdStore, standardMockContexts } from '../../helpers/gtdTestHelpers';
import NextActionsPage from '../../../pages/NextActionsPage';

vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    complete: vi.fn(),
    update: vi.fn(),
  },
  contextsAPI: {
    getAll: vi.fn(),
  },
}));

import { tasksAPI, contextsAPI } from '../../../services/api';

describe('NextActionsPage', () => {
  const mockTask1 = {
    id: 'task-1',
    title: 'Buy groceries',
    notes: 'Milk, eggs, bread',
    status: 'next_action',
    energy_level: 'low',
    time_estimate: 30,
    due_date: null,
    contexts: [{ id: 'ctx-1', name: '@Errands' }],
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  };

  const mockTask2 = {
    id: 'task-2',
    title: 'Call dentist',
    notes: 'Schedule checkup',
    status: 'next_action',
    energy_level: 'low',
    time_estimate: 5,
    due_date: '2025-12-10',
    contexts: [{ id: 'ctx-2', name: '@Phone' }],
    created_at: '2025-12-02T10:00:00Z',
    updated_at: '2025-12-02T10:00:00Z',
  };

  const mockTask3 = {
    id: 'task-3',
    title: 'Write report',
    notes: 'Q4 summary',
    status: 'next_action',
    energy_level: 'high',
    time_estimate: 120,
    due_date: null,
    contexts: [{ id: 'ctx-3', name: '@Office' }],
    created_at: '2025-12-03T10:00:00Z',
    updated_at: '2025-12-03T10:00:00Z',
  };

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <NextActionsPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getByStatus.mockResolvedValue({
      data: { tasks: [], count: 0 },
    });
    tasksAPI.complete.mockResolvedValue({
      data: { task: { ...mockTask1, status: 'completed' }, message: 'Task completed' },
    });
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: standardMockContexts, count: standardMockContexts.length },
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while fetching', () => {
      const store = createGtdStore({ loading: true });
      renderPage(store);
      expect(screen.getByText(/loading next actions/i)).toBeInTheDocument();
    });
  });

  describe('task list', () => {
    it('should render tasks with next_action status', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2, mockTask3], count: 3 },
      });
      const store = createGtdStore({ nextActions: [mockTask1, mockTask2, mockTask3] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
        expect(screen.getByText('Call dentist')).toBeInTheDocument();
        expect(screen.getByText('Write report')).toBeInTheDocument();
      });
    });

    it('should show empty state when no tasks', async () => {
      const store = createGtdStore({ nextActions: [] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no next actions/i)).toBeInTheDocument();
      });
    });

    it('should show error message on fetch failure', async () => {
      tasksAPI.getByStatus.mockRejectedValue({
        response: { data: { message: 'Failed to fetch tasks' } },
      });
      const store = createGtdStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should display task count in header', async () => {
      const store = createGtdStore({ nextActions: [mockTask1, mockTask2] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display energy level badge', async () => {
      const store = createGtdStore({ nextActions: [mockTask1] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/low/i)).toBeInTheDocument();
      });
    });

    it('should display time estimate', async () => {
      const store = createGtdStore({ nextActions: [mockTask1] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/30.*min/i)).toBeInTheDocument();
      });
    });
  });

  describe('context filtering', () => {
    it('should render ContextFilterSidebar', async () => {
      const store = createGtdStore(
        { nextActions: [mockTask1, mockTask2, mockTask3] },
        { contexts: standardMockContexts }
      );
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('@Errands')).toBeInTheDocument();
        expect(screen.getByText('@Phone')).toBeInTheDocument();
        expect(screen.getByText('@Office')).toBeInTheDocument();
      });
    });

    it('should filter tasks by selected context', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2, mockTask3], count: 3 },
      });
      const store = createGtdStore(
        { nextActions: [mockTask1, mockTask2, mockTask3] },
        { contexts: standardMockContexts }
      );
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
        expect(screen.getByText('Write report')).toBeInTheDocument();
      });

      const officeFilter = screen.getByRole('button', { name: '@Office' });
      await user.click(officeFilter);

      await waitFor(() => {
        expect(screen.getByText('Write report')).toBeInTheDocument();
        expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
        expect(screen.queryByText('Call dentist')).not.toBeInTheDocument();
      });
    });

    it('should show "All" option that displays all tasks', async () => {
      const store = createGtdStore(
        { nextActions: [mockTask1, mockTask2, mockTask3] },
        { contexts: standardMockContexts }
      );
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      });
    });
  });

  describe('task actions', () => {
    it('should allow completing a task', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1 },
      });
      const store = createGtdStore({ nextActions: [mockTask1] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete "buy groceries"/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalledWith('task-1');
      });
    });

    it('should remove completed task from list', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2 },
      });
      tasksAPI.complete.mockResolvedValue({
        data: { task: { ...mockTask1, status: 'completed' }, message: 'Task completed' },
      });

      const store = createGtdStore({ nextActions: [mockTask1, mockTask2] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete "buy groceries"/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalledWith('task-1');
      });
    });
  });

  describe('page header', () => {
    it('should display page title', () => {
      const store = createGtdStore();
      renderPage(store);
      expect(screen.getByRole('heading', { name: /next actions/i })).toBeInTheDocument();
    });

    it('should display GTD description', () => {
      const store = createGtdStore();
      renderPage(store);
      expect(screen.getByText(/tasks you can do right now/i)).toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('should have refresh button', () => {
      const store = createGtdStore();
      renderPage(store);
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should fetch tasks when refresh clicked', async () => {
      const store = createGtdStore();
      renderPage(store);

      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(tasksAPI.getByStatus).toHaveBeenCalledWith('next_action');
      });
    });
  });
});
