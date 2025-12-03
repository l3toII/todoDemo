import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createGtdStore } from '../../helpers/gtdTestHelpers';
import SomedayMaybePage from '../../../pages/SomedayMaybePage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    complete: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  contextsAPI: {
    getAll: vi.fn(),
  },
}));

import { tasksAPI, contextsAPI } from '../../../services/api';

describe('SomedayMaybePage', () => {
  const mockTask1 = {
    id: 'task-1',
    title: 'Learn French',
    notes: 'Maybe take classes',
    status: 'someday_maybe',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [],
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  };

  const mockTask2 = {
    id: 'task-2',
    title: 'Visit Japan',
    notes: 'Cherry blossom season',
    status: 'someday_maybe',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [{ id: 'ctx-1', name: '@Travel' }],
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2025-10-15T10:00:00Z',
  };

  const mockContexts = [
    { id: 'ctx-1', name: '@Travel', is_default: false, status: 'active' },
  ];

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <SomedayMaybePage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getByStatus.mockResolvedValue({
      data: { tasks: [], count: 0 },
    });
    tasksAPI.update.mockResolvedValue({
      data: { ...mockTask1, status: 'next_action' },
    });
    tasksAPI.delete.mockResolvedValue({});
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: mockContexts, count: mockContexts.length },
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while fetching', () => {
      const store = createGtdStore({ loading: true });
      renderPage(store);

      expect(screen.getByText(/loading someday/i)).toBeInTheDocument();
    });
  });

  describe('task list', () => {
    it('should render tasks with someday_maybe status', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2 },
      });
      const store = createGtdStore({ somedayMaybe: [mockTask1, mockTask2] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Learn French')).toBeInTheDocument();
        expect(screen.getByText('Visit Japan')).toBeInTheDocument();
      });
    });

    it('should show empty state when no tasks', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [], count: 0 },
      });
      const store = createGtdStore({ somedayMaybe: [] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no someday\/maybe items/i)).toBeInTheDocument();
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
      const store = createGtdStore({ somedayMaybe: [mockTask1, mockTask2] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('task actions', () => {
    it('should allow activating task (move to next_action)', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1 },
      });
      tasksAPI.update.mockResolvedValue({
        data: { ...mockTask1, status: 'next_action' },
      });
      const store = createGtdStore({ somedayMaybe: [mockTask1] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Learn French')).toBeInTheDocument();
      });

      // Find and click the "Activate" button
      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(tasksAPI.update).toHaveBeenCalledWith('task-1', { status: 'next_action' });
      });
    });

    it('should allow deleting deferred task', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1 },
      });
      const store = createGtdStore({ somedayMaybe: [mockTask1] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Learn French')).toBeInTheDocument();
      });

      // Find and click the delete button
      const deleteButton = screen.getByRole('button', { name: /delete "learn french"/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith('task-1');
      });
    });
  });

  describe('page header', () => {
    it('should display page title', () => {
      const store = createGtdStore();
      renderPage(store);

      expect(screen.getByRole('heading', { name: /someday\/maybe/i })).toBeInTheDocument();
    });

    it('should display GTD description', () => {
      const store = createGtdStore();
      renderPage(store);

      expect(screen.getByText(/ideas and tasks deferred for later/i)).toBeInTheDocument();
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
        expect(tasksAPI.getByStatus).toHaveBeenCalledWith('someday_maybe');
      });
    });
  });
});
