import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import inboxReducer from '../../../features/inbox/inboxSlice';
import InboxPage from '../../../pages/InboxPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getInbox: vi.fn(),
    getInboxCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
  },
}));

import { tasksAPI } from '../../../services/api';

describe('InboxPage', () => {
  const mockTask = {
    id: 'task-uuid-123',
    title: 'Test Task',
    notes: 'Some notes',
    status: 'inbox',
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTask2 = {
    id: 'task-uuid-456',
    title: 'Another Task',
    notes: null,
    status: 'inbox',
    position: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  };

  const createStore = (inboxState = {}) => {
    return configureStore({
      reducer: {
        inbox: inboxReducer,
      },
      preloadedState: {
        inbox: {
          tasks: [],
          count: 0,
          hasOverflow: false,
          isLoading: false,
          error: null,
          pendingTasks: {},
          ...inboxState,
        },
      },
    });
  };

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <InboxPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getInbox.mockResolvedValue({
      data: { tasks: [], count: 0, has_overflow: false },
    });
    tasksAPI.delete.mockResolvedValue({});
    tasksAPI.complete.mockResolvedValue({ data: { task: { ...mockTask, status: 'completed' } } });
  });

  describe('rendering', () => {
    it('renders page title and description', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('heading', { name: /inbox/i })).toBeInTheDocument();
      expect(screen.getByText(/capture everything, process later/i)).toBeInTheDocument();
    });

    it('renders item count badge', async () => {
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('renders plural items count', async () => {
      const store = createStore({ tasks: [mockTask, mockTask2], count: 2 });
      renderPage(store);

      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('renders QuickCaptureInput component', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading with no tasks', async () => {
      const store = createStore({ isLoading: true, tasks: [] });
      renderPage(store);

      expect(screen.getByText(/loading inbox/i)).toBeInTheDocument();
    });

    it('does not show loading spinner when tasks exist', async () => {
      const store = createStore({ isLoading: true, tasks: [mockTask] });
      renderPage(store);

      expect(screen.queryByText(/loading inbox/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no tasks', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      const store = createStore({ tasks: [], isLoading: false });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/your mind is clear/i)).toBeInTheDocument();
    });

    it('does not show empty state when tasks exist', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask], count: 1, has_overflow: false },
      });
      const store = createStore({ tasks: [mockTask], isLoading: false });
      renderPage(store);

      await waitFor(() => {
        expect(screen.queryByText(/inbox zero/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('task list', () => {
    it('renders task titles', async () => {
      const store = createStore({ tasks: [mockTask, mockTask2], count: 2 });
      renderPage(store);

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Another Task')).toBeInTheDocument();
    });

    it('renders task notes when present', async () => {
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('Some notes')).toBeInTheDocument();
    });

    it('does not render notes section when notes are null', async () => {
      const store = createStore({ tasks: [mockTask2], count: 1 });
      renderPage(store);

      // Task 2 has no notes, should only show title
      expect(screen.getByText('Another Task')).toBeInTheDocument();
      expect(screen.queryByText('Some notes')).not.toBeInTheDocument();
    });

    it('renders complete button for each task', async () => {
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      expect(screen.getByRole('button', { name: /mark "test task" as complete/i })).toBeInTheDocument();
    });

    it('renders delete button for each task', async () => {
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      expect(screen.getByRole('button', { name: /delete "test task"/i })).toBeInTheDocument();
    });

    it('applies opacity to optimistic tasks', async () => {
      const optimisticTask = { ...mockTask, isOptimistic: true };
      const store = createStore({ tasks: [optimisticTask], count: 1 });
      renderPage(store);

      const taskElement = screen.getByText('Test Task').closest('div[class*="p-4"]');
      expect(taskElement).toHaveClass('opacity-70');
    });

    it('disables buttons for optimistic tasks', async () => {
      const optimisticTask = { ...mockTask, isOptimistic: true };
      const store = createStore({ tasks: [optimisticTask], count: 1 });
      renderPage(store);

      expect(screen.getByRole('button', { name: /mark "test task" as complete/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete "test task"/i })).toBeDisabled();
    });
  });

  describe('overflow warning', () => {
    it('shows overflow warning when hasOverflow is true', async () => {
      const store = createStore({ hasOverflow: true, count: 101 });
      renderPage(store);

      expect(screen.getByText(/inbox overflow/i)).toBeInTheDocument();
      expect(screen.getByText(/over 100 items/i)).toBeInTheDocument();
    });

    it('does not show overflow warning when hasOverflow is false', async () => {
      const store = createStore({ hasOverflow: false, count: 50 });
      renderPage(store);

      expect(screen.queryByText(/inbox overflow/i)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error message when error exists', async () => {
      tasksAPI.getInbox.mockRejectedValue({
        response: { data: { error: 'Failed to fetch tasks' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();
    });

    it('allows dismissing error message', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockRejectedValue({
        response: { data: { error: 'Some error' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const alert = screen.getByRole('alert');
      const closeButton = within(alert).getByRole('button');
      await user.click(closeButton);

      await waitFor(() => {
        expect(store.getState().inbox.error).toBeNull();
      });
    });
  });

  describe('task actions', () => {
    it('calls deleteTask when delete button clicked', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask], count: 1, has_overflow: false },
      });
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete "test task"/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete "test task"/i }));

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith(mockTask.id);
      });
    });

    it('calls completeTask when complete button clicked', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask], count: 1, has_overflow: false },
      });
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark "test task" as complete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /mark "test task" as complete/i }));

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalledWith(mockTask.id);
      });
    });

    it('removes task from list after successful delete', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask], count: 1, has_overflow: false },
      });
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete "test task"/i }));

      await waitFor(() => {
        expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
      });
    });

    it('removes task from list after successful complete', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask], count: 1, has_overflow: false },
      });
      const store = createStore({ tasks: [mockTask], count: 1 });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /mark "test task" as complete/i }));

      await waitFor(() => {
        expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('fetches inbox on mount', async () => {
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(tasksAPI.getInbox).toHaveBeenCalled();
      });
    });
  });

  describe('relative time formatting', () => {
    it('displays "just now" for recent tasks', async () => {
      const recentTask = {
        ...mockTask,
        created_at: new Date().toISOString(),
      };
      const store = createStore({ tasks: [recentTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('displays minutes ago for tasks created minutes ago', async () => {
      const minutesAgoTask = {
        ...mockTask,
        created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      };
      const store = createStore({ tasks: [minutesAgoTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('displays hours ago for tasks created hours ago', async () => {
      const hoursAgoTask = {
        ...mockTask,
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
      };
      const store = createStore({ tasks: [hoursAgoTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('displays days ago for tasks created days ago', async () => {
      const daysAgoTask = {
        ...mockTask,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      };
      const store = createStore({ tasks: [daysAgoTask], count: 1 });
      renderPage(store);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });

  describe('quick capture modal', () => {
    it('opens modal on Ctrl+N', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });
    });

    it('closes modal on backdrop click', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      // Open modal
      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });

      // Click backdrop (the overlay div)
      const backdrop = document.querySelector('.bg-gray-500.bg-opacity-75');
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /quick capture/i })).not.toBeInTheDocument();
      });
    });

    it('closes modal on close button click', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      // Open modal
      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });

      // Find and click close button in modal
      const modal = screen.getByRole('heading', { name: /quick capture/i }).closest('div[class*="relative"]');
      const closeButton = within(modal).getAllByRole('button')[0];
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /quick capture/i })).not.toBeInTheDocument();
      });
    });
  });
});
