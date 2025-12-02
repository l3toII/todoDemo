import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/authSlice';
import inboxReducer from '../../features/inbox/inboxSlice';
import InboxPage from '../../pages/InboxPage';
import App from '../../App';

// Mock the API module
vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  },
  accountAPI: {
    getProfile: vi.fn(),
    updatePreferences: vi.fn(),
  },
  tasksAPI: {
    getInbox: vi.fn(),
    getInboxCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
  },
}));

import { authAPI, tasksAPI, accountAPI } from '../../services/api';

// Helper function to render with providers
const renderWithProviders = (component, { preloadedState = {} } = {}) => {
  const defaultState = {
    auth: {
      user: null,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionTimeout: null,
    },
    inbox: {
      tasks: [],
      count: 0,
      hasOverflow: false,
      isLoading: false,
      error: null,
      pendingTasks: {},
    },
  };

  const store = configureStore({
    reducer: {
      auth: authReducer,
      inbox: inboxReducer,
    },
    preloadedState: {
      ...defaultState,
      ...preloadedState,
    },
  });

  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>{component}</BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('Inbox E2E Tests', () => {
  const mockTask1 = {
    id: 'task-1',
    title: 'Buy groceries',
    notes: 'Milk, eggs, bread',
    status: 'inbox',
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTask2 = {
    id: 'task-2',
    title: 'Call dentist',
    notes: null,
    status: 'inbox',
    position: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  };

  const mockTask3 = {
    id: 'task-3',
    title: 'Review project proposal',
    notes: 'Check budget section',
    status: 'inbox',
    position: 3,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('refreshToken', 'test-refresh');

    // Default mock implementations
    tasksAPI.getInbox.mockResolvedValue({
      data: { tasks: [], count: 0, has_overflow: false },
    });
    tasksAPI.getInboxCount.mockResolvedValue({
      data: { count: 0, has_overflow: false },
    });
    tasksAPI.create.mockImplementation(async (data) => ({
      data: {
        task: {
          id: `task-${Date.now()}`,
          title: data.title,
          notes: data.notes || null,
          status: 'inbox',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    }));
    tasksAPI.delete.mockResolvedValue({});
    tasksAPI.complete.mockImplementation(async (id) => ({
      data: {
        task: { id, status: 'completed' },
      },
    }));
  });

  describe('Inbox Page Display', () => {
    it('should display inbox page with title and description', async () => {
      renderWithProviders(<InboxPage />);

      expect(screen.getByRole('heading', { name: /inbox/i })).toBeInTheDocument();
      expect(screen.getByText(/capture everything, process later/i)).toBeInTheDocument();
    });

    it('should display empty state when no tasks exist', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/your mind is clear/i)).toBeInTheDocument();
    });

    it('should display task list when tasks exist', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });
      expect(screen.getByText('Call dentist')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('should display task notes when present', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Milk, eggs, bread')).toBeInTheDocument();
      });
    });

    it('should display overflow warning when more than 100 tasks', async () => {
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1], count: 101, has_overflow: true },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/inbox overflow/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/over 100 items/i)).toBeInTheDocument();
    });
  });

  describe('Quick Capture Flow', () => {
    it('should capture a task with title only (2 interactions)', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);

      // Interaction 1: Type task title
      await user.type(input, 'New important task');

      // Interaction 2: Press Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith({
          title: 'New important task',
          notes: undefined,
        });
      });
    });

    it('should show optimistic update immediately', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      tasksAPI.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Optimistic task{Enter}');

      // Should appear immediately (optimistic update)
      await waitFor(() => {
        expect(screen.getByText('Optimistic task')).toBeInTheDocument();
      });

      // Resolve the API call
      resolveCreate({
        data: {
          task: {
            id: 'real-id',
            title: 'Optimistic task',
            notes: null,
            status: 'inbox',
            position: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      });
    });

    it('should clear input after successful capture', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Task to capture{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should capture task via button click', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Button captured task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith({
          title: 'Button captured task',
          notes: undefined,
        });
      });
    });

    it('should not capture empty task', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, '   '); // Only whitespace
      await user.keyboard('{Enter}');

      expect(tasksAPI.create).not.toHaveBeenCalled();
    });

    it('should allow continuous capture (multiple tasks)', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);

      // Capture first task
      await user.type(input, 'First task{Enter}');
      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledTimes(1);
      });

      // Capture second task
      await user.type(input, 'Second task{Enter}');
      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledTimes(2);
      });

      // Capture third task
      await user.type(input, 'Third task{Enter}');
      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Task Completion Flow', () => {
    it('should complete a task when clicking the complete button', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /mark "buy groceries" as complete/i }));

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalledWith(mockTask1.id);
      });
    });

    it('should remove completed task from inbox', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /mark "buy groceries" as complete/i }));

      await waitFor(() => {
        expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
      });
      // Other task should still be there
      expect(screen.getByText('Call dentist')).toBeInTheDocument();
    });
  });

  describe('Task Deletion Flow', () => {
    it('should delete a task when clicking the delete button', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete "buy groceries"/i }));

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith(mockTask1.id);
      });
    });

    it('should remove deleted task from inbox', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1, mockTask2], count: 2, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete "buy groceries"/i }));

      await waitFor(() => {
        expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
      });
      // Other task should still be there
      expect(screen.getByText('Call dentist')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      tasksAPI.getInbox.mockRejectedValue({
        response: { data: { error: 'Network error' } },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should display error message when task creation fails', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      tasksAPI.create.mockRejectedValue({
        response: { data: { error: 'Failed to create task' } },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      // Error appears in both QuickCaptureInput and InboxPage
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/failed to create task/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should allow dismissing error message', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockRejectedValue({
        response: { data: { error: 'Some error' } },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const alert = screen.getByRole('alert');
      const closeButton = within(alert).getByRole('button');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open quick capture modal on Ctrl+N', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [mockTask1], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });
    });

    it('should close quick capture modal on backdrop click', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      // Open modal
      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = document.querySelector('.bg-gray-500.bg-opacity-75');
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /quick capture/i })).not.toBeInTheDocument();
      });
    });

    it('should capture task from modal and close it', async () => {
      const user = userEvent.setup();
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      // Open modal
      await user.keyboard('{Control>}n{/Control}');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /quick capture/i })).toBeInTheDocument();
      });

      // Find the input in the modal and type
      const modalInputs = screen.getAllByPlaceholderText(/what's on your mind/i);
      const modalInput = modalInputs[1]; // Second one is in the modal
      await user.type(modalInput, 'Task from modal{Enter}');

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith({
          title: 'Task from modal',
          notes: undefined,
        });
      });

      // Modal should close after capture
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /quick capture/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Relative Time Display', () => {
    it('should display "just now" for recently created tasks', async () => {
      const recentTask = {
        ...mockTask1,
        created_at: new Date().toISOString(),
      };
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [recentTask], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('just now')).toBeInTheDocument();
      });
    });

    it('should display hours ago for older tasks', async () => {
      const hourOldTask = {
        ...mockTask1,
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      };
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [hourOldTask], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('2h ago')).toBeInTheDocument();
      });
    });

    it('should display days ago for tasks older than 24 hours', async () => {
      const dayOldTask = {
        ...mockTask1,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
      };
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [dayOldTask], count: 1, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('3d ago')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during initial fetch', async () => {
      let resolveInbox;
      tasksAPI.getInbox.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInbox = resolve;
          })
      );
      renderWithProviders(<InboxPage />);

      expect(screen.getByText(/loading inbox/i)).toBeInTheDocument();

      // Resolve the promise
      resolveInbox({
        data: { tasks: [], count: 0, has_overflow: false },
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading inbox/i)).not.toBeInTheDocument();
      });
    });

    it('should show spinner on quick capture button during submission', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      tasksAPI.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });
      renderWithProviders(<InboxPage />);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Test task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      // Should show spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Resolve the promise
      resolveCreate({
        data: {
          task: {
            id: 'new-id',
            title: 'Test task',
            notes: null,
            status: 'inbox',
            position: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      });
    });
  });

  describe('Full User Flow', () => {
    it('should support complete inbox workflow: capture, view, complete, delete', async () => {
      const user = userEvent.setup();

      // Start with empty inbox
      tasksAPI.getInbox.mockResolvedValue({
        data: { tasks: [], count: 0, has_overflow: false },
      });

      const { store } = renderWithProviders(<InboxPage />);

      // 1. Verify empty state
      await waitFor(() => {
        expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
      });

      // 2. Capture first task
      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Task 1{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      // 3. Capture second task
      await user.type(input, 'Task 2{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Task 2')).toBeInTheDocument();
      });

      // 4. Update mock for complete action
      tasksAPI.complete.mockResolvedValue({
        data: { task: { id: 'task-1', status: 'completed' } },
      });

      // 5. Verify both tasks are visible
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();

      // 6. Complete first task - find and click the correct button
      const task1CompleteButton = screen.getByRole('button', { name: /mark "task 1" as complete/i });
      await user.click(task1CompleteButton);

      await waitFor(() => {
        expect(tasksAPI.complete).toHaveBeenCalled();
      });

      // 7. Delete second task
      const task2DeleteButton = screen.getByRole('button', { name: /delete "task 2"/i });
      await user.click(task2DeleteButton);

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalled();
      });
    });
  });
});
