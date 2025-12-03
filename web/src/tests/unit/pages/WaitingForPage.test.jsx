import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createGtdStore } from '../../helpers/gtdTestHelpers';
import WaitingForPage from '../../../pages/WaitingForPage';

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

describe('WaitingForPage', () => {
  const mockTask1 = {
    id: 'task-1',
    title: 'Waiting for client feedback',
    notes: 'Sent proposal last week',
    status: 'waiting_for',
    energy_level: 'low',
    time_estimate: null,
    due_date: null,
    contexts: [{ id: 'ctx-1', name: '@Waiting' }],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockTask2 = {
    id: 'task-2',
    title: 'Waiting for parts delivery',
    notes: 'Order #12345',
    status: 'waiting_for',
    energy_level: null,
    time_estimate: null,
    due_date: '2025-12-20',
    contexts: [{ id: 'ctx-2', name: '@Home' }],
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockContexts = [
    { id: 'ctx-1', name: '@Waiting', is_default: false, status: 'active' },
    { id: 'ctx-2', name: '@Home', is_default: true, status: 'active' },
  ];

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <WaitingForPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getByStatus.mockResolvedValue({ data: { tasks: [], count: 0 } });
    tasksAPI.complete.mockResolvedValue({
      data: { task: { ...mockTask1, status: 'completed' }, message: 'Task completed' },
    });
    tasksAPI.update.mockResolvedValue({ data: { ...mockTask1, status: 'next_action' } });
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: mockContexts, count: mockContexts.length },
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while fetching', () => {
      const store = createGtdStore({ loading: true });
      renderPage(store);
      expect(screen.getByText(/loading waiting for/i)).toBeInTheDocument();
    });
  });

  describe('task list', () => {
    it('should render tasks with waiting_for status', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2 },
      });
      const store = createGtdStore({ waitingFor: [mockTask1, mockTask2] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Waiting for client feedback')).toBeInTheDocument();
        expect(screen.getByText('Waiting for parts delivery')).toBeInTheDocument();
      });
    });

    it('should show empty state when no tasks', async () => {
      const store = createGtdStore({ waitingFor: [] });
      renderPage(store);
      await waitFor(() => {
        expect(screen.getByText(/no waiting for items/i)).toBeInTheDocument();
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
      const store = createGtdStore({ waitingFor: [mockTask1, mockTask2] });
      renderPage(store);
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show "waiting since" duration', async () => {
      const store = createGtdStore({ waitingFor: [mockTask1] });
      renderPage(store);
      await waitFor(() => {
        expect(screen.getByText(/5 days/i)).toBeInTheDocument();
      });
    });
  });

  describe('task actions', () => {
    it('should allow moving task to next_action', async () => {
      tasksAPI.getByStatus.mockResolvedValue({ data: { tasks: [mockTask1], count: 1 } });
      const store = createGtdStore({ waitingFor: [mockTask1] });
      renderPage(store);

      const user = userEvent.setup();
      await waitFor(() => {
        expect(screen.getByText('Waiting for client feedback')).toBeInTheDocument();
      });

      const moveButton = screen.getByRole('button', { name: /move to next actions/i });
      await user.click(moveButton);

      await waitFor(() => {
        expect(tasksAPI.update).toHaveBeenCalledWith('task-1', { status: 'next_action' });
      });
    });

    it('should allow completing a task', async () => {
      tasksAPI.getByStatus.mockResolvedValue({ data: { tasks: [mockTask1], count: 1 } });
      const store = createGtdStore({ waitingFor: [mockTask1] });
      renderPage(store);

      const user = userEvent.setup();
      await waitFor(() => {
        expect(screen.getByText('Waiting for client feedback')).toBeInTheDocument();
      });

      const completeButton = screen.getByRole('button', { name: /complete "waiting for client feedback"/i });
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
      expect(screen.getByRole('heading', { name: /waiting for/i })).toBeInTheDocument();
    });

    it('should display GTD description', () => {
      const store = createGtdStore();
      renderPage(store);
      expect(screen.getByText(/tasks delegated or waiting on others/i)).toBeInTheDocument();
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
        expect(tasksAPI.getByStatus).toHaveBeenCalledWith('waiting_for');
      });
    });
  });
});
